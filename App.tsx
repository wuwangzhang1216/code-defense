
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlantType, ZombieType, GameState, Plant, Zombie, Projectile, Particle } from './types';
import { GRID_ROWS, GRID_COLS, INITIAL_RESOURCES, PLANT_STATS, ZOMBIE_STATS, TICK_RATE, PROJECTILE_SPEED, RESOURCE_GENERATION_AMOUNT, getLevelConfig } from './constants';
import { playSound } from './services/audioService';

// Helper to generate unique IDs
const uid = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>({
    resources: INITIAL_RESOURCES,
    plants: [],
    zombies: [],
    projectiles: [],
    particles: [],
    wave: 1,
    time: 0,
    gameOver: false,
    gameWon: false,
    score: 0,
    world: 1,
    level: 1,
    zombiesSpawned: 0,
    totalZombiesInLevel: 10,
  });

  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const lastTickRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const [gameRunning, setGameRunning] = useState(false);

  // --- Game Logic Helpers ---

  const spawnZombie = (state: GameState, dt: number): { zombie: Zombie | null, spawnedCount: number } => {
    const config = getLevelConfig(state.world, state.level);
    
    // Stop spawning if we reached level limit
    if (state.zombiesSpawned >= state.totalZombiesInLevel) {
        return { zombie: null, spawnedCount: 0 };
    }

    // Spawn Logic
    // Base rate + wave pressure. 
    // We want zombies to appear somewhat regularly.
    // For 1-1 (10 zombies), maybe 1 every 5 seconds?
    // dt is in ms.
    const timeFactor = state.time / 1000; // seconds
    
    // Increasing chance as time goes on within the level
    let baseChance = 0.002 * (1 + (state.world * 0.5)); // Base difficulty scales with world
    
    // Intense waves at 50% and 90% progress?
    // Simple random for now, ensuring we spawn all required zombies eventually.
    
    // If few zombies left to spawn, increase chance to finish level
    const remaining = state.totalZombiesInLevel - state.zombiesSpawned;
    if (remaining < 5) baseChance *= 2;

    if (Math.random() < baseChance) {
      const row = Math.floor(Math.random() * GRID_ROWS);
      
      // Select Type from Level Config
      const allowedTypes = config.types;
      let type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

      // Weight rare zombies lower
      if (type === ZombieType.MONOLITH && Math.random() > 0.1) type = allowedTypes[0];
      
      const stats = ZOMBIE_STATS[type];
      
      return {
        zombie: {
          id: uid(),
          row,
          x: 100, 
          type,
          hp: stats.hp,
          maxHp: stats.hp,
          speed: stats.speed,
          damage: stats.damage,
          isFrozen: false,
          isStopped: false,
        },
        spawnedCount: 1
      };
    }
    return { zombie: null, spawnedCount: 0 };
  };

  // --- Main Game Loop ---
  const updateGame = useCallback((timestamp: number) => {
    if (!lastTickRef.current) lastTickRef.current = timestamp;
    const deltaTime = timestamp - lastTickRef.current;

    if (deltaTime >= TICK_RATE) {
      setGameState(prevState => {
        if (prevState.gameOver || prevState.gameWon) return prevState;

        const dtSeconds = deltaTime / 1000;
        let { plants, zombies, projectiles, resources, particles, score, time, zombiesSpawned, totalZombiesInLevel, world, level } = prevState;
        let newParticles: Particle[] = [...particles];
        let nextZombiesSpawned = zombiesSpawned;
        let scoreToAdd = 0;

        const levelConfig = getLevelConfig(world, level);

        // 0. Falling Sun (RAM) Logic
        // If isDay, every ~8 seconds, 50% chance to drop sun?
        // Simplified: Auto-add resources periodically for Day/Pool/Roof
        if (levelConfig.hasFallingSun) {
            // Approx every 10 seconds
            if (Math.floor(time / 10000) > Math.floor((time - deltaTime) / 10000)) {
                resources += RESOURCE_GENERATION_AMOUNT;
                playSound('collect');
                // Visual only
                const r = Math.floor(Math.random() * GRID_ROWS);
                const c = Math.floor(Math.random() * GRID_COLS);
                newParticles.push({ id: uid(), row: r, x: (c / GRID_COLS) * 100, symbol: '+RAM', life: 1.5, vy: -5, color: '#fcd34d' });
            }
        }

        // 1. Update Plants (Shooting & Production)
        const updatedPlants = plants.map(plant => {
            let newPlant = { ...plant };
            const stats = PLANT_STATS[plant.type];

            // Arming Logic (Potato Mine)
            if (plant.type === PlantType.ASSERT) {
                // No periodic action, just waiting to be armed
            }
            // Producer Logic
            else if (plant.type === PlantType.PRODUCER) {
              if (timestamp - plant.lastActionTime > stats.cooldown) {
                 resources += RESOURCE_GENERATION_AMOUNT;
                 newPlant.lastActionTime = timestamp;
                 playSound('collect');
                 newParticles.push({ id: uid(), row: plant.row, x: (plant.col / GRID_COLS) * 100, symbol: '+RAM', life: 1.0, vy: -10 });
              }
            } 
            // Shooter Logic
            else if (stats.damage) {
               // Check for range
               const rangeLimit = stats.range ? ((plant.col + stats.range) / GRID_COLS) * 100 : 100;

               const zombieInLane = zombies.some(z => 
                 z.row === plant.row && 
                 z.x > (plant.col / GRID_COLS) * 100 &&
                 z.x <= rangeLimit
               );
               
               if (zombieInLane && timestamp - plant.lastActionTime > stats.cooldown) {
                 const shots = stats.shots || 1;
                 for(let i=0; i<shots; i++) {
                     let isStopShot = false;
                     // Kernel-pult butter chance (approx 25%)
                     if (plant.type === PlantType.KERNEL && Math.random() < 0.25) {
                         isStopShot = true;
                     }

                     projectiles.push({
                       id: uid(),
                       row: plant.row,
                       x: ((plant.col + 0.5) / GRID_COLS) * 100 - (i * 2),
                       damage: stats.damage || 20,
                       speed: PROJECTILE_SPEED,
                       isIce: plant.type === PlantType.ICE || plant.type === PlantType.FROZEN_SET,
                       isSplash: stats.isSplash || false,
                       isPiercing: stats.isPiercing || false,
                       isFire: false,
                       stopChance: isStopShot ? 1.0 : 0,
                     });
                 }
                 newPlant.lastActionTime = timestamp;
                 playSound('shoot');
               }
            }
            // Bomb Logic (Cherry Bomb)
            else if (plant.type === PlantType.BOMB) {
                if (timestamp - plant.lastActionTime > 1000) { 
                    // Damage all zombies in 3x3 area
                    const colPercent = (plant.col / GRID_COLS) * 100;
                    zombies = zombies.map(z => {
                        const dist = Math.abs(z.x - colPercent);
                        const rowDiff = Math.abs(z.row - plant.row);
                        if (rowDiff <= 1 && dist < 15) {
                            return { ...z, hp: z.hp - 1800 };
                        }
                        return z;
                    });
                    playSound('explode');
                    newParticles.push({ id: uid(), row: plant.row, x: colPercent, symbol: 'rm -rf', life: 1.0, vy: 0, color: '#ef4444' });
                    return null; // Plant dies
                }
            }
            // Instant Lane Clear (Jalapeno)
            else if (plant.type === PlantType.EXIT) {
               if (timestamp - plant.lastActionTime > 800) { // Slight delay for animation
                  zombies = zombies.map(z => {
                    if (z.row === plant.row) return { ...z, hp: -9999 };
                    return z;
                  });
                  playSound('explode');
                  // Visual for lane clear
                  for (let c=0; c<GRID_COLS; c++) {
                    newParticles.push({ id: uid(), row: plant.row, x: (c/GRID_COLS)*100, symbol: '🔥', life: 1.0, vy: -2, color: '#ef4444' });
                  }
                  return null;
               }
            }

            return newPlant;
        }).filter(Boolean) as Plant[];

        // 2. Update Projectiles
        let nextProjectiles: Projectile[] = [];
        projectiles.forEach(proj => {
           proj.x += proj.speed * dtSeconds;
           
           // Check for Torchwood Interaction
           // Map proj x to col. If plant at row/col is Torchwood, upgrade.
           if (!proj.isFire && !proj.isIce && !proj.isSplash) {
              const currentCol = Math.floor((proj.x / 100) * GRID_COLS);
              const torch = updatedPlants.find(p => p.row === proj.row && p.col === currentCol && p.type === PlantType.DECORATOR);
              if (torch) {
                 proj.isFire = true;
                 proj.damage *= 2; // Double damage
              }
           }

           // Collision Detection
           let hit = false;
           // Check collision with all zombies in row
           for (let i = 0; i < zombies.length; i++) {
             const z = zombies[i];
             if (z.row === proj.row && Math.abs(z.x - proj.x) < 2.5 && z.hp > 0) {
               hit = true;
               
               // Apply damage logic
               if (proj.isSplash) {
                   // Splash Logic
                   z.hp -= proj.damage;
                   zombies.forEach(otherZ => {
                       if (otherZ.id !== z.id && Math.abs(otherZ.row - z.row) <= 1 && Math.abs(otherZ.x - z.x) < 12) {
                           otherZ.hp -= 26; // Fixed splash damage
                           if (proj.isIce) { // Winter Melon splash slow
                              otherZ.isFrozen = true;
                              otherZ.lastFrozenTime = timestamp;
                           }
                           newParticles.push({ id: uid(), row: otherZ.row, x: otherZ.x, symbol: '❄️', life: 0.3, vy: -5, color: '#10b981' });
                       }
                   });
               } else {
                   // Single Target
                   z.hp -= proj.damage;
               }

               if (proj.isIce) {
                   if (!proj.isFire) { // Fire removes ice usually, but here we just assume ice projectile applies ice
                       z.isFrozen = true;
                       z.lastFrozenTime = timestamp;
                   }
               }
               
               if (proj.stopChance && proj.stopChance > 0) {
                  z.isStopped = true;
                  z.lastStoppedTime = timestamp;
                  newParticles.push({ id: uid(), row: z.row, x: z.x, symbol: '🧈', life: 1.0, vy: 5, color: '#facc15' });
               }

               playSound('hit');
               newParticles.push({ id: uid(), row: z.row, x: z.x, symbol: '{}', life: 0.3, vy: -10 });
               
               // If not piercing, destroy projectile. If piercing, keep going.
               if (!proj.isPiercing) {
                   break; // Stop checking zombies for this projectile, it's dead
               }
             }
           }

           // Keep projectile if it didn't hit OR if it's piercing (and still on screen)
           if ((!hit || proj.isPiercing) && proj.x < 105) {
             nextProjectiles.push(proj);
           }
        });

        // 3. Update Zombies
        let gameOver = false;
        const nextZombies: Zombie[] = [];
        const spawnedByDancers: Zombie[] = [];
        
        zombies.forEach(z => {
           if (z.hp <= 0) {
             scoreToAdd += ZOMBIE_STATS[z.type].scoreValue;
             return; 
           }

           // Logic: Recursion Zombie (Dancing)
           if (z.type === ZombieType.RECURSION) {
               if (!z.lastSummonTime || timestamp - z.lastSummonTime > 8000) {
                   z.lastSummonTime = timestamp;
                   // Summon 4 StackOverflows (Backup Dancers)
                   const offsets = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -5, dy: 0}, {dx: 5, dy: 0}];
                   offsets.forEach(off => {
                       const r = z.row + off.dy;
                       if (r >= 0 && r < GRID_ROWS) {
                           spawnedByDancers.push({
                               id: uid(),
                               row: r,
                               x: z.x + off.dx,
                               type: ZombieType.STACK_OVERFLOW,
                               hp: ZOMBIE_STATS[ZombieType.STACK_OVERFLOW].hp,
                               maxHp: ZOMBIE_STATS[ZombieType.STACK_OVERFLOW].hp,
                               speed: ZOMBIE_STATS[ZombieType.STACK_OVERFLOW].speed,
                               damage: 100,
                               isFrozen: false,
                               isStopped: false
                           });
                           newParticles.push({ id: uid(), row: r, x: z.x + off.dx, symbol: 'NEW', life: 0.5, vy: -5 });
                       }
                   });
               }
           }

           // Status Effects
           if (z.isFrozen && z.lastFrozenTime && (timestamp - z.lastFrozenTime > 3000)) {
               z.isFrozen = false;
           }
           if (z.isStopped && z.lastStoppedTime && (timestamp - z.lastStoppedTime > 3000)) {
               z.isStopped = false;
           }

           // Calculate Speed
           let currentSpeed = z.speed;
           
           // Deprecated (Newspaper) Rage Logic
           if (z.type === ZombieType.DEPRECATED && z.hp < 270) { // Shield broke
               if (!z.isEnraged) {
                   z.isEnraged = true;
                   newParticles.push({ id: uid(), row: z.row, x: z.x, symbol: '!!!', life: 1.0, vy: -10, color: '#ff0000' });
               }
               currentSpeed *= 2.5;
           }

           if (z.isFrozen) currentSpeed *= 0.5;
           if (z.isStopped) currentSpeed = 0;

           const moveDist = currentSpeed * dtSeconds;

           // Check for plant collision
           // Plants in the same cell or very close
           const plantInFront = updatedPlants.find(p => p.row === z.row && Math.abs(((p.col/GRID_COLS)*100) - z.x) < 5); 

           let isEating = false;

           if (plantInFront) {
             // Potato Mine Logic
             if (plantInFront.type === PlantType.ASSERT) {
                 const armTime = PLANT_STATS[PlantType.ASSERT].armingTime || 15000;
                 if (timestamp - plantInFront.createTime > armTime) {
                     // BOOM
                     z.hp -= 1800;
                     plantInFront.hp = 0; // Mine triggers and dies
                     playSound('explode');
                     newParticles.push({ id: uid(), row: z.row, x: z.x, symbol: 'ASSERT ERROR', life: 1.0, vy: -10, color: '#ef4444' });
                 } else {
                     // Eat it while it's arming
                     isEating = true;
                 }
             }
             // GOTO (Pole Vault) Logic
             else if (z.type === ZombieType.GOTO && !z.hasJumped) {
                 // Jump!
                 z.x -= 12; // Jump over
                 z.hasJumped = true;
                 playSound('place'); // Jump sound placeholder
                 newParticles.push({ id: uid(), row: z.row, x: z.x, symbol: 'JUMP', life: 0.5, vy: 10 });
             } 
             // Standard Eat
             else {
                 isEating = true;
             }

             if (isEating) {
                 // Monolith crushes instantly
                 const dmg = z.type === ZombieType.MONOLITH ? 5000 : z.damage;
                 plantInFront.hp -= dmg * dtSeconds;
                 if (Math.random() < 0.1) {
                    newParticles.push({ id: uid(), row: z.row, x: z.x - 2, symbol: 'ERR', life: 0.5, vy: -5, color: '#ef4444' });
                 }
             }

           } else {
             z.x -= moveDist;
           }

           if (z.x < 0) {
             gameOver = true;
             playSound('gameover');
           }
           
           nextZombies.push(z);
        });

        // Remove dead plants
        const livingPlants = updatedPlants.filter(p => p.hp > 0);

        // 4. Spawning
        const { zombie: newZombie, spawnedCount } = spawnZombie(prevState, deltaTime);
        if (newZombie) {
            nextZombies.push(newZombie);
            nextZombiesSpawned += spawnedCount;
        }
        
        // 5. Particles
        newParticles = newParticles.map(p => ({...p, life: p.life - (dtSeconds * 2), x: p.x, row: p.row - (p.vy * dtSeconds * 0.01)})).filter(p => p.life > 0);

        // 6. Level Status
        let gameWon = prevState.gameWon;
        if (nextZombiesSpawned >= totalZombiesInLevel && nextZombies.length === 0 && spawnedByDancers.length === 0) {
            gameWon = true;
        }

        return {
          ...prevState,
          time: timestamp,
          plants: livingPlants,
          zombies: [...nextZombies, ...spawnedByDancers],
          projectiles: nextProjectiles,
          resources: resources,
          particles: newParticles,
          gameOver,
          gameWon,
          zombiesSpawned: nextZombiesSpawned,
          score: score + scoreToAdd
        };
      });
      
      lastTickRef.current = timestamp;
    }
    requestRef.current = requestAnimationFrame(updateGame);
  }, []);

  useEffect(() => {
    if (gameRunning) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameRunning, updateGame]);

  // --- User Interactions ---

  const handleGridClick = (row: number, col: number) => {
    if (gameState.gameOver || gameState.gameWon) return;
    if (!selectedPlant) return;

    const occupied = gameState.plants.find(p => p.row === row && p.col === col);
    if (occupied) return; 

    const plantStats = PLANT_STATS[selectedPlant];
    if (gameState.resources >= plantStats.cost) {
      const newPlant: Plant = {
        id: uid(),
        type: selectedPlant,
        row,
        col,
        x: 0,
        hp: plantStats.hp,
        maxHp: plantStats.hp,
        lastActionTime: performance.now(),
        createTime: performance.now(),
      };
      
      // Shooters ready immediately (except pults or special cooldowns)
      if (plantStats.damage && plantStats.type !== PlantType.KERNEL && plantStats.type !== PlantType.HEAVY) {
          newPlant.lastActionTime = 0; 
      }

      setGameState(prev => ({
        ...prev,
        plants: [...prev.plants, newPlant],
        resources: prev.resources - plantStats.cost
      }));
      setSelectedPlant(null);
      playSound('place');
    }
  };

  const startLevel = (world: number, level: number) => {
    const config = getLevelConfig(world, level);
    setGameState({
        resources: INITIAL_RESOURCES,
        plants: [],
        zombies: [],
        projectiles: [],
        particles: [],
        wave: 1,
        time: 0,
        gameOver: false,
        gameWon: false,
        score: gameState.score, // Keep score
        world: world,
        level: level,
        zombiesSpawned: 0,
        totalZombiesInLevel: config.totalZombies,
    });
    setGameRunning(true);
  };

  const nextLevel = () => {
      let nextLvl = gameState.level + 1;
      let nextWorld = gameState.world;
      if (nextLvl > 10) {
          nextLvl = 1;
          nextWorld++;
      }
      if (nextWorld > 5) {
          // Game Finished? Loop to 1-1 for now or just stay at 5-10
          nextWorld = 1;
          nextLvl = 1;
      }
      startLevel(nextWorld, nextLvl);
  };

  const restartLevel = () => {
      startLevel(gameState.world, gameState.level);
  };

  // Helpers for Theme
  const getThemeColors = () => {
      if (gameState.world === 2) return { bg: 'bg-[#0f0f1a]', border: 'border-[#334155]', text: 'text-gray-300' }; // Night
      if (gameState.world === 3) return { bg: 'bg-[#1e293b]', border: 'border-[#334155]', text: 'text-gray-200' }; // Pool
      if (gameState.world === 4) return { bg: 'bg-[#3f3f46]', border: 'border-[#52525b]', text: 'text-gray-200' }; // Fog
      if (gameState.world === 5) return { bg: 'bg-[#271a1a]', border: 'border-[#451a03]', text: 'text-amber-100' }; // Roof
      return { bg: 'bg-[#1e1e1e]', border: 'border-[#333]', text: 'text-gray-200' }; // Day
  };
  const theme = getThemeColors();
  
  // Progress Bar calculation
  const progress = Math.min(100, (gameState.zombiesSpawned / gameState.totalZombiesInLevel) * 100);

  return (
    <div className={`w-full h-screen ${theme.bg} ${theme.text} flex flex-col overflow-hidden select-none transition-colors duration-1000`}>
      {/* Header / HUD */}
      <header className={`h-24 border-b ${theme.border} flex items-center justify-between px-6 bg-opacity-90 z-20 relative shadow-md`}>
        <div className="flex flex-col justify-center mr-4 min-w-[120px]">
           <div className="text-lg font-bold text-[#4ec9b0] flex items-center">
             <span className="mr-2 text-xl">🐍</span>
             Level {gameState.world}-{gameState.level}
           </div>
           <div className="flex items-center space-x-4 mt-1">
             <div className="bg-[#333] px-2 py-1 rounded border border-[#444] flex items-center min-w-[100px]">
                <span className="text-yellow-400 font-bold text-xs mr-2">RAM</span>
                <span className="font-mono text-lg">{Math.floor(gameState.resources)}</span>
             </div>
             <div className="w-32 h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-500 relative">
                 <div className="h-full bg-[#4ec9b0] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                 <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">PROGRESS</span>
             </div>
           </div>
        </div>
        
        {/* Plant Toolbar */}
        <div className="flex-1 flex space-x-2 overflow-x-auto pb-2 pt-2 scrollbar-hide items-center px-2">
          {Object.values(PLANT_STATS).map((stats) => (
            <button
              key={stats.type}
              onClick={() => setSelectedPlant(stats.type)}
              disabled={gameState.resources < stats.cost}
              className={`
                flex-shrink-0 relative flex flex-col items-center justify-center w-14 h-16 rounded border transition-all
                ${selectedPlant === stats.type ? 'border-yellow-400 bg-[#37373d] scale-110 ring-2 ring-yellow-400/50' : 'border-[#444] bg-[#2d2d2d] hover:bg-[#37373d]'}
                ${gameState.resources < stats.cost ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={`${stats.name} ($${stats.cost})\n${stats.description}`}
            >
               <span className={`text-xs font-bold ${stats.color} mb-1`}>{stats.symbol}</span>
               <span className="text-[9px] text-gray-400 leading-none text-center px-1 h-6 overflow-hidden">{stats.name}</span>
               <span className="absolute bottom-0.5 right-1 text-[9px] text-yellow-500 font-bold">${stats.cost}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Game Area */}
      <main className={`flex-1 relative overflow-hidden flex items-center justify-center ${theme.bg}`}>
        
        {/* Start/GameOver/Win Screen */}
        {(!gameRunning || gameState.gameOver || gameState.gameWon) && (
          <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center backdrop-blur-sm">
             <h1 className={`text-6xl font-bold mb-4 tracking-tight ${gameState.gameOver ? 'text-red-500' : 'text-[#4ec9b0]'}`}>
               {gameState.gameOver ? "RUNTIME EXCEPTION" : gameState.gameWon ? "TESTS PASSED" : "CODE DEFENSE"}
             </h1>
             <p className="text-xl text-gray-400 mb-8 font-mono max-w-lg text-center">
               {gameState.gameOver ? `Processes Killed. Final Score: ${gameState.score}` : 
                gameState.gameWon ? `Level ${gameState.world}-${gameState.level} Complete!` :
                "Protect the Main Thread from Legacy Code and Bugs."}
             </p>
             
             {!gameRunning && !gameState.gameOver && !gameState.gameWon && (
                <div className="flex flex-col items-center space-y-4">
                     <button 
                       onClick={() => startLevel(1, 1)}
                       className="px-10 py-4 bg-[#007acc] hover:bg-[#0062a3] text-white rounded font-bold text-xl transition-all shadow-lg hover:scale-105"
                     >
                       Start Adventure
                     </button>
                     <div className="text-sm text-gray-500">50 Levels • 5 Worlds</div>
                </div>
             )}

             {gameState.gameOver && (
                 <button 
                   onClick={restartLevel}
                   className="px-10 py-4 bg-[#e11414] hover:bg-[#c11010] text-white rounded font-bold text-xl transition-all shadow-lg hover:scale-105"
                 >
                   Retry Level
                 </button>
             )}

             {gameState.gameWon && (
                 <button 
                   onClick={nextLevel}
                   className="px-10 py-4 bg-[#10b981] hover:bg-[#059669] text-white rounded font-bold text-xl transition-all shadow-lg hover:scale-105"
                 >
                   Next Level
                 </button>
             )}
          </div>
        )}

        {/* Grid Container */}
        <div className={`relative w-[95%] max-w-[1000px] aspect-[9/5] ${theme.bg} border border-[#333] shadow-2xl mx-auto mt-4`}>
           {/* Background Grid */}
           <div className="absolute inset-0 grid grid-rows-5 grid-cols-9 pointer-events-none">
              {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => {
                  const r = Math.floor(i / GRID_COLS);
                  const c = i % GRID_COLS;
                  const isDark = (r + c) % 2 === 0;
                  
                  // Theme specific colors for grid
                  let cellColor = isDark ? 'bg-[#252526]' : 'bg-[#1e1e1e]';
                  if (gameState.world === 2) cellColor = isDark ? 'bg-[#14141f]' : 'bg-[#0f0f1a]';
                  if (gameState.world === 3) cellColor = isDark ? 'bg-[#243c5a]' : 'bg-[#1e293b]'; // Pool-ish checkboard
                  
                  return (
                    <div key={i} className={`border-[0.5px] border-[#2a2a2a] ${cellColor} opacity-60`}></div>
                  );
              })}
           </div>
           
           {/* World Specific Overlays (Fog etc) - Simplistic visual for now */}
           {gameState.world === 4 && (
               <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#52525b] opacity-30 pointer-events-none z-10"></div>
           )}

            {/* Interactive Grid Layer */}
            <div className="absolute inset-0 grid grid-rows-5 grid-cols-9 z-10">
               {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => {
                   const r = Math.floor(i / GRID_COLS);
                   const c = i % GRID_COLS;
                   return (
                     <div 
                       key={i} 
                       className={`w-full h-full ${selectedPlant ? 'hover:bg-white/5 cursor-pointer' : ''}`}
                       onClick={() => handleGridClick(r, c)}
                     ></div>
                   );
               })}
            </div>

            {/* Entities Layer */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                {/* Plants */}
                {gameState.plants.map(plant => {
                   const stats = PLANT_STATS[plant.type];
                   // Potato Mine Logic for display
                   let isArmed = true;
                   if (plant.type === PlantType.ASSERT) {
                       const armTime = stats.armingTime || 15000;
                       isArmed = (gameState.time - plant.createTime) > armTime;
                   }

                   return (
                     <div
                       key={plant.id}
                       className="absolute w-[11.11%] h-[20%] flex items-center justify-center transition-all duration-300"
                       style={{
                         top: `${(plant.row / GRID_ROWS) * 100}%`,
                         left: `${(plant.col / GRID_COLS) * 100}%`
                       }}
                     >
                        <div className={`w-[80%] h-[80%] rounded-lg bg-[#2d2d2d] border-2 border-[#444] flex flex-col items-center justify-center shadow-lg animate-bounce-slight z-10 relative`}>
                            <span className={`font-bold ${stats.type === PlantType.GATLING ? 'text-sm' : 'text-md'} ${stats.color} truncate px-1`}>
                                {stats.symbol}
                            </span>
                            
                            {/* Potato Mine Warning */}
                            {plant.type === PlantType.ASSERT && !isArmed && (
                                <span className="absolute -top-2 right-0 text-[8px] text-red-500 animate-pulse">WAIT</span>
                            )}

                            {/* HP Bar */}
                            <div className="w-[80%] h-1 bg-gray-700 mt-1 rounded overflow-hidden">
                               <div className={`h-full transition-all ${stats.hp > 2000 ? 'bg-blue-500' : 'bg-green-500'}`} style={{width: `${(plant.hp/plant.maxHp)*100}%`}}></div>
                            </div>
                        </div>
                     </div>
                   );
                })}

                {/* Zombies */}
                {gameState.zombies.map(zombie => {
                   const stats = ZOMBIE_STATS[zombie.type];
                   const scale = stats.scale || 1;
                   return (
                     <div
                       key={zombie.id}
                       className="absolute w-[11.11%] h-[20%] flex items-center justify-center transition-transform will-change-transform"
                       style={{
                         top: `${(zombie.row / GRID_ROWS) * 100}%`,
                         left: `${zombie.x}%`,
                         transform: `translateX(-50%) scale(${scale})`,
                         zIndex: stats.scale ? 30 : 20
                       }}
                     >
                        <div className={`relative flex flex-col items-center justify-center ${zombie.isFrozen ? 'brightness-150 hue-rotate-180' : ''} ${zombie.isStopped ? 'sepia' : ''}`}>
                            {/* Visual Body */}
                            <div className="text-4xl drop-shadow-lg filter">
                                {zombie.type === ZombieType.MONOLITH ? '👹' : 
                                 zombie.type === ZombieType.SPAGHETTI ? '🏈' :
                                 zombie.type === ZombieType.LEGACY_CODE ? '🪣' :
                                 zombie.type === ZombieType.BUG ? '🚧' : 
                                 zombie.type === ZombieType.GOTO ? '🏃' :
                                 zombie.type === ZombieType.DEPRECATED ? '📰' :
                                 zombie.type === ZombieType.RECURSION ? '🕺' :
                                 zombie.type === ZombieType.STACK_OVERFLOW ? '💃' :
                                 '🧟'}
                            </div>
                            
                            {/* Buttered Status */}
                            {zombie.isStopped && <div className="absolute top-0 text-xl">🧈</div>}

                            <span className={`text-[9px] bg-black/60 px-1 rounded text-white font-mono mt-[-5px] backdrop-blur-sm ${zombie.isEnraged ? 'text-red-500 font-bold' : stats.color}`}>
                                {stats.name}
                            </span>
                            
                            <div className="w-12 h-1.5 bg-gray-800 mt-1 rounded overflow-hidden border border-gray-600">
                               <div className="h-full bg-red-600 transition-all" style={{width: `${(zombie.hp/zombie.maxHp)*100}%`}}></div>
                            </div>
                        </div>
                     </div>
                   );
                })}

                {/* Projectiles */}
                {gameState.projectiles.map(proj => (
                   <div
                     key={proj.id}
                     className={`absolute flex items-center justify-center font-bold transition-transform will-change-transform
                        ${proj.isFire ? 'text-orange-500 drop-shadow-[0_0_5px_rgba(255,165,0,0.8)]' : ''}
                        ${proj.isSplash ? 'text-2xl text-emerald-400' : 'text-sm text-[#9cdcfe]'}
                        ${proj.stopChance && proj.stopChance > 0 ? 'text-yellow-200' : ''}
                     `}
                     style={{
                       top: `${(proj.row / GRID_ROWS) * 100 + (proj.isSplash ? 2 : 8)}%`,
                       left: `${proj.x}%`,
                       width: proj.isSplash ? '30px' : '16px',
                       height: proj.isSplash ? '30px' : '16px',
                     }}
                   >
                      {proj.stopChance && proj.stopChance > 0 ? '🌽' : 
                       proj.isSplash ? (proj.isIce ? '❄️' : '📦') : 
                       proj.isFire ? '🔥' :
                       (proj.isIce ? '❄️' : '{}')}
                   </div>
                ))}

                 {/* Particles */}
                 {gameState.particles.map(p => (
                    <div
                      key={p.id}
                      className="absolute text-xs font-bold pointer-events-none font-mono"
                      style={{
                          top: `${(p.row / GRID_ROWS) * 100 + 5}%`,
                          left: `${p.x}%`,
                          opacity: p.life,
                          color: p.color || (p.symbol === '+RAM' ? '#fcd34d' : '#ff5555'),
                          transform: `translateY(-10px) scale(${0.5 + p.life})`
                      }}
                    >
                        {p.symbol}
                    </div>
                 ))}
            </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="h-6 bg-[#007acc] text-white text-[10px] flex items-center justify-center font-mono opacity-80">
         SYSTEM STATUS: {gameState.gameWon ? 'SECURE' : 'RUNNING'} | WORLD: {gameState.world} | LEVEL: {gameState.level}
      </footer>
      
      <style>{`
        @keyframes bounce-slight {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-bounce-slight {
          animation: bounce-slight 2s infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
