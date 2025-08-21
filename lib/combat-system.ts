
import { Unit, GameState, CombatResult, HexPosition } from './game-types';
import { getUnitTemplate } from './unit-templates';
import { getTerrainType } from './terrain';
import { hexDistance, getNeighbors, positionToKey } from './hex-utils';

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function calculateAttackerValue(
  attacker: Unit,
  defender: Unit,
  gameState: GameState,
  isRanged: boolean = false,
  chargeDistance: number = 0,
  commandModifiers: number = 0
): number {
  const attackerTemplate = getUnitTemplate(attacker.templateId);
  if (!attackerTemplate) return 0;

  let baseAttack = isRanged ? attackerTemplate.ranged : attackerTemplate.melee;
  let modifiers = commandModifiers;

  // Charge bonus for cavalry
  if (attackerTemplate.keywords.includes('Cavalry') && chargeDistance >= 2) {
    if (attackerTemplate.id === 'heavy_cavalry') {
      modifiers += 3; // Heavy cavalry charge
    } else {
      modifiers += 2; // Light cavalry charge
    }
  }

  // Flank bonus (+2 if defender is adjacent to 2+ enemy units)
  if (defender.position && isUnitFlanked(defender, gameState)) {
    modifiers += 2;
  }

  // Terrain bonuses
  if (attacker.position) {
    const terrainKey = positionToKey(attacker.position);
    const terrainId = gameState.terrain[terrainKey];
    if (terrainId === 'hill' && isRanged) {
      modifiers += 1;
    }
  }

  // Adjacent penalty for ranged attacks
  if (isRanged && attacker.position && defender.position) {
    const distance = hexDistance(attacker.position, defender.position);
    if (distance === 1) {
      modifiers -= 1;
    }
  }

  return baseAttack + modifiers;
}

export function calculateDefenderValue(
  defender: Unit,
  attacker: Unit,
  gameState: GameState,
  isRanged: boolean = false
): number {
  const defenderTemplate = getUnitTemplate(defender.templateId);
  const attackerTemplate = getUnitTemplate(attacker.templateId);
  if (!defenderTemplate || !attackerTemplate) return 0;

  let baseDefense = defenderTemplate.defense;
  let modifiers = 0;

  // Anti-cavalry bonus
  if (attackerTemplate.keywords.includes('Cavalry')) {
    if (defenderTemplate.id === 'spearmen') {
      modifiers += 1;
    } else if (defenderTemplate.id === 'pikemen') {
      modifiers += 2; // Pike wall ability
    }
  }

  // Terrain defensive bonuses
  if (defender.position) {
    const terrainKey = positionToKey(defender.position);
    const terrainId = gameState.terrain[terrainKey];
    const terrain = getTerrainType(terrainId || 'plain');
    
    if (terrain) {
      modifiers += terrain.defenseBonus;
      if (isRanged) {
        modifiers += terrain.rangedDefenseBonus;
      }
    }
  }

  // Out of supply penalty
  if (!defender.inSupply) {
    modifiers -= 2;
  }

  return baseDefense + modifiers;
}

export function isUnitFlanked(unit: Unit, gameState: GameState): boolean {
  if (!unit.position) return false;
  
  const neighbors = getNeighbors(unit.position);
  let enemyCount = 0;
  
  for (const neighborPos of neighbors) {
    const neighborKey = positionToKey(neighborPos);
    const neighborUnit = Object.values(gameState.units).find(
      u => u.position && positionToKey(u.position) === neighborKey && u.playerId !== unit.playerId
    );
    if (neighborUnit) {
      enemyCount++;
    }
  }
  
  return enemyCount >= 2;
}

