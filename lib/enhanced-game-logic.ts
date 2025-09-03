import { GameState, Unit, HexPosition, CombatResult } from "./game-types";
import { getUnitTemplate } from "./unit-templates";
import { canAttack, resolveCombat } from "./combat-system";
import {
  deployUnit,
  moveUnit,
  endTurn,
  isInDeploymentZone,
  cleanupDeadUnits,
} from "./game-state-manager";
import { hexDistance, positionToKey } from "./hex-utils";
import { calculateSupplyStatus } from "./supply-system";

// Enhanced logging system
export class GameLogger {
  private static logs: GameLogEntry[] = [];

  static log(type: LogType, message: string, data?: any) {
    const entry: GameLogEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    };

    this.logs.push(entry);
    console.log(`[${type}] ${message}`, data || "");

    // Keep only last 1000 entries
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  static getLogs(count = 50): GameLogEntry[] {
    return this.logs.slice(-count);
  }

  static clear() {
    this.logs = [];
  }
}

export interface GameLogEntry {
  id: number;
  timestamp: string;
  type: LogType;
  message: string;
  data?: any;
}

export type LogType =
  | "ACTION"
  | "COMBAT"
  | "DEPLOYMENT"
  | "MOVEMENT"
  | "STATE_CHANGE"
  | "ERROR"
  | "VALIDATION"
  | "AI"
  | "DEBUG";

// Enhanced game state management with validation and logging
export class EnhancedGameManager {
  // Unit death handling
  static removeDeadUnits(gameState: GameState): GameState {
    GameLogger.log("STATE_CHANGE", "Checking for dead units");
    const newState = { ...gameState };
    let unitsRemoved = 0;

    Object.keys(newState.units).forEach((unitId) => {
      const unit = newState.units[unitId];
      if (unit.currentHp <= 0 && unit.isDeployed) {
        GameLogger.log("STATE_CHANGE", `Unit ${unit.id} died`, {
          unitName: getUnitTemplate(unit.templateId)?.name,
          playerId: unit.playerId,
        });

        // Remove from board but keep in units list for scoring/tracking
        newState.units[unitId] = {
          ...unit,
          isDeployed: false,
          position: null,
          isInReserves: false, // Dead units are neither deployed nor in reserves
        };

        // Decrease deployed unit count
        if (newState.players[unit.playerId]) {
          newState.players[unit.playerId].deployedUnits = Math.max(
            0,
            newState.players[unit.playerId].deployedUnits - 1
          );
        }

        unitsRemoved++;
      }
    });

    if (unitsRemoved > 0) {
      GameLogger.log(
        "STATE_CHANGE",
        `Removed ${unitsRemoved} dead units from battlefield`
      );
    }

    return newState;
  }

