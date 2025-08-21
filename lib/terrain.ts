
import { TerrainType } from './game-types';

export const TERRAIN_TYPES: TerrainType[] = [
  {
    id: 'plain',
    name: 'Plain',
    movementCost: 1,
    moveModifier: 0,
    defenseBonus: 0,
    rangedDefenseBonus: 0,
    blocksLOS: false,
    blocks_line_of_sight: false,
    description: 'Open ground with no combat or movement modifiers.'
  },
  {
    id: 'forest',
    name: 'Forest',
    movementCost: 2,
    moveModifier: 1,
    defenseBonus: 0,
    rangedDefenseBonus: 1,
    blocksLOS: true,
    blocks_line_of_sight: true,
    description: 'Dense woods that provide cover from ranged attacks (+1 ranged defense) but slow movement (cost +1). Blocks line of sight for ranged attacks.'
  },
  {
    id: 'hill',
    name: 'Hill',
    movementCost: 1,
    moveModifier: 0,
    defenseBonus: 1,
    rangedDefenseBonus: 0,
    blocksLOS: false,
    blocks_line_of_sight: false,
    description: 'High ground that grants defensive advantage (+1 defense) and improved ranged attack accuracy (+1 ranged attack for occupants).'
  },
  {
    id: 'river',
    name: 'River',
    movementCost: 2,
    moveModifier: 1,
    defenseBonus: 0,
    rangedDefenseBonus: 0,
    blocksLOS: false,
    blocks_line_of_sight: false,
    description: 'Water crossing that slows movement (+1 movement cost). Cavalry units cannot charge across rivers (lose charge bonuses).'
  },
  {
    id: 'marsh',
    name: 'Marsh',
    movementCost: 3,
    moveModifier: 2,
    defenseBonus: 0,
    rangedDefenseBonus: 0,
    blocksLOS: false,
    blocks_line_of_sight: false,
    description: 'Treacherous wetlands that greatly slow movement (+2 movement cost). Light infantry and scouts ignore the movement penalty.'
  },
  {
    id: 'city',
    name: 'City',
    movementCost: 1,
    moveModifier: 0,
    defenseBonus: 3,
    rangedDefenseBonus: 1,
    blocksLOS: false,
    blocks_line_of_sight: false,
    description: 'Fortified urban area providing excellent protection (+3 defense, +1 ranged defense). Serves as a supply source when controlled by friendly units.'
  },
  {
    id: 'fort',
    name: 'Fort',
    movementCost: 1,
    moveModifier: 0,
    defenseBonus: 3,
    rangedDefenseBonus: 2,
    blocksLOS: false,
    blocks_line_of_sight: false,
    description: 'Military stronghold offering superior defensive bonuses (+3 defense, +2 ranged defense). Acts as a major supply depot for the controlling player.'
  },
  {
    id: 'supply_camp',
    name: 'Supply Camp',
    movementCost: 1,
    moveModifier: 0,
    defenseBonus: 1,
    rangedDefenseBonus: 0,
    blocksLOS: false,
    blocks_line_of_sight: false,
    description: 'Military supply depot (+1 defense). Creates supply network - units trace supply through friendly units back to camps or deployment zones. Out-of-supply units get -2 to combat rolls and gain morale tokens.'
  }
];

export const getTerrainType = (id: string): TerrainType | undefined => {
  return TERRAIN_TYPES.find(terrain => terrain.id === id);
};
