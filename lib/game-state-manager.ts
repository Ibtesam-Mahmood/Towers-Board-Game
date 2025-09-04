import { GameState, GameConfig, Unit, Army, HexPosition } from "./game-types";
import { UNIT_TEMPLATES, getUnitTemplate } from "./unit-templates";
import { calculateSupplyStatus } from "./supply-system";
import { processStartOfTurnMoraleChecks } from "./morale-system";
import { positionToKey, isValidPosition, hexDistance } from "./hex-utils";

export const DEFAULT_CONFIG: GameConfig = {
  pointLimit: 100,
  maxCommandCards: 5,
  cpPerTurn: 4,
  maxCp: 6,
  activationsPerTurn: 3,
  boardWidth: 10,
  boardHeight: 8,
};

export function createInitialGameState(
  config: GameConfig = DEFAULT_CONFIG
): GameState {
  return {
    currentPhase: "army-building",
    currentPlayer: "player1",
    turn: 1,
    activationsRemaining: config.activationsPerTurn,
    // Single battle format - no match scoring needed
    currentSkirmish: 1,
    players: {
      player1: {
        id: "player1",
        name: "Player 1",
        cp: config.cpPerTurn,
        armyList: [],
        hand: [],
        deployedUnits: 0,
        maxDeployment: 5,
      },
      player2: {
        id: "player2",
        name: "Player 2",
        cp: config.cpPerTurn,
        armyList: [],
        hand: [],
        deployedUnits: 0,
        maxDeployment: 5,
      },
    },
    boardSize: { width: config.boardWidth, height: config.boardHeight },
    terrain: generateInitialTerrain(config.boardWidth, config.boardHeight),
    units: {},
    combatLog: [],
  };
}

export function generateInitialTerrain(
  width: number,
  height: number
): { [key: string]: string } {
  const terrain: { [key: string]: string } = {};

  // Add some basic terrain for variety
  // Central hill
  const centerQ = Math.floor(width / 2);
  const centerR = Math.floor(height / 2);
  terrain[positionToKey({ q: centerQ, r: centerR })] = "hill";

  // Some forests symmetrically placed
  terrain[positionToKey({ q: 2, r: 2 })] = "forest";
  terrain[positionToKey({ q: width - 3, r: height - 3 })] = "forest";
  terrain[positionToKey({ q: width - 3, r: 2 })] = "forest";
  terrain[positionToKey({ q: 2, r: height - 3 })] = "forest";

  // Supply camps placed symmetrically 2 hexes behind front lines
  // For current 10x8 board: Front lines are around rows 3-4
  // So supply camps go at rows 1 and 6
  const player1SupplyCampRow = 1; // 2 hexes behind front line
  const player2SupplyCampRow = height - 2; // 2 hexes behind front line

  // Place multiple supply camps for each player symmetrically
  terrain[
    positionToKey({ q: Math.floor(width * 0.25), r: player1SupplyCampRow })
  ] = "supply_camp";
  terrain[
    positionToKey({ q: Math.floor(width * 0.75), r: player1SupplyCampRow })
  ] = "supply_camp";
  terrain[
    positionToKey({ q: Math.floor(width * 0.25), r: player2SupplyCampRow })
  ] = "supply_camp";
  terrain[
    positionToKey({ q: Math.floor(width * 0.75), r: player2SupplyCampRow })
  ] = "supply_camp";

  return terrain;
}

export function buildArmy(
  playerId: string,
  armyList: string[],
  gameState: GameState
): GameState {
  const newState = { ...gameState };

  // Validate army
  const totalCost = armyList.reduce((sum, templateId) => {
    const template = getUnitTemplate(templateId);
    return sum + (template?.cost || 0);
  }, 0);

  if (totalCost > DEFAULT_CONFIG.pointLimit) {
    throw new Error(
      `Army exceeds point limit: ${totalCost}/${DEFAULT_CONFIG.pointLimit}`
    );
  }

  newState.players[playerId].armyList = [...armyList];

  // Create reserve units
  armyList.forEach((templateId, index) => {
    const template = getUnitTemplate(templateId);
    if (template) {
      const unitId = `${playerId}_${templateId}_${index}`;
      newState.units[unitId] = {
        id: unitId,
        templateId,
        playerId,
        currentHp: template.hp,
        position: null,
        moraleTokens: 0,
        activated: false,
        inSupply: true,
        isDeployed: false,
        isInReserves: true,
      };
    }
  });

  return newState;
}

