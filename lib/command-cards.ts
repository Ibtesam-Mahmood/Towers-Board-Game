
import { CommandCard } from './game-types';

export const COMMAND_CARDS: CommandCard[] = [
  {
    id: 'rapid_march',
    name: 'Rapid March',
    cpCost: 2,
    description: 'Move a chosen unit up to +2 additional hexes this activation.',
    effect: 'movement_bonus',
    timing: 'activation'
  },
  {
    id: 'concentrated_fire',
    name: 'Concentrated Fire',
    cpCost: 3,
    description: 'One ranged unit adds +3 to attack value for one shot.',
    effect: 'attack_bonus',
    timing: 'activation'
  },
  {
    id: 'reinforce',
    name: 'Reinforce',
    cpCost: 4,
    description: 'Instantly deploy a Militia (cost 4) from reserves to any controlled Supply Camp.',
    effect: 'deploy_militia',
    timing: 'activation'
  },
  {
    id: 'hold_the_line',
    name: 'Hold the Line',
    cpCost: 3,
    description: 'All units adjacent to target gain +2 Defense for the rest of the turn.',
    effect: 'defense_bonus',
    timing: 'activation'
  },
  {
    id: 'ambush',
    name: 'Ambush',
    cpCost: 3,
    description: 'Reveal and activate one hidden Skirmisher from reserves.',
    effect: 'ambush_deploy',
    timing: 'activation'
  },
  {
    id: 'emergency_redeploy',
    name: 'Emergency Redeploy',
    cpCost: 1,
    description: 'Save a single unit from being destroyed: move it to reserves immediately.',
    effect: 'save_unit',
    timing: 'reaction'
  },
  {
    id: 'siege_overwatch',
    name: 'Siege Overwatch',
    cpCost: 4,
    description: 'A Siege Engine may fire twice this activation.',
    effect: 'double_shot',
    timing: 'activation'
  },
  {
    id: 'flanking_maneuver',
    name: 'Flanking Maneuver',
    cpCost: 2,
    description: 'Target unit gains +2 attack if attacking a flanked enemy.',
    effect: 'flank_bonus',
    timing: 'activation'
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    cpCost: 2,
    description: 'Target infantry unit gains +3 defense against ranged attacks this turn.',
    effect: 'ranged_defense',
    timing: 'activation'
  },
  {
    id: 'battle_cry',
    name: 'Battle Cry',
    cpCost: 3,
    description: 'Remove 1 morale token from all friendly units within 2 hexes of target.',
    effect: 'morale_boost',
    timing: 'activation'
  }
];

export const getCommandCard = (id: string): CommandCard | undefined => {
  return COMMAND_CARDS.find(card => card.id === id);
};
