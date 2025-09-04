// Core game data types for TOWERS board game
export interface UnitTemplate {
  id: string;
  name: string;
  type: string;
  cost: number;
  move: number;
  hp: number;
  melee: number;
  ranged: number;
  defense: number;
  supply: number;
  size: number;
  keywords: string[];
  ability: string;
  abilityDescription: string;
}

export interface Unit {
  id: string;
  templateId: string;
  playerId: string;
  currentHp: number;
  position: HexPosition | null;
  moraleTokens: number;
  activated: boolean;
  inSupply: boolean;
  isDeployed: boolean;
  isInReserves: boolean;
}

export interface HexPosition {
  q: number; // hex coordinate q
  r: number; // hex coordinate r
}

export interface TerrainType {
  id: string;
  name: string;
  movementCost: number;
  moveModifier: number;
  defenseBonus: number;
  rangedDefenseBonus: number;
  blocksLOS: boolean;
  blocks_line_of_sight: boolean;
  description: string;
}

export interface CommandCard {
  id: string;
  name: string;
  cpCost: number;
  description: string;
  effect: string;
  timing: "activation" | "reaction" | "anytime";
}

export interface GameState {
  currentPhase:
    | "army-building"
    | "deployment"
    | "battle"
    | "skirmish-end"
    | "match-end";
  currentPlayer: string;
  turn: number;
  activationsRemaining: number;

  // Match tracking
  // Single battle format - no match scoring needed
  currentSkirmish: number;

  // Players
  players: {
    [key: string]: {
      id: string;
      name: string;
      cp: number;
      armyList: string[]; // template IDs
      hand: string[]; // command card IDs
      deployedUnits: number;
      maxDeployment: number;
    };
  };

  // Board state
  boardSize: { width: number; height: number };
  terrain: { [key: string]: string }; // position key -> terrain type
  units: { [key: string]: Unit };

  // Combat state
  combatLog: CombatResult[];
}

export interface CombatResult {
  id: string;
  attackerId: string;
  defenderId: string;
  attackerValue: number;
  defenderValue: number;
  attackerRoll: number;
  defenderRoll: number;
  result: "massive-hit" | "hit" | "tie" | "miss";
  damage: number;
  moraleGained: number;
  specialEffects: string[];
}

export interface Army {
  units: string[]; // template IDs
  commandCards: string[];
  totalCost: number;
}

export interface GameConfig {
  pointLimit: number;
  maxCommandCards: number;
  cpPerTurn: number;
  maxCp: number;
  activationsPerTurn: number;
  boardWidth: number;
  boardHeight: number;
}