  // Enhanced deployment with undeploy capability
  static deployUnitEnhanced(
    unitId: string,
    position: HexPosition,
    gameState: GameState
  ): GameState {
    GameLogger.log("DEPLOYMENT", `Attempting to deploy unit ${unitId}`, {
      position,
    });

    const unit = gameState.units[unitId];
    if (!unit) {
      const error = "Unit not found";
      GameLogger.log("ERROR", error, { unitId });
      throw new Error(error);
    }

    if (unit.currentHp <= 0) {
      const error = "Cannot deploy dead unit";
      GameLogger.log("ERROR", error, { unitId, hp: unit.currentHp });
      throw new Error(error);
    }

    try {
      const newState = deployUnit(unitId, position, gameState);
      GameLogger.log("DEPLOYMENT", `Successfully deployed unit ${unitId}`, {
        position,
        unitName: getUnitTemplate(unit.templateId)?.name,
      });
      return newState;
    } catch (error) {
      GameLogger.log("ERROR", "Deployment failed", {
        unitId,
        position,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Undeploy unit during deployment phase
  static undeployUnit(unitId: string, gameState: GameState): GameState {
    if (gameState.currentPhase !== "deployment") {
      const error = "Can only undeploy during deployment phase";
      GameLogger.log("ERROR", error, { phase: gameState.currentPhase });
      throw new Error(error);
    }

    GameLogger.log("DEPLOYMENT", `Attempting to undeploy unit ${unitId}`);

    const unit = gameState.units[unitId];
    if (!unit) {
      const error = "Unit not found";
      GameLogger.log("ERROR", error, { unitId });
      throw new Error(error);
    }

    if (!unit.isDeployed) {
      const error = "Unit is not deployed";
      GameLogger.log("ERROR", error, { unitId });
      throw new Error(error);
    }

    if (unit.playerId !== gameState.currentPlayer) {
      const error = "Not your unit";
      GameLogger.log("ERROR", error, {
        unitId,
        currentPlayer: gameState.currentPlayer,
      });
      throw new Error(error);
    }

    const newState = { ...gameState };
    newState.units[unitId] = {
      ...unit,
      position: null,
      isDeployed: false,
      isInReserves: true,
    };

    newState.players[unit.playerId].deployedUnits = Math.max(
      0,
      newState.players[unit.playerId].deployedUnits - 1
    );

    GameLogger.log("DEPLOYMENT", `Successfully undeployed unit ${unitId}`, {
      unitName: getUnitTemplate(unit.templateId)?.name,
    });

    return newState;
  }

  // Enhanced movement with validation
  static moveUnitEnhanced(
    unitId: string,
    targetPosition: HexPosition,
    gameState: GameState
  ): GameState {
    GameLogger.log("MOVEMENT", `Attempting to move unit ${unitId}`, {
      targetPosition,
    });

    const unit = gameState.units[unitId];
    if (!unit) {
      const error = "Unit not found";
      GameLogger.log("ERROR", error, { unitId });
      throw new Error(error);
    }

    // Enhanced validation
    if (unit.currentHp <= 0) {
      const error = "Dead units cannot move";
      GameLogger.log("ERROR", error, { unitId, hp: unit.currentHp });
      throw new Error(error);
    }

    if (gameState.activationsRemaining <= 0) {
      const error = "No activations remaining";
      GameLogger.log("ERROR", error, {
        activationsRemaining: gameState.activationsRemaining,
      });
      throw new Error(error);
    }

    if (unit.activated) {
      const error = "Unit already activated this turn";
      GameLogger.log("ERROR", error, { unitId });
      throw new Error(error);
    }

    try {
      let newState = moveUnit(unitId, targetPosition, gameState);

      // Ensure activations don't go negative
      newState.activationsRemaining = Math.max(
        0,
        newState.activationsRemaining
      );

      GameLogger.log("MOVEMENT", `Successfully moved unit ${unitId}`, {
        targetPosition,
        unitName: getUnitTemplate(unit.templateId)?.name,
        activationsRemaining: newState.activationsRemaining,
      });

      return newState;
    } catch (error) {
      GameLogger.log("ERROR", "Movement failed", {
        unitId,
        targetPosition,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Enhanced combat with proper validation and death handling
  static executeCombat(
    attackerId: string,
    defenderId: string,
    gameState: GameState
  ): GameState {
    GameLogger.log("COMBAT", `Combat initiated`, { attackerId, defenderId });

    const attacker = gameState.units[attackerId];
    const defender = gameState.units[defenderId];

    // Enhanced validation
    if (!attacker || !defender) {
      const error = "Invalid units for combat";
      GameLogger.log("ERROR", error, { attackerId, defenderId });
      throw new Error(error);
    }

    if (attacker.currentHp <= 0) {
      const error = "Dead attacker cannot attack";
      GameLogger.log("ERROR", error, { attackerId, hp: attacker.currentHp });
      throw new Error(error);
    }

    if (defender.currentHp <= 0) {
      const error = "Cannot attack dead unit";
      GameLogger.log("ERROR", error, { defenderId, hp: defender.currentHp });
      throw new Error(error);
    }

    if (attacker.activated) {
      const error = "Unit already activated this turn";
      GameLogger.log("ERROR", error, { attackerId });
      throw new Error(error);
    }

    if (gameState.activationsRemaining <= 0) {
      const error = "No activations remaining";
      GameLogger.log("ERROR", error, {
        activationsRemaining: gameState.activationsRemaining,
      });
      throw new Error(error);
    }

    if (!canAttack(attackerId, defenderId, gameState)) {
      const error = "Cannot attack target (out of range or invalid target)";
      GameLogger.log("ERROR", error, { attackerId, defenderId });
      throw new Error(error);
    }

    try {
      const isRanged = !!(
        attacker.position &&
        defender.position &&
        hexDistance(attacker.position, defender.position) > 1
      );

      const combatResult = resolveCombat(
        attackerId,
        defenderId,
        gameState,
        isRanged
      );

      GameLogger.log("COMBAT", "Combat resolved", {
        result: combatResult.result,
        damage: combatResult.damage,
        attackerRoll: combatResult.attackerRoll,
        defenderRoll: combatResult.defenderRoll,
      });

      let newState = { ...gameState };
      newState.combatLog.push(combatResult);

      // Apply damage with proper clamping
      if (combatResult.damage > 0) {
        if (combatResult.result === "miss") {
          // Attacker takes damage on miss (counterattack)
          const newHp = Math.max(0, attacker.currentHp - combatResult.damage);
          newState.units[attackerId] = {
            ...attacker,
            currentHp: newHp,
          };
          GameLogger.log(
            "COMBAT",
            `Attacker took ${combatResult.damage} damage`,
            {
              newHp,
              unitName: getUnitTemplate(attacker.templateId)?.name,
            }
          );
        } else {
          // Defender takes damage
          const newHp = Math.max(0, defender.currentHp - combatResult.damage);
          newState.units[defenderId] = {
            ...defender,
            currentHp: newHp,
          };
          GameLogger.log(
            "COMBAT",
            `Defender took ${combatResult.damage} damage`,
            {
              newHp,
              unitName: getUnitTemplate(defender.templateId)?.name,
            }
          );
        }
      }

      // Apply morale tokens
      if (combatResult.moraleGained > 0 && combatResult.result === "tie") {
        newState.units[attackerId] = {
          ...newState.units[attackerId],
          moraleTokens:
            newState.units[attackerId].moraleTokens + combatResult.moraleGained,
        };
        newState.units[defenderId] = {
          ...newState.units[defenderId],
          moraleTokens:
            newState.units[defenderId].moraleTokens + combatResult.moraleGained,
        };
        GameLogger.log(
          "COMBAT",
          `Both units gained ${combatResult.moraleGained} morale tokens`
        );
      }

      // Mark attacker as activated and consume activation
      newState.units[attackerId] = {
        ...newState.units[attackerId],
        activated: true,
      };

      newState.activationsRemaining = Math.max(
        0,
        newState.activationsRemaining - 1
      );

      // Remove dead units
      newState = this.removeDeadUnits(newState);

      GameLogger.log("COMBAT", "Combat completed", {
        activationsRemaining: newState.activationsRemaining,
      });

      return newState;
    } catch (error) {
      GameLogger.log("ERROR", "Combat execution failed", {
        attackerId,
        defenderId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Get valid movement positions with enhanced logic
  static getValidMovementPositions(
    unit: Unit,
    gameState: GameState
  ): HexPosition[] {
    if (!unit.position || unit.currentHp <= 0 || unit.activated) {
      return [];
    }

    const template = getUnitTemplate(unit.templateId);
    if (!template) return [];

    const validPositions: HexPosition[] = [];

    for (let q = 0; q < gameState.boardSize.width; q++) {
      for (let r = 0; r < gameState.boardSize.height; r++) {
        const position = { q, r };
        const distance = hexDistance(unit.position, position);

        if (distance > 0 && distance <= template.move) {
          // Check if position is empty
          const posKey = positionToKey(position);
          const occupyingUnit = Object.values(gameState.units).find(
            (u) =>
              u.position &&
              positionToKey(u.position) === posKey &&
              u.isDeployed &&
              u.currentHp > 0
          );

          if (!occupyingUnit) {
            validPositions.push(position);
          }
        }
      }
    }

    return validPositions;
  }

  // Get valid attack targets with enhanced range checking
  static getValidAttackTargets(unit: Unit, gameState: GameState): Unit[] {
    if (!unit.position || unit.currentHp <= 0 || unit.activated) {
      return [];
    }

    const template = getUnitTemplate(unit.templateId);
    if (!template) {
      return [];
    }

    const validTargets: Unit[] = [];

    Object.values(gameState.units).forEach((target) => {
      if (
        target.isDeployed &&
        target.currentHp > 0 &&
        target.playerId !== unit.playerId &&
        target.position
      ) {
        const distance = hexDistance(unit.position!, target.position);
        let canAttack = false;

        // Check melee range (adjacent)
        if (template.melee > 0 && distance === 1) {
          canAttack = true;
        }
        // Check ranged attack (can be in addition to melee)
        if (template.ranged > 0) {
          const maxRange = template.id === "siege_engine" ? 3 : 2; // Siege engines have longer range
          if (distance >= 1 && distance <= maxRange) {
            canAttack = true;
          }
        }

        if (canAttack) {
          validTargets.push(target);
        }
      }
    });

    return validTargets;
  }

  // Enhanced turn management
  static endTurnEnhanced(gameState: GameState): GameState {
    GameLogger.log("STATE_CHANGE", "Ending turn", {
      currentPlayer: gameState.currentPlayer,
      turn: gameState.turn,
      activationsRemaining: gameState.activationsRemaining,
    });

    try {
      // End turn already includes cleanup, but we'll do it explicitly
      let newState = cleanupDeadUnits(gameState);
      newState = endTurn(newState);

      GameLogger.log("STATE_CHANGE", "Turn ended successfully", {
        newPlayer: newState.currentPlayer,
        newTurn: newState.turn,
        newActivations: newState.activationsRemaining,
      });

      return newState;
    } catch (error) {
      GameLogger.log("ERROR", "Failed to end turn", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Victory condition checking with logging
  static checkVictoryConditions(gameState: GameState): {
    winner: string | null;
    reason: string;
  } {
    // Check during both deployment and battle phases
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

    // Check if either player has no alive units (only during battle phase)
    if (gameState.currentPhase === "battle") {
      if (player1AliveUnits.length === 0 && player2AliveUnits.length > 0) {
        GameLogger.log(
          "STATE_CHANGE",
          "Player 2 wins skirmish - Player 1 eliminated"
        );
        return { winner: "player2", reason: "Player 1 has no remaining units" };
      }

      if (player2AliveUnits.length === 0 && player1AliveUnits.length > 0) {
        GameLogger.log(
          "STATE_CHANGE",
          "Player 1 wins skirmish - Player 2 eliminated"
        );
        return { winner: "player1", reason: "Player 2 has no remaining units" };
      }
    }

    // Check if match is already won (2/3 skirmishes)
    if (gameState.matchScore.player1 >= 2) {
      GameLogger.log("STATE_CHANGE", "Player 1 wins match");
      return { winner: "player1", reason: "Won 2/3 skirmishes" };
    }

    if (gameState.matchScore.player2 >= 2) {
      GameLogger.log("STATE_CHANGE", "Player 2 wins match");
      return { winner: "player2", reason: "Won 2/3 skirmishes" };
    }

    return { winner: null, reason: "" };
  }

  // Auto deployment functionality
  static autoDeployUnits(playerId: string, gameState: GameState): GameState {
    if (gameState.currentPhase !== "deployment") {
      throw new Error("Can only auto-deploy during deployment phase");
    }

    if (gameState.currentPlayer !== playerId) {
      throw new Error("Not your turn to deploy");
    }

    let newState = { ...gameState };
    const unitsToAutoDeploy = Object.values(newState.units).filter(
      (unit) =>
        unit.isInReserves && unit.playerId === playerId && unit.currentHp > 0
    );

    // Get all available deployment positions
    const availablePositions: HexPosition[] = [];
    for (let q = 0; q < gameState.boardSize.width; q++) {
      for (let r = 0; r < gameState.boardSize.height; r++) {
        const position = { q, r };
        const posKey = positionToKey(position);

        const occupyingUnit = Object.values(newState.units).find(
          (u) =>
            u.position &&
            positionToKey(u.position) === posKey &&
            u.isDeployed &&
            u.currentHp > 0
        );

        if (
          !occupyingUnit &&
          isInDeploymentZone(position, playerId, newState)
        ) {
          availablePositions.push(position);
        }
      }
    }

    // Shuffle positions for variety
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [
        availablePositions[j],
        availablePositions[i],
      ];
    }

    // Deploy units up to max deployment limit or available positions
    const maxDeployments = Math.min(
      unitsToAutoDeploy.length,
      availablePositions.length,
      5
    );
    let deployedCount = 0;

    for (let i = 0; i < maxDeployments; i++) {
      const unit = unitsToAutoDeploy[i];
      const position = availablePositions[i];

      try {
        newState = this.deployUnitEnhanced(unit.id, position, newState);
        deployedCount++;
      } catch (error) {
        GameLogger.log("ERROR", "Auto-deployment failed for unit", {
          unitId: unit.id,
          error,
        });
        break;
      }
    }

    GameLogger.log(
      "DEPLOYMENT",
      `Auto-deployed ${deployedCount} units for ${playerId}`
    );
    return newState;
  }

  // Basic AI auto-move functionality
  static suggestMove(
    playerId: string,
    gameState: GameState
  ): {
    unitId: string;
    action: "move" | "attack";
    target: HexPosition | string;
  } | null {
    if (
      gameState.currentPhase !== "battle" ||
      gameState.currentPlayer !== playerId
    ) {
      return null;
    }

    // Get all available units that can act
    const availableUnits = Object.values(gameState.units).filter(
      (unit) =>
        unit.playerId === playerId &&
        unit.isDeployed &&
        !unit.activated &&
        unit.currentHp > 0
    );

    if (availableUnits.length === 0) {
      return null;
    }

    // Simple AI strategy: prioritize attacking over moving
    for (const unit of availableUnits) {
      const attackTargets = this.getValidAttackTargets(unit, gameState);
      if (attackTargets.length > 0) {
        // Attack the weakest enemy
        const weakestTarget = attackTargets.reduce((weakest, target) =>
          target.currentHp < weakest.currentHp ? target : weakest
        );
        return {
          unitId: unit.id,
          action: "attack",
          target: weakestTarget.id,
        };
      }
    }

    // If no attacks available, move towards enemies
    for (const unit of availableUnits) {
      const movePositions = this.getValidMovementPositions(unit, gameState);
      if (movePositions.length > 0) {
        // Move towards center or enemy units
        const enemyUnits = Object.values(gameState.units).filter(
          (u) =>
            u.playerId !== playerId &&
            u.isDeployed &&
            u.currentHp > 0 &&
            u.position
        );

        if (enemyUnits.length > 0 && unit.position) {
          // Find position that gets us closer to an enemy
          let bestPosition = movePositions[0];
          let bestDistance = Infinity;

          for (const position of movePositions) {
            const avgDistanceToEnemies =
              enemyUnits.reduce(
                (sum, enemy) => sum + hexDistance(position, enemy.position!),
                0
              ) / enemyUnits.length;

            if (avgDistanceToEnemies < bestDistance) {
              bestDistance = avgDistanceToEnemies;
              bestPosition = position;
            }
          }

          return {
            unitId: unit.id,
            action: "move",
            target: bestPosition,
          };
        }
      }
    }

    return null;
  }

  // Execute AI-suggested move
  static executeAIMove(playerId: string, gameState: GameState): GameState {
    const suggestion = this.suggestMove(playerId, gameState);
    if (!suggestion) {
      GameLogger.log("AI", "No valid moves available for AI");
      return gameState;
    }

    try {
      let newState = gameState;

      if (suggestion.action === "move") {
        newState = this.moveUnitEnhanced(
          suggestion.unitId,
          suggestion.target as HexPosition,
          gameState
        );
        GameLogger.log("AI", `AI moved unit ${suggestion.unitId}`, {
          target: suggestion.target,
        });
      } else if (suggestion.action === "attack") {
        newState = this.executeCombat(
          suggestion.unitId,
          suggestion.target as string,
          gameState
        );
        GameLogger.log("AI", `AI attacked with unit ${suggestion.unitId}`, {
          target: suggestion.target,
        });
      }

      return newState;
    } catch (error) {
      GameLogger.log("ERROR", "AI move execution failed", {
        suggestion,
        error,
      });
      return gameState;
    }
  }
}
