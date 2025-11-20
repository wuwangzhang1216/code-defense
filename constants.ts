
import { PlantType, PlantConfig, ZombieType } from './types';

export const GRID_ROWS = 5;
export const GRID_COLS = 9;
export const TICK_RATE = 30; // ms per tick (approx 30fps)

// PvZ Style: Start with enough for one producer (50 sun)
export const INITIAL_RESOURCES = 50;

// --- BALANCE CONSTANTS ---
// 1 Pea = 20 Damage.
// Normal Zombie = 270 HP.

export const PLANT_STATS: Record<PlantType, PlantConfig> = {
  [PlantType.PRODUCER]: {
    type: PlantType.PRODUCER,
    name: 'while True:',
    cost: 50,
    hp: 300,
    cooldown: 12000,
    description: 'Produces RAM.',
    color: 'text-yellow-400',
    symbol: 'while',
  },
  [PlantType.SHOOTER]: {
    type: PlantType.SHOOTER,
    name: 'def shoot():',
    cost: 100,
    hp: 300,
    cooldown: 1400,
    description: 'Standard shooter.',
    color: 'text-green-400',
    symbol: 'def',
    shots: 1,
    damage: 20,
  },
  [PlantType.LAMBDA]: {
    type: PlantType.LAMBDA,
    name: 'lambda:',
    cost: 0,
    hp: 200,
    cooldown: 1400,
    description: 'Free, short range.',
    color: 'text-purple-300',
    symbol: 'λ',
    shots: 1,
    damage: 20,
    range: 3, // 3 Grid cells
  },
  [PlantType.ASSERT]: {
    type: PlantType.ASSERT,
    name: 'assert',
    cost: 25,
    hp: 300,
    cooldown: 0,
    description: 'Explodes on contact after delay.',
    color: 'text-amber-700',
    symbol: 'assert',
    armingTime: 15000, // 15s to arm
  },
  [PlantType.WALL]: {
    type: PlantType.WALL,
    name: 'try:',
    cost: 50,
    hp: 4000,
    cooldown: 0,
    description: 'Blocks enemies.',
    color: 'text-amber-600',
    symbol: 'try',
  },
  [PlantType.REGEX]: {
    type: PlantType.REGEX,
    name: 're.match',
    cost: 75,
    hp: 300,
    cooldown: 1400,
    description: 'Pierces enemies.',
    color: 'text-fuchsia-500',
    symbol: 're',
    damage: 20,
    isPiercing: true,
  },
  [PlantType.KERNEL]: {
    type: PlantType.KERNEL,
    name: 'yield',
    cost: 100,
    hp: 300,
    cooldown: 2900,
    description: 'Lobs kernel. Chance to stun.',
    color: 'text-yellow-200',
    symbol: 'yield',
    damage: 20,
  },
  [PlantType.REPEATER]: {
    type: PlantType.REPEATER,
    name: 'async def:',
    cost: 200,
    hp: 300,
    cooldown: 1400,
    description: 'Shoots 2 projectiles.',
    color: 'text-green-300',
    symbol: 'async',
    shots: 2,
    damage: 20,
  },
  [PlantType.ICE]: {
    type: PlantType.ICE,
    name: 'await',
    cost: 175,
    hp: 300,
    cooldown: 1400,
    description: 'Damage + Slows.',
    color: 'text-cyan-300',
    symbol: 'await',
    shots: 1,
    damage: 20,
  },
  [PlantType.DECORATOR]: {
    type: PlantType.DECORATOR,
    name: '@wrapper',
    cost: 175,
    hp: 300,
    cooldown: 0,
    description: 'Doubles pea damage.',
    color: 'text-orange-500',
    symbol: '@',
  },
  [PlantType.GATLING]: {
    type: PlantType.GATLING,
    name: 'class Gatling:',
    cost: 250,
    hp: 300,
    cooldown: 1400,
    description: 'Shoots 4 projectiles.',
    color: 'text-yellow-600',
    symbol: 'class',
    shots: 4,
    damage: 20,
  },
  [PlantType.TALL_WALL]: {
    type: PlantType.TALL_WALL,
    name: 'finally:',
    cost: 125,
    hp: 8000,
    cooldown: 0,
    description: 'Heavy defense.',
    color: 'text-slate-500',
    symbol: 'fin',
  },
  [PlantType.EXIT]: {
    type: PlantType.EXIT,
    name: 'sys.exit()',
    cost: 125,
    hp: 1000,
    cooldown: 0,
    description: 'Kills entire lane.',
    color: 'text-red-500',
    symbol: 'exit',
    isInstant: true,
  },
  [PlantType.HEAVY]: {
    type: PlantType.HEAVY,
    name: 'import lib',
    cost: 300,
    hp: 300,
    cooldown: 2900,
    description: 'Heavy splash damage.',
    color: 'text-emerald-500',
    symbol: 'imp',
    damage: 80,
    isSplash: true,
  },
  [PlantType.FROZEN_SET]: {
    type: PlantType.FROZEN_SET,
    name: 'frozenset',
    cost: 500,
    hp: 300,
    cooldown: 2900,
    description: 'Splash + Slow.',
    color: 'text-blue-400',
    symbol: 'fset',
    damage: 80,
    isSplash: true,
  },
  [PlantType.BOMB]: {
    type: PlantType.BOMB,
    name: 'sudo rm -rf',
    cost: 150,
    hp: 10000,
    cooldown: 0,
    description: 'Massive area damage.',
    color: 'text-red-600',
    symbol: 'sudo',
  },
};