export function deployUnit(
  unitId: string,
  position: HexPosition,
  gameState: GameState
): GameState {
  const unit = gameState.units[unitId];
  if (!unit) throw new Error("Unit not found");
  if (unit.currentHp <= 0) throw new Error("Cannot deploy dead unit");
  if (!unit.isInReserves) throw new Error("Unit is not in reserves");

  // Check if it's the correct player's turn
  if (unit.playerId !== gameState.currentPlayer) {
    throw new Error("Not your turn to deploy");
  }

  // During battle phase, check if player has activations remaining
  if (
    gameState.currentPhase === "battle" &&
    gameState.activationsRemaining <= 0
  ) {
    throw new Error("No activations remaining to deploy unit");
  }

  const player = gameState.players[unit.playerId];

  // During battle phase, no deployment limit (can deploy any reserve unit)
  // During deployment phase, check deployment limit
  if (gameState.currentPhase === "deployment") {
    const aliveDeployedUnits = Object.values(gameState.units).filter(
      (u) => u.playerId === unit.playerId && u.isDeployed && u.currentHp > 0
    ).length;

    if (aliveDeployedUnits >= player.maxDeployment) {
      throw new Error(
        `Maximum deployment reached (${player.maxDeployment} units)`
      );
    }
  }

  // Check if position is empty (only count alive units)
  const posKey = positionToKey(position);
  const occupyingUnit = Object.values(gameState.units).find(
    (u) =>
      u.position &&
      positionToKey(u.position) === posKey &&
      u.isDeployed &&
      u.currentHp > 0
  );

  if (occupyingUnit) {
    throw new Error("Position occupied by alive unit");
  }

  // Check if position is in deployment zone
  if (!isInDeploymentZone(position, unit.playerId, gameState)) {
    throw new Error("Position not in deployment zone");
  }

  const newState = { ...gameState };
  newState.units[unitId] = {
    ...unit,
    position,
    isDeployed: true,
    isInReserves: false,
    // During battle phase, mark as activated since it used an activation
    activated: gameState.currentPhase === "battle" ? true : false,
  };

  // Update deployed unit count based on alive units only
  const aliveDeployedUnits = Object.values(newState.units).filter(
    (u) => u.playerId === unit.playerId && u.isDeployed && u.currentHp > 0
  ).length;
  newState.players[unit.playerId].deployedUnits = aliveDeployedUnits;

  // During battle phase, consume an activation
  if (gameState.currentPhase === "battle") {
    newState.activationsRemaining = Math.max(
      0,
      newState.activationsRemaining - 1
    );
  }

  return calculateSupplyStatus(newState);
}

export function isInDeploymentZone(
  position: HexPosition,
  playerId: string,
  gameState: GameState
): boolean {
  const { width, height } = gameState.boardSize;
  const { q, r } = position;

  // For symmetrical deployment, each player gets the back 2 rows of their side
  // This ensures both players have identical deployment spaces

  if (playerId === "player1") {
    // Player 1 deploys in the top 2 rows (r = 0, 1)
    return r >= 0 && r <= 1 && q >= 0 && q < width;
  } else {
    // Player 2 deploys in the bottom 2 rows
    return r >= height - 2 && r < height && q >= 0 && q < width;
  }
}

export function getDeploymentZones(gameState: GameState): {
  player1: HexPosition[];
  player2: HexPosition[];
} {
  const { width, height } = gameState.boardSize;
  const player1Zones: HexPosition[] = [];
  const player2Zones: HexPosition[] = [];

  // Calculate all deployment positions for each player
  for (let q = 0; q < width; q++) {
    // Player 1 - top 2 rows
    for (let r = 0; r <= 1; r++) {
      const position = { q, r };
      if (isValidPosition(position, width, height)) {
        player1Zones.push(position);
      }
    }

    // Player 2 - bottom 2 rows
    for (let r = height - 2; r < height; r++) {
      const position = { q, r };
      if (isValidPosition(position, width, height)) {
        player2Zones.push(position);
      }
    }
  }

  return { player1: player1Zones, player2: player2Zones };
}

export function startBattlePhase(gameState: GameState): GameState {
  const newState = { ...gameState };
  newState.currentPhase = "battle";
  newState.activationsRemaining = DEFAULT_CONFIG.activationsPerTurn;

  // Process start of turn morale checks
  return processStartOfTurnMoraleChecks(newState.currentPlayer, newState);
}

export function startTurn(gameState: GameState): GameState {
  let newState = { ...gameState };
  const currentPlayer = newState.players[newState.currentPlayer];

  // Clean up dead units first
  newState = cleanupDeadUnits(newState);

  // Add CP (up to max)
  currentPlayer.cp = Math.min(
    currentPlayer.cp + DEFAULT_CONFIG.cpPerTurn,
    DEFAULT_CONFIG.maxCp
  );

  // Reset activations
  newState.activationsRemaining = DEFAULT_CONFIG.activationsPerTurn;

  // Reset unit activation flags (only for alive units)
  Object.keys(newState.units).forEach((unitId) => {
    const unit = newState.units[unitId];
    if (unit.playerId === newState.currentPlayer && unit.currentHp > 0) {
      newState.units[unitId] = { ...unit, activated: false };
    }
  });

  // Process morale checks
  return processStartOfTurnMoraleChecks(newState.currentPlayer, newState);
}

