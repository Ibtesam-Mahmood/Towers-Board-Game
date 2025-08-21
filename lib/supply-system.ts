
import { GameState, Unit, HexPosition } from './game-types';
import { getNeighbors, positionToKey, hexDistance } from './hex-utils';

export function calculateSupplyStatus(gameState: GameState): GameState {
  const newGameState = { ...gameState };
  
  // Reset all units to out of supply first
  Object.keys(newGameState.units).forEach(unitId => {
    newGameState.units[unitId] = {
      ...newGameState.units[unitId],
      inSupply: false
    };
  });
  
  // Check supply for each player separately
  Object.keys(newGameState.players).forEach(playerId => {
    const playerUnits = Object.values(newGameState.units).filter(
      unit => unit.playerId === playerId && unit.isDeployed && unit.position
    );
    
    playerUnits.forEach(unit => {
      if (unit.position) {
        newGameState.units[unit.id] = {
          ...unit,
          inSupply: isInSupply(unit, gameState, playerId)
        };
      }
    });
  });
  
  return newGameState;
}

export function isInSupply(unit: Unit, gameState: GameState, playerId: string): boolean {
  if (!unit.position) return false;
  
  // BFS to find supply path
  const visited = new Set<string>();
  const queue: HexPosition[] = [unit.position];
  visited.add(positionToKey(unit.position));
  
  while (queue.length > 0) {
    const currentPos = queue.shift()!;
    const currentKey = positionToKey(currentPos);
    
    // Check if current position is a supply source
    if (isSupplySource(currentPos, gameState, playerId)) {
      return true;
    }
    
    // Check neighbors
    const neighbors = getNeighbors(currentPos);
    for (const neighborPos of neighbors) {
      const neighborKey = positionToKey(neighborPos);
      
      if (visited.has(neighborKey)) continue;
      
      // Check if neighbor has friendly unit or supply source
      const neighborUnit = Object.values(gameState.units).find(
        u => u.position && positionToKey(u.position) === neighborKey
      );
      
      // Can trace through friendly units or supply sources
      if ((neighborUnit && neighborUnit.playerId === playerId) || 
          isSupplySource(neighborPos, gameState, playerId)) {
        visited.add(neighborKey);
        queue.push(neighborPos);
      }
    }
  }
  
  return false;
}

export function isSupplySource(position: HexPosition, gameState: GameState, playerId: string): boolean {
  const posKey = positionToKey(position);
  const terrainId = gameState.terrain[posKey];
  
  // Supply camps are supply sources if controlled
  if (terrainId === 'supply_camp') {
    return isControlledByPlayer(position, gameState, playerId);
  }
  
  // Forts and cities are supply sources if garrisoned
  if (terrainId === 'fort' || terrainId === 'city') {
    return isControlledByPlayer(position, gameState, playerId);
  }
  
  // Check if it's near deployment edge (basic supply source)
  return isNearDeploymentEdge(position, gameState, playerId);
}

export function isControlledByPlayer(position: HexPosition, gameState: GameState, playerId: string): boolean {
  const unit = Object.values(gameState.units).find(
    u => u.position && positionToKey(u.position) === positionToKey(position) && u.playerId === playerId
  );
  
  if (unit) return true;
  
  // Check adjacent hexes for friendly units (controls the terrain)
  const neighbors = getNeighbors(position);
  for (const neighborPos of neighbors) {
    const neighborUnit = Object.values(gameState.units).find(
      u => u.position && positionToKey(u.position) === positionToKey(neighborPos) && u.playerId === playerId
    );
    if (neighborUnit) return true;
  }
  
  return false;
}

export function isNearDeploymentEdge(position: HexPosition, gameState: GameState, playerId: string): boolean {
  // For 10x8 board, player 1 starts at top (r=0-1), player 2 at bottom (r=6-7)
  // This is a simplified implementation
  const boardHeight = gameState.boardSize.height;
  const row = position.r;
  
  if (playerId === 'player1') {
    return row <= 1; // Top two rows
  } else {
    return row >= boardHeight - 2; // Bottom two rows
  }
}

export function applySupplyPenalties(gameState: GameState): GameState {
  const newGameState = { ...gameState };
  
  Object.keys(newGameState.units).forEach(unitId => {
    const unit = newGameState.units[unitId];
    
    if (!unit.inSupply && unit.isDeployed) {
      // At end of enemy turn, out-of-supply unit gains morale token
      // This would be called during end of turn processing
      
      // TODO: Track consecutive turns out of supply for HP loss
      // For now, just mark as out of supply (penalties applied in combat)
    }
  });
  
  return newGameState;
}

export function canBuildSupplyCamp(engineerId: string, position: HexPosition, gameState: GameState): boolean {
  const engineer = gameState.units[engineerId];
  if (!engineer?.position) return false;
  
  const engineerTemplate = engineer.templateId;
  if (engineerTemplate !== 'engineer') return false;
  
  // Must be adjacent to engineer
  const distance = hexDistance(engineer.position, position);
  if (distance !== 1) return false;
  
  // Position must be empty
  const posKey = positionToKey(position);
  const occupyingUnit = Object.values(gameState.units).find(
    unit => unit.position && positionToKey(unit.position) === posKey
  );
  
  if (occupyingUnit) return false;
  
  // Must not already be a special terrain
  const existingTerrain = gameState.terrain[posKey];
  if (existingTerrain && existingTerrain !== 'plain') return false;
  
  return true;
}