export const ZOMBIE_STATS: Record<ZombieType, { hp: number; speed: number; damage: number; name: string; color: string; scoreValue: number; scale?: number }> = {
  [ZombieType.SYNTAX_ERROR]: {
    hp: 270,
    speed: 2.5, 
    damage: 100,
    name: 'SyntaxError',
    color: 'text-red-400',
    scoreValue: 10,
  },
  [ZombieType.BUG]: {
    hp: 370, // Cone
    speed: 2.5,
    damage: 100,
    name: 'RuntimeBug',
    color: 'text-orange-400',
    scoreValue: 25,
  },
  [ZombieType.LEGACY_CODE]: {
    hp: 1390, // Bucket
    speed: 2.2,
    damage: 100,
    name: 'LegacyCode',
    color: 'text-gray-400',
    scoreValue: 50,
  },
  [ZombieType.DEPRECATED]: {
    hp: 430, // Newspaper (160 shield + 270)
    speed: 2.2,
    damage: 100,
    name: 'Deprecated',
    color: 'text-stone-300',
    scoreValue: 50,
  },
  [ZombieType.GOTO]: {
    hp: 500, // Pole Vault
    speed: 4.5, // Fast run
    damage: 100,
    name: 'GOTO',
    color: 'text-yellow-600',
    scoreValue: 50,
  },
  [ZombieType.SPAGHETTI]: {
    hp: 1670, // Football
    speed: 4.0,
    damage: 100,
    name: 'Spaghetti',
    color: 'text-rose-700',
    scoreValue: 75,
  },
  [ZombieType.RECURSION]: {
    hp: 500, // Dancer
    speed: 2.2,
    damage: 100,
    name: 'Recursion',
    color: 'text-pink-500',
    scoreValue: 75,
  },
  [ZombieType.STACK_OVERFLOW]: {
    hp: 270, // Backup Dancer
    speed: 2.2,
    damage: 100,
    name: 'StackOver',
    color: 'text-pink-300',
    scoreValue: 10,
  },
  [ZombieType.MONOLITH]: {
    hp: 3000, // Gargantuar
    speed: 1.8,
    damage: 5000,
    name: 'MONOLITH',
    color: 'text-purple-600',
    scoreValue: 150,
    scale: 1.5,
  },
};

export const PROJECTILE_SPEED = 35; 
export const RESOURCE_GENERATION_AMOUNT = 25; 
export const WAVE_DELAY = 25000;

export const getLevelConfig = (world: number, level: number) => {
  // Zombie Types Allowed
  const types: ZombieType[] = [ZombieType.SYNTAX_ERROR];
  
  // World 1 Progression
  if (world === 1) {
      if (level >= 3) types.push(ZombieType.BUG);
      if (level >= 6) types.push(ZombieType.LEGACY_CODE);
      if (level >= 7) types.push(ZombieType.DEPRECATED);
      if (level >= 9) types.push(ZombieType.SPAGHETTI);
  }
  // World 2 (Night) - Add basics from W1 + maybe new ones later
  else if (world >= 2) {
      types.push(ZombieType.BUG, ZombieType.LEGACY_CODE, ZombieType.DEPRECATED);
      if (world >= 3) types.push(ZombieType.SPAGHETTI);
      if (world >= 4) types.push(ZombieType.GOTO); // Pole Vault
      if (world >= 5) types.push(ZombieType.MONOLITH);
  }

  // Special Enforced Types (like ScreenDoor mapped to Legacy for 1-8)
  if (world === 1 && level === 8 && !types.includes(ZombieType.LEGACY_CODE)) types.push(ZombieType.LEGACY_CODE);

  // Total Zombies
  // 1-1: 5 zombies
  // 1-10: 50 zombies
  let count = 5 + (level * 3) + ((world - 1) * 15);
  if (level === 10) count *= 1.5; // Boss wave / Conveyor

  return {
    types,
    totalZombies: Math.floor(count),
    isNight: world === 2 || world === 4,
    isPool: world === 3 || world === 4,
    isRoof: world === 5,
    hasFallingSun: world === 1 || world === 3 || world === 5 // Night and Fog don't have falling sun
  };
};