// Clean up dead units from the battlefield
export function cleanupDeadUnits(gameState: GameState): GameState {
  const newState = { ...gameState };
  let unitsRemoved = 0;

  Object.keys(newState.units).forEach((unitId) => {
    const unit = newState.units[unitId];
    if (unit.currentHp <= 0 && unit.isDeployed) {
      // Remove from battlefield but keep in units list for tracking
      newState.units[unitId] = {
        ...unit,
        isDeployed: false,
        position: null,
        isInReserves: false, // Dead units are neither deployed nor in reserves
      };
      unitsRemoved++;
    }
  });

  // Recalculate deployed unit counts for both players
  ["player1", "player2"].forEach((playerId) => {
    const aliveDeployedCount = Object.values(newState.units).filter(
      (u) => u.playerId === playerId && u.isDeployed && u.currentHp > 0
    ).length;
    newState.players[playerId].deployedUnits = aliveDeployedCount;
  });

  return unitsRemoved > 0 ? calculateSupplyStatus(newState) : newState;
}

export function endTurn(gameState: GameState): GameState {
  let newState = { ...gameState };

  // Clean up dead units first
  newState = cleanupDeadUnits(newState);

  // Switch players
  newState.currentPlayer =
    newState.currentPlayer === "player1" ? "player2" : "player1";
  newState.turn++;

  // Apply supply penalties (only to alive units)
  Object.keys(newState.units).forEach((unitId) => {
    const unit = newState.units[unitId];
    if (!unit.inSupply && unit.isDeployed && unit.currentHp > 0) {
      newState = addMoraleToken(unitId, newState);
    }
  });

  // Start new turn
  return startTurn(newState);
}

function addMoraleToken(unitId: string, gameState: GameState): GameState {
  const newState = { ...gameState };
  const unit = newState.units[unitId];

  if (unit) {
    newState.units[unitId] = {
      ...unit,
      moraleTokens: unit.moraleTokens + 1,
    };
  }

  return newState;
}

export function moveUnit(
  unitId: string,
  targetPosition: HexPosition,
  gameState: GameState
): GameState {
  const unit = gameState.units[unitId];
  if (!unit?.position) throw new Error("Unit not found or not deployed");
  if (unit.currentHp <= 0) throw new Error("Dead units cannot move");
  if (unit.activated) throw new Error("Unit already activated");
  if (unit.playerId !== gameState.currentPlayer)
    throw new Error("Not your unit");
  if (gameState.activationsRemaining <= 0)
    throw new Error("No activations remaining");

  // Validate movement range
  const template = getUnitTemplate(unit.templateId);
  if (!template) throw new Error("Unit template not found");

  const distance = hexDistance(unit.position, targetPosition);
  if (distance > template.move)
    throw new Error("Target position out of movement range");

  // Check if target position is empty (only count alive units)
  const posKey = positionToKey(targetPosition);
  const occupyingUnit = Object.values(gameState.units).find(
    (u) =>
      u.position &&
      positionToKey(u.position) === posKey &&
      u.isDeployed &&
      u.currentHp > 0
  );

  if (occupyingUnit) throw new Error("Target position is occupied");

  const newState = { ...gameState };
  newState.units[unitId] = {
    ...unit,
    position: targetPosition,
    activated: true,
  };

  newState.activationsRemaining = Math.max(
    0,
    newState.activationsRemaining - 1
  );

  return calculateSupplyStatus(newState);
}

export function checkVictoryConditions(gameState: GameState): {
  winner: string | null;
  reason: string;
} {
  // Check if a player has no alive units (deployed or in reserves)
  const player1AliveUnits = Object.values(gameState.units).filter(
    (unit) =>
      unit.playerId === "player1" &&
      (unit.isDeployed || unit.isInReserves) &&
      unit.currentHp > 0
  );

  const player2AliveUnits = Object.values(gameState.units).filter(
    (unit) =>
      unit.playerId === "player2" &&
      (unit.isDeployed || unit.isInReserves) &&
      unit.currentHp > 0
  );

  if (player1AliveUnits.length === 0 && player2AliveUnits.length > 0) {
    return {
      winner: "player2",
      reason: "Player 1 has no remaining alive units",
    };
  }

  if (player2AliveUnits.length === 0 && player1AliveUnits.length > 0) {
    return {
      winner: "player1",
      reason: "Player 2 has no remaining alive units",
    };
  }

  // Single battle format - no match scoring needed

  return { winner: null, reason: "" };
}
