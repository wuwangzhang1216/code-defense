
export enum PlantType {
  SHOOTER = 'DEF',       // Peashooter: def attack():
  PRODUCER = 'WHILE',    // Sunflower: while True: (yields RAM)
  WALL = 'TRY',          // Wallnut: try: ... except:
  BOMB = 'SUDO',         // CherryBomb: sudo rm -rf
  ICE = 'AWAIT',         // SnowPea: await (slows down)
  REPEATER = 'ASYNC',    // Repeater: async def (Double shot)
  GATLING = 'CLASS',     // Gatling Pea: class (Quad shot)
  TALL_WALL = 'FINALLY', // Tallnut: finally: (High HP)
  HEAVY = 'IMPORT',      // Melonpult: import (Splash damage)
  
  // NEW TYPES
  LAMBDA = 'LAMBDA',     // Puff-shroom: lambda (Low cost, short range)
  REGEX = 'REGEX',       // Fume-shroom: re.match (Piercing)
  KERNEL = 'YIELD',      // Kernel-pult: yield (Chance to stun)
  DECORATOR = 'WRAPPER', // Torchwood: @decorator (Buffs peas)
  ASSERT = 'ASSERT',     // Potato Mine: assert (Delayed kill)
  EXIT = 'EXIT',         // Jalapeno: sys.exit (Lane clear)
  FROZEN_SET = 'FROZEN', // Winter Melon: frozenset (Splash + Slow)
}

export enum ZombieType {
  SYNTAX_ERROR = 'SYNTAX', // Normal
  BUG = 'BUG',             // Conehead
  LEGACY_CODE = 'LEGACY',  // Buckethead
  SPAGHETTI = 'SPAGHETTI', // Football Zombie (Fast, Tanky)
  MONOLITH = 'MONOLITH',   // Gargantuar (Huge HP)
  
  // NEW TYPES
  GOTO = 'GOTO',           // Pole Vaulting (Jumps)
  DEPRECATED = 'DEPRECATED', // Newspaper (Speeds up when shield lost)
  RECURSION = 'RECURSION', // Dancing (Summons backup)
  STACK_OVERFLOW = 'STACK', // Backup Dancer
}

export interface PlantConfig {
  type: PlantType;
  name: string;
  cost: number;
  hp: number;
  cooldown: number; // ms
  description: string;
  color: string;
  symbol: string;
  shots?: number; // Number of projectiles per trigger
  damage?: number; // Damage per projectile
  isSplash?: boolean; // Area damage
  isPiercing?: boolean; // Goes through enemies
  range?: number; // Grid columns range (Infinity if undefined)
  armingTime?: number; // Time to activate (Potato Mine)
  isInstant?: boolean; // Jalapeno
}

export interface Entity {
  id: string;
  row: number;
  x: number; // 0 to 100 percentage of lane width
}

export interface Plant extends Entity {
  type: PlantType;
  hp: number;
  maxHp: number;
  lastActionTime: number;
  createTime: number; // For arming logic
  col: number;
}

export interface Zombie extends Entity {
  type: ZombieType;
  hp: number;
  maxHp: number;
  speed: number; // % per second
  damage: number; // per second
  isFrozen: boolean;
  isStopped: boolean; // Buttered
  lastFrozenTime?: number;
  lastStoppedTime?: number;
  
  // Special States
  hasJumped?: boolean; // Pole Vault
  isEnraged?: boolean; // Newspaper
  lastSummonTime?: number; // Dancer
}

export interface Projectile extends Entity {
  damage: number;
  speed: number;
  isIce: boolean;
  isSplash: boolean; 
  isPiercing: boolean;
  isFire: boolean;
  stopChance?: number; // Chance to apply stop (Butter)
}

export interface Particle extends Entity {
  symbol: string;
  life: number; // 0-1 opacity
  vy: number;
  color?: string;
}

export interface GameState {
  resources: number;
  plants: Plant[];
  zombies: Zombie[];
  projectiles: Projectile[];
  particles: Particle[];
  wave: number; // This will now represent the "progress" of the current level spawning
  time: number;
  gameOver: boolean;
  gameWon: boolean;
  score: number;
  
  // Level System
  world: number; // 1-5
  level: number; // 1-10
  zombiesSpawned: number;
  totalZombiesInLevel: number;
}