export function resolveCombat(
  attackerId: string,
  defenderId: string,
  gameState: GameState,
  isRanged: boolean = false,
  chargeDistance: number = 0,
  commandModifiers: number = 0
): CombatResult {
  const attacker = gameState.units[attackerId];
  const defender = gameState.units[defenderId];
  
  if (!attacker || !defender) {
    throw new Error('Invalid units for combat');
  }

  const attackerValue = calculateAttackerValue(attacker, defender, gameState, isRanged, chargeDistance, commandModifiers);
  const defenderValue = calculateDefenderValue(defender, attacker, gameState, isRanged);
  
  const attackerRoll = rollD6();
  const defenderRoll = rollD6();
  
  const totalAttacker = attackerValue + attackerRoll;
  const totalDefender = defenderValue + defenderRoll;
  
  let result: CombatResult['result'];
  let damage = 0;
  let moraleGained = 0;
  const specialEffects: string[] = [];
  
  const difference = totalAttacker - totalDefender;
  
  if (difference >= 3) {
    result = 'massive-hit';
    damage = 2;
  } else if (difference >= 1) {
    result = 'hit';
    damage = 1;
  } else if (difference === 0) {
    result = 'tie';
    damage = 0;
    moraleGained = 1; // Both sides gain morale token on tie
    
    // Shardbearer wins ties automatically
    const attackerTemplate = getUnitTemplate(attacker.templateId);
    if (attackerTemplate?.id === 'shardbearer') {
      result = 'hit';
      damage = 1;
      moraleGained = 0;
      specialEffects.push('Shardbearer wins tie automatically');
    }
  } else {
    result = 'miss';
    // Only melee attacks get recoil damage - ranged attacks don't have counterattack
    damage = isRanged ? 0 : 1;
  }
  
  // Shardbearer special: victory margin ≥3 pushes enemy and deals +1 damage
  const attackerTemplate = getUnitTemplate(attacker.templateId);
  if (attackerTemplate?.id === 'shardbearer' && difference >= 3) {
    damage += 1;
    specialEffects.push('Shardbearer knockback +1 damage');
  }

  // Heavy cavalry special: +1 damage if attacking flanked unit
  if (attackerTemplate?.id === 'heavy_cavalry' && isUnitFlanked(defender, gameState) && damage > 0) {
    damage += 1;
    specialEffects.push('Heavy cavalry flank bonus +1 damage');
  }

  return {
    id: `combat_${Date.now()}_${Math.random()}`,
    attackerId,
    defenderId,
    attackerValue,
    defenderValue,
    attackerRoll,
    defenderRoll,
    result,
    damage,
    moraleGained,
    specialEffects
  };
}

export function canAttack(attackerId: string, defenderId: string, gameState: GameState): boolean {
  const attacker = gameState.units[attackerId];
  const defender = gameState.units[defenderId];
  
  if (!attacker?.position || !defender?.position) return false;
  if (attacker.currentHp <= 0 || defender.currentHp <= 0) return false; // Dead units cannot attack or be attacked
  if (attacker.playerId === defender.playerId) return false;
  if (attacker.activated) return false;
  if (!attacker.isDeployed || !defender.isDeployed) return false;
  
  const attackerTemplate = getUnitTemplate(attacker.templateId);
  if (!attackerTemplate) return false;
  
  const distance = hexDistance(attacker.position, defender.position);
  
  // Melee attack (adjacent)
  if (attackerTemplate.melee > 0 && distance === 1) {
    return true;
  }
  
  // Ranged attack
  if (attackerTemplate.ranged > 0) {
    const maxRange = attackerTemplate.id === 'siege_engine' ? 3 : 2; // Siege engines have longer range
    if (distance <= maxRange && distance >= 1) {
      // Check line of sight
      return hasLineOfSight(attacker.position, defender.position, gameState);
    }
  }
  
  return false;
}

export function hasLineOfSight(from: HexPosition, to: HexPosition, gameState: GameState): boolean {
  // For now, implement basic LOS - can be enhanced later
  const distance = hexDistance(from, to);
  if (distance <= 1) return true; // Adjacent always has LOS
  
  // Check for blocking terrain in between
  // This is a simplified implementation
  return true; // For MVP, assume clear LOS
}
