
import { GameState, Unit } from './game-types';
import { getUnitTemplate } from './unit-templates';
import { hexDistance } from './hex-utils';
import { rollD6 } from './combat-system';

export function addMoraleToken(unitId: string, gameState: GameState): GameState {
  const newGameState = { ...gameState };
  const unit = newGameState.units[unitId];
  
  if (unit) {
    // Shardbearer is immune to morale
    const template = getUnitTemplate(unit.templateId);
    if (template?.id === 'shardbearer') {
      return newGameState; // Immune to morale
    }
    
    newGameState.units[unitId] = {
      ...unit,
      moraleTokens: unit.moraleTokens + 1
    };
  }
  
  return newGameState;
}

export function removeMoraleToken(unitId: string, gameState: GameState): GameState {
  const newGameState = { ...gameState };
  const unit = newGameState.units[unitId];
  
  if (unit && unit.moraleTokens > 0) {
    newGameState.units[unitId] = {
      ...unit,
      moraleTokens: unit.moraleTokens - 1
    };
  }
  
  return newGameState;
}

export function performMoraleCheck(unitId: string, gameState: GameState): { passed: boolean; newState: GameState } {
  const unit = gameState.units[unitId];
  if (!unit) return { passed: true, newState: gameState };
  
  const template = getUnitTemplate(unit.templateId);
  if (!template) return { passed: true, newState: gameState };
  
  // Roll 1d6 + floor(Defense / 2)
  const roll = rollD6();
  const defenseBonus = Math.floor(template.defense / 2);
  const total = roll + defenseBonus;
  
  const passed = total >= 4;
  
  if (!passed) {
    // Failed morale check - unit must retreat or take damage
    let newState = { ...gameState };
    
    if (unit.position) {
      // Try to retreat 1 hex away from nearest enemy
      const retreatPosition = findRetreatPosition(unit, gameState);
      
      if (retreatPosition) {
        // Successful retreat
        newState.units[unitId] = {
          ...unit,
          position: retreatPosition,
          moraleTokens: Math.max(0, unit.moraleTokens - 1) // Remove 1 morale token
        };
      } else {
        // Cannot retreat, take 1 HP damage
        newState.units[unitId] = {
          ...unit,
          currentHp: unit.currentHp - 1
        };
      }
    }
    
    return { passed: false, newState };
  }
  
  return { passed: true, newState: gameState };
}

export function findRetreatPosition(unit: Unit, gameState: GameState) {
  if (!unit.position) return null;
  
  // Find nearest enemy
  const enemies = Object.values(gameState.units).filter(
    u => u.playerId !== unit.playerId && u.position && u.isDeployed
  );
  
  if (enemies.length === 0) return null;
  
  let nearestEnemy = enemies[0];
  let minDistance = hexDistance(unit.position, nearestEnemy.position!);
  
  for (const enemy of enemies) {
    if (enemy.position) {
      const distance = hexDistance(unit.position, enemy.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy;
      }
    }
  }
  
  // Try to move away from nearest enemy
  // For now, return null - retreat logic can be enhanced later
  return null;
}

export function processCommanderDeath(commanderId: string, gameState: GameState): GameState {
  const commander = gameState.units[commanderId];
  if (!commander?.position) return gameState;
  
  let newState = { ...gameState };
  
  // All enemy units within 3 hexes gain 1 morale token
  Object.keys(newState.units).forEach(unitId => {
    const unit = newState.units[unitId];
    if (unit.playerId !== commander.playerId && unit.position && unit.isDeployed) {
      const distance = hexDistance(commander.position!, unit.position);
      if (distance <= 3) {
        newState = addMoraleToken(unitId, newState);
      }
    }
  });
  
  return newState;
}

export function processStartOfTurnMoraleChecks(playerId: string, gameState: GameState): GameState {
  let newState = { ...gameState };
  
  const playerUnits = Object.values(newState.units).filter(
    unit => unit.playerId === playerId && unit.moraleTokens >= 3 && unit.isDeployed
  );
  
  for (const unit of playerUnits) {
    const result = performMoraleCheck(unit.id, newState);
    newState = result.newState;
    
    if (!result.passed) {
      // Unit failed morale check, cannot attack this turn
      newState.units[unit.id] = {
        ...newState.units[unit.id],
        activated: true // Mark as activated so it can't attack
      };
    }
  }
  
  return newState;
}

export function processSkaldRally(skaldId: string, gameState: GameState): GameState {
  const skald = gameState.units[skaldId];
  if (!skald?.position) return gameState;
  
  const template = getUnitTemplate(skald.templateId);
  if (template?.id !== 'skald') return gameState;
  
  let newState = { ...gameState };
  
  // Remove 1 morale token from all adjacent friendly units
  const adjacentUnits = Object.values(newState.units).filter(unit => {
    if (unit.playerId !== skald.playerId || !unit.position || unit.id === skaldId) {
      return false;
    }
    
    return hexDistance(skald.position!, unit.position) === 1;
  });
  
  adjacentUnits.forEach(unit => {
    newState = removeMoraleToken(unit.id, newState);
  });
  
  return newState;
}
