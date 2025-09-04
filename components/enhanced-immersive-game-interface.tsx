"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { GameState, HexPosition, Unit } from "../lib/game-types";
import { HexGrid } from "./hex-grid";
import { EnhancedDiceCombat } from "./enhanced-dice-combat";
import { getUnitTemplate } from "../lib/unit-templates";
import { positionToKey } from "../lib/hex-utils";
import { isInDeploymentZone } from "../lib/game-state-manager";
import { EnhancedGameManager, GameLogger } from "../lib/enhanced-game-logic";
import { Sword, Shield, Heart, Zap, Users, MapPin, Target, Move, AlertCircle, Info, RotateCcw, Eye, ChevronUp, ChevronDown, Home, Settings, Trophy, Clock, X, Maximize2, Minimize2, Play, SkipForward, RefreshCw, Cpu, ChevronLeft, ChevronRight, EyeOff, List, Activity } from "lucide-react";

interface EnhancedImmersiveGameInterfaceProps {
  gameState: GameState;
  onGameStateChange: (newState: GameState) => void;
  switchPlayer?: () => void;
  readyToStart?: () => boolean;
  onStartBattle?: () => void;
}

type ActionMode = "select" | "move_attack" | "deploy";

export function EnhancedImmersiveGameInterface({ gameState, onGameStateChange, switchPlayer, readyToStart, onStartBattle }: EnhancedImmersiveGameInterfaceProps) {
  // UI State
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<HexPosition | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>("select");
  const [error, setError] = useState<string>("");
  const [showCombatDialog, setShowCombatDialog] = useState(false);
  const [combatTarget, setCombatTarget] = useState<Unit | null>(null);
  const [showAttackRange, setShowAttackRange] = useState(false);

  // Enhanced UI State
  const [showTopLeftToolbar, setShowTopLeftToolbar] = useState(true);
  const [showTopRightToolbar, setShowTopRightToolbar] = useState(true);
  const [showBottomLeftToolbar, setShowBottomLeftToolbar] = useState(true);
  const [showSideCombat, setShowSideCombat] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [autoMoveEnabled, setAutoMoveEnabled] = useState(false);
  const [diceResult, setDiceResult] = useState<any>(null);
  const [showDiceAnimation, setShowDiceAnimation] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showArmy, setShowArmy] = useState(true);
  const [moveHistory, setMoveHistory] = useState<Array<{ unitId: string; fromPosition: HexPosition; toPosition: HexPosition }>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(gameState.currentPhase === "deployment" ? "army" : "actions");

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const otherPlayer = gameState.players[gameState.currentPlayer === "player1" ? "player2" : "player1"];

  const deployedUnits = Object.values(gameState.units).filter((unit) => unit.isDeployed && unit.playerId === gameState.currentPlayer && unit.currentHp > 0);
  const reserveUnits = Object.values(gameState.units).filter((unit) => unit.isInReserves && unit.playerId === gameState.currentPlayer && unit.currentHp > 0);

  // Check if both players are ready to start battle
  const bothPlayersReady = readyToStart ? readyToStart() : false;

  // Show reserves during both deployment and battle phases
  // During battle, reserves can still be deployed using activations
  const showReserves = gameState.currentPhase === "deployment" || gameState.currentPhase === "battle";

  // Enhanced task description based on current state
  const getCurrentTaskDescription = () => {
    if (gameState.currentPhase === "deployment") {
      if (bothPlayersReady) {
        return '🚀 Both players ready! Click "Start Battle" to begin.';
      }
      if (reserveUnits.length === 0) {
        const otherPlayerUnits = Object.values(gameState.units).filter((unit) => unit.isInReserves && unit.playerId !== gameState.currentPlayer && unit.currentHp > 0);
        if (otherPlayerUnits.length > 0) {
          return '⏳ Waiting for other player to deploy units. Click "Switch Player" to let them deploy.';
        }
        return '🚀 Ready to start battle! Click "Start Battle" to begin.';
      }
      if (selectedUnit?.isInReserves) {
        return `🪖 Click on a deployment zone hex to deploy ${getUnitTemplate(selectedUnit.templateId)?.name}`;
      }
      if (selectedUnit?.isDeployed) {
        return "♻️ Unit deployed. You can undeploy it or select another unit.";
      }
      return "🎯 Select a unit from the Army tab to auto-deploy, or use Auto Deploy";
    }

    if (gameState.currentPhase === "battle") {
      if (gameState.activationsRemaining === 0) {
        return "⏭️ No activations left. End your turn to continue.";
      }
      if (selectedUnit?.activated) {
        return "✅ Unit already used this turn. Select another unit or end turn.";
      }
      if (selectedUnit && !selectedUnit.activated && selectedUnit.isDeployed && selectedUnit.currentHp > 0) {
        if (actionMode === "move_attack") {
          return "🎯 Click empty hex to move, or enemy unit to attack";
        }
        return '⚔️ Unit ready for action. Click "Move & Attack" to begin.';
      }
      if (selectedUnit?.isInReserves) {
        return `🪖 Click on a deployment zone hex to deploy ${getUnitTemplate(selectedUnit.templateId)?.name} (costs 1 activation)`;
      }
      
      // Check if player has no deployed units but has reserves
      if (deployedUnits.length === 0 && reserveUnits.length > 0) {
        return "🚨 All deployed units lost! Select a unit from reserves to deploy and continue fighting.";
      }
      
      if (deployedUnits.filter((u) => !u.activated && u.currentHp > 0).length === 0) {
        if (reserveUnits.length > 0) {
          return "😴 All deployed units activated. Deploy reserves or end turn.";
        }
        return "😴 All units activated. End turn to continue.";
      }
      return "🎮 Select one of your active units to move or attack";
    }

    return "🤔 Waiting for action...";
  };

  // Auto-deployment function
  const autoDeployAll = useCallback(() => {
    if (gameState.currentPhase !== "deployment") return;

    try {
      const newState = EnhancedGameManager.autoDeployUnits(gameState.currentPlayer, gameState);
      onGameStateChange(newState);
      GameLogger.log("DEPLOYMENT", "Auto-deployed units successfully");
      setError("Units auto-deployed successfully!");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Auto-deployment failed");
      GameLogger.log("ERROR", "Auto-deployment failed", { error });
    }
  }, [gameState, onGameStateChange]);

  // Auto AI move function for battle phase
  const performAutoAIMove = useCallback(() => {
    if (gameState.currentPhase !== "battle" || gameState.activationsRemaining === 0) return;

    try {
      // Find first available unit that can act
      const availableUnits = Object.values(gameState.units).filter((unit) => unit.playerId === gameState.currentPlayer && unit.isDeployed && unit.currentHp > 0 && !unit.activated);

      if (availableUnits.length === 0) {
        // End turn if no units available
        try {
          const newState = EnhancedGameManager.endTurnEnhanced(gameState);
          onGameStateChange(newState);
        } catch (error) {
          setError("Failed to end turn");
        }
        return;
      }

      const unit = availableUnits[0];

      // Try to attack first, then move
      const attackTargets = EnhancedGameManager.getValidAttackTargets(unit, gameState);
      if (attackTargets.length > 0) {
        setSelectedUnit(unit);
        setCombatTarget(attackTargets[0]);
        setShowSideCombat(true);
        return;
      }

      // If no attack available, try to move
      const movePositions = EnhancedGameManager.getValidMovementPositions(unit, gameState);
      if (movePositions.length > 0) {
        const randomPosition = movePositions[Math.floor(Math.random() * movePositions.length)];
        try {
          const fromPosition = unit.position;
          const newState = EnhancedGameManager.moveUnitEnhanced(unit.id, randomPosition, gameState);

          if (fromPosition) {
            setMoveHistory((prev) => [...prev, { unitId: unit.id, fromPosition, toPosition: randomPosition }]);
          }

          onGameStateChange(newState);
        } catch (error) {
          setError("Failed to move unit");
        }
        return;
      }

      // If unit can't do anything, mark as activated
      const newState = { ...gameState };
      newState.units[unit.id] = { ...unit, activated: true };
      newState.activationsRemaining = Math.max(0, newState.activationsRemaining - 1);
      onGameStateChange(newState);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Auto move failed");
    }
  }, [gameState, onGameStateChange, setMoveHistory]);

  // Victory condition checking with proper game end - Single Battle Format
  useEffect(() => {
    const victory = EnhancedGameManager.checkVictoryConditions(gameState);
    if (victory.winner && gameState.currentPhase !== "match-end") {
      // End the game immediately
      const newState = EnhancedGameManager.endGame(gameState, victory.winner);
      GameLogger.log("STATE_CHANGE", `Game ended: ${victory.winner} wins`, { 
        reason: victory.reason,
        totalTurns: newState.turn
      });
      onGameStateChange(newState);
    }
  }, [gameState, onGameStateChange]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Reset active tab when player or phase changes
  useEffect(() => {
    const newActiveTab = gameState.currentPhase === "deployment" ? "army" : "actions";
    setActiveTab(newActiveTab);
    GameLogger.log("STATE_CHANGE", "Tab reset due to game state change", { 
      phase: gameState.currentPhase, 
      player: gameState.currentPlayer, 
      newTab: newActiveTab 
    });
  }, [gameState.currentPlayer, gameState.currentPhase]);

  // Get valid positions based on current action mode
  const getValidPositions = (): HexPosition[] => {
    if (!selectedUnit) return [];

    if (actionMode === "deploy") {
      const validPositions: HexPosition[] = [];
      for (let q = 0; q < gameState.boardSize.width; q++) {
        for (let r = 0; r < gameState.boardSize.height; r++) {
          const position = { q, r };
          const posKey = positionToKey(position);

          const occupyingUnit = Object.values(gameState.units).find((u) => u.position && positionToKey(u.position) === posKey && u.isDeployed && u.currentHp > 0);

          if (!occupyingUnit && isInDeploymentZone(position, selectedUnit.playerId, gameState)) {
            validPositions.push(position);
          }
        }
      }
      return validPositions;
    }

    if (actionMode === "move_attack" && selectedUnit.position && !selectedUnit.activated && gameState.activationsRemaining > 0) {
      const movePositions = EnhancedGameManager.getValidMovementPositions(selectedUnit, gameState);
      const attackTargets = EnhancedGameManager.getValidAttackTargets(selectedUnit, gameState);
      const attackPositions = attackTargets.map((target) => target.position).filter(Boolean) as HexPosition[];

      return [...movePositions, ...attackPositions];
    }

    return [];
  };

  const getAttackRangePositions = (): HexPosition[] => {
    if (!selectedUnit || !showAttackRange || !selectedUnit.position || selectedUnit.activated) return [];

    const attackTargets = EnhancedGameManager.getValidAttackTargets(selectedUnit, gameState);
    return attackTargets.map((target) => target.position).filter(Boolean) as HexPosition[];
  };

  const getMovementRangePositions = (): HexPosition[] => {
    if (!selectedUnit || !showAttackRange || !selectedUnit.position || selectedUnit.activated) return [];

    return EnhancedGameManager.getValidMovementPositions(selectedUnit, gameState);
  };

  const validPositions = getValidPositions();
  const attackRangePositions = getAttackRangePositions();
  const movementRangePositions = getMovementRangePositions();

  const handleHexClick = useCallback(
    (position: HexPosition) => {
      setError("");
      GameLogger.log("ACTION", "Hex clicked", { position, actionMode });

      const posKey = positionToKey(position);
      const clickedUnit = Object.values(gameState.units).find((unit) => unit.position && positionToKey(unit.position) === posKey && unit.isDeployed && unit.currentHp > 0);

      if (clickedUnit) {
        if (clickedUnit.playerId === gameState.currentPlayer) {
          setSelectedUnit(clickedUnit);
          setSelectedPosition(position);
          setActionMode("select");
          // Auto-display ranges for activatable units during battle phase
          const shouldShowRanges = gameState.currentPhase === "battle" && 
                                   !clickedUnit.activated && 
                                   gameState.activationsRemaining > 0;
          setShowAttackRange(shouldShowRanges);
          GameLogger.log("ACTION", "Selected own unit", { unitId: clickedUnit.id, showRanges: shouldShowRanges });
        } else if (selectedUnit && !selectedUnit.activated && gameState.activationsRemaining > 0 && gameState.currentPhase === "battle") {
          // Allow combat if we have a selected unit during battle phase, regardless of action mode
          const validTargets = EnhancedGameManager.getValidAttackTargets(selectedUnit, gameState);
          const canAttackTarget = validTargets.some((target) => target.id === clickedUnit.id);

          if (canAttackTarget) {
            setCombatTarget(clickedUnit);
            setShowSideCombat(true);
            GameLogger.log("ACTION", "Initiated combat", {
              attackerId: selectedUnit.id,
              defenderId: clickedUnit.id,
            });
          } else {
            setError("Enemy unit is out of attack range or you cannot attack this turn");
          }
        } else {
          // View enemy unit info
          setSelectedUnit(clickedUnit);
          setSelectedPosition(position);
          setActionMode("select");
          setShowAttackRange(false);
          GameLogger.log("ACTION", "Viewing enemy unit", { unitId: clickedUnit.id });
        }
      } else {
        // Empty hex clicked
        if (actionMode === "deploy" && selectedUnit?.isInReserves) {
          handleDeploy(selectedUnit.id, position);
        } else if (actionMode === "move_attack" && selectedUnit?.position && !selectedUnit.activated && gameState.activationsRemaining > 0) {
          handleMove(selectedUnit.id, position);
        } else if (!showSideCombat) {
          // Only clear selection if combat menu is not showing
          setSelectedPosition(position);
          setSelectedUnit(null);
        }
      }
    },
    [gameState, selectedUnit, actionMode, showSideCombat]
  );

  const handleDeploy = useCallback(
    (unitId: string, position: HexPosition) => {
      try {
        const newState = EnhancedGameManager.deployUnitEnhanced(unitId, position, gameState);
        onGameStateChange(newState);
        setSelectedUnit(null);
        setActionMode("select");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to deploy unit");
      }
    },
    [gameState, onGameStateChange]
  );

  const handleUndeploy = useCallback(
    (unitId: string) => {
      try {
        const newState = EnhancedGameManager.undeployUnit(unitId, gameState);
        onGameStateChange(newState);
        setSelectedUnit(null);
        setActionMode("select");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to undeploy unit");
      }
    },
    [gameState, onGameStateChange]
  );

  const handleMove = useCallback(
    (unitId: string, position: HexPosition) => {
      try {
        const unit = gameState.units[unitId];
        if (!unit || !unit.position) {
          throw new Error("Unit not found or not deployed");
        }

        const fromPosition = unit.position;
        const newState = EnhancedGameManager.moveUnitEnhanced(unitId, position, gameState);

        // Track movement for undo functionality
        setMoveHistory((prev) => [...prev, { unitId, fromPosition, toPosition: position }]);

        onGameStateChange(newState);
        setSelectedUnit(null);
        setActionMode("select");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to move unit");
      }
    },
    [gameState, onGameStateChange]
  );

  // Undo last movement action
  const undoLastMove = useCallback(() => {
    if (moveHistory.length === 0) {
      setError("No moves to undo");
      return;
    }

    const lastMove = moveHistory[moveHistory.length - 1];
    const unit = gameState.units[lastMove.unitId];

    if (!unit || !unit.activated) {
      setError("Cannot undo this move (unit already acted further)");
      return;
    }

    try {
      // Create new state with undone move
      const newState = { ...gameState };
      newState.units[lastMove.unitId] = {
        ...unit,
        position: lastMove.fromPosition,
        activated: false, // Allow unit to act again
      };

      // Restore activation
      newState.activationsRemaining = Math.min(3, newState.activationsRemaining + 1);

      // Remove from move history
      setMoveHistory((prev) => prev.slice(0, -1));

      onGameStateChange(newState);
      setSelectedUnit(null);
      setActionMode("select");
      GameLogger.log("ACTION", "Move undone", { unitId: lastMove.unitId });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to undo move");
    }
  }, [gameState, moveHistory, onGameStateChange]);

  const handleCombatComplete = useCallback(
    (result: any) => {
      try {
        let newState = { ...gameState };
        newState.combatLog.push(result);

        // Apply damage
        if (result.damage > 0) {
          if (result.result === "miss" && selectedUnit) {
            // Attacker takes damage on miss (melee counterattack only)
            newState.units[selectedUnit.id] = {
              ...selectedUnit,
              currentHp: Math.max(0, selectedUnit.currentHp - result.damage),
            };
          } else if (combatTarget && result.result !== "miss") {
            // Defender takes damage on hit/massive-hit
            newState.units[combatTarget.id] = {
              ...combatTarget,
              currentHp: Math.max(0, combatTarget.currentHp - result.damage),
            };
          }
        }

        // Apply morale tokens
        if (result.moraleGained > 0 && result.result === "tie" && selectedUnit && combatTarget) {
          newState.units[selectedUnit.id] = {
            ...newState.units[selectedUnit.id],
            moraleTokens: newState.units[selectedUnit.id].moraleTokens + 1,
          };
          newState.units[combatTarget.id] = {
            ...newState.units[combatTarget.id],
            moraleTokens: newState.units[combatTarget.id].moraleTokens + 1,
          };
        }

        // Mark attacker as activated and consume activation
        if (selectedUnit) {
          newState.units[selectedUnit.id] = {
            ...newState.units[selectedUnit.id],
            activated: true,
          };
        }

        newState.activationsRemaining = Math.max(0, newState.activationsRemaining - 1);

        // Clean up dead units
        newState = EnhancedGameManager.removeDeadUnits(newState);

        onGameStateChange(newState);
        setShowSideCombat(false);
        setCombatTarget(null);
        setSelectedUnit(null);
        setActionMode("select");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Combat failed");
        setShowSideCombat(false);
      }
    },
    [gameState, selectedUnit, combatTarget, onGameStateChange]
  );

  const handleEndTurn = useCallback(() => {
    try {
      const newState = EnhancedGameManager.endTurnEnhanced(gameState);
      onGameStateChange(newState);
      setSelectedUnit(null);
      setActionMode("select");
      setShowAttackRange(false);
      setMoveHistory([]); // Clear move history on turn end
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to end turn");
    }
  }, [gameState, onGameStateChange]);

  const handleStartBattle = useCallback(() => {
    if (gameState.currentPhase === "deployment" && bothPlayersReady && onStartBattle) {
      try {
        onStartBattle();
        GameLogger.log("STATE_CHANGE", "Battle phase started");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to start battle");
      }
    }
  }, [gameState.currentPhase, bothPlayersReady, onStartBattle]);

  const selectUnitForAction = useCallback((unit: Unit, mode: ActionMode) => {
    setSelectedUnit(unit);
    setActionMode(mode);
    setShowAttackRange(mode === "move_attack");
    setError("");
    GameLogger.log("ACTION", "Unit selected for action", { unitId: unit.id, mode });
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Hex Grid Background */}
        <div className="absolute inset-0 w-full h-full">
          <HexGrid 
            gameState={gameState} 
            onHexClick={handleHexClick} 
            selectedPosition={selectedPosition} 
            highlightedPositions={validPositions} 
            attackRangePositions={showAttackRange ? attackRangePositions : []} 
            movementRangePositions={showAttackRange ? movementRangePositions : []}
            showOverlays={showOverlays} 
          />
        </div>

        {/* Top Left Status Bar - Hideable */}
        {showTopLeftToolbar && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-black/70 backdrop-blur-md rounded-lg border border-amber-500/30 p-4 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">TOWERS</div>
                  <div className="text-sm text-amber-200">Turn {gameState.turn}</div>
                </div>

                <div className="w-px h-12 bg-amber-500/30"></div>

                <div className="text-center">
                  <div className={`text-xl font-bold ${gameState.currentPlayer === "player1" ? "text-red-400" : "text-blue-400"}`}>{currentPlayer.name}</div>
                  <div className="text-sm text-slate-300">{gameState.currentPhase === "deployment" ? "🪖 Deploying" : "⚔️ Battle Phase"}</div>
                </div>

                <div className="w-px h-12 bg-amber-500/30"></div>

                <div className="flex gap-3">
                  <div className="text-center bg-slate-700/50 rounded-lg px-3 py-1">
                    <div className="text-lg font-bold text-blue-400">{currentPlayer.cp}</div>
                    <div className="text-xs text-slate-300">CP</div>
                  </div>

                  <div className={`text-center rounded-lg px-3 py-1 ${gameState.activationsRemaining > 0 ? "bg-green-900/50" : "bg-red-900/50"}`}>
                    <div className={`text-lg font-bold ${gameState.activationsRemaining > 0 ? "text-green-400" : "text-red-400"}`}>{gameState.activationsRemaining}</div>
                    <div className="text-xs text-slate-300">Acts</div>
                  </div>

                  <div className="text-center bg-purple-900/50 rounded-lg px-3 py-1">
                    <div className="text-lg font-bold text-purple-400">
                      Turn {gameState.turn}
                    </div>
                    <div className="text-xs text-slate-300">Battle</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Task Indicator */}
              <div className="mt-3 bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold animate-pulse ${actionMode === "select" ? "bg-blue-600" : actionMode === "move_attack" ? "bg-green-600" : actionMode === "deploy" ? "bg-purple-600" : "bg-gray-600"}`}>{actionMode === "select" ? "👆 Select Unit" : actionMode === "move_attack" ? "🎯 Move & Attack" : actionMode === "deploy" ? "🪖 Deploying" : "Unknown"}</div>

                  <div className="text-amber-200 text-sm flex-1">{getCurrentTaskDescription()}</div>
                </div>
              </div>
            </div>

            {/* Hide/Show Toggle for Top Left */}
            <Button onClick={() => setShowTopLeftToolbar(false)} size="sm" className="mt-2 bg-slate-600/50 hover:bg-slate-500/50" title="Hide Status Bar">
              <ChevronUp size={16} />
            </Button>
          </div>
        )}

        {/* Show Top Left Toolbar Button */}
        {!showTopLeftToolbar && (
          <Button onClick={() => setShowTopLeftToolbar(true)} size="sm" className="absolute top-4 left-4 z-30 bg-slate-600/50 hover:bg-slate-500/50" title="Show Status Bar">
            <ChevronDown size={16} />
          </Button>
        )}

        {/* Top Right Quick Controls - Hideable */}
        {showTopRightToolbar && (
          <div className="absolute top-4 right-4 z-30">
            <div className="bg-black/70 backdrop-blur-md rounded-lg border border-amber-500/30 p-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => {
                        const centerEvent = new CustomEvent("centerMap");
                        window.dispatchEvent(centerEvent);
                      }}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 transition-all">
                      <Home size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Center Map</TooltipContent>
                </Tooltip>

                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-slate-500 bg-slate-700/50 hover:bg-slate-600/50" title="Game Settings">
                      <Settings size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-amber-500/30 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-amber-400">Game Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Show Overlays</label>
                        <Button 
                          onClick={() => setShowOverlays(!showOverlays)} 
                          size="sm" 
                          variant="outline" 
                          className="border-slate-500 bg-slate-700/50 hover:bg-slate-600/50"
                        >
                          {showOverlays ? <Eye size={16} /> : <EyeOff size={16} />}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Auto Move</label>
                        <Button 
                          onClick={() => setAutoMoveEnabled(!autoMoveEnabled)} 
                          size="sm" 
                          variant="outline" 
                          className={`border-slate-500 ${autoMoveEnabled ? 'bg-green-600/50 hover:bg-green-500/50' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}
                        >
                          {autoMoveEnabled ? "ON" : "OFF"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Show Army Panel</label>
                        <Button 
                          onClick={() => setShowArmy(!showArmy)} 
                          size="sm" 
                          variant="outline" 
                          className="border-slate-500 bg-slate-700/50 hover:bg-slate-600/50"
                        >
                          {showArmy ? "ON" : "OFF"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Switch Player Button */}
                {gameState.currentPhase === "deployment" && switchPlayer && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={switchPlayer} size="sm" className="bg-blue-600 hover:bg-blue-700 transition-all">
                        <Users size={16} className="mr-1" />
                        Switch
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Switch to other player for deployment</TooltipContent>
                  </Tooltip>
                )}

                {/* Start Battle Button */}
                {gameState.currentPhase === "deployment" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleStartBattle} disabled={!bothPlayersReady} size="sm" className={`font-bold transition-all ${bothPlayersReady ? "bg-green-600 hover:bg-green-700 animate-pulse" : "bg-gray-600 cursor-not-allowed opacity-50"}`}>
                        <Play size={16} className="mr-1" />
                        Start
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{bothPlayersReady ? "Start the battle!" : "Both players must deploy at least one unit"}</TooltipContent>
                  </Tooltip>
                )}

                {gameState.currentPhase === "battle" && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleEndTurn} size="sm" className="bg-red-600 hover:bg-red-700 font-bold transition-all">
                          <SkipForward size={16} className="mr-1" />
                          End Turn
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>End current turn</TooltipContent>
                    </Tooltip>

                    {/* Undo Move Button */}
                    {moveHistory.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={undoLastMove} size="sm" className="bg-yellow-600 hover:bg-yellow-700 transition-all">
                            <RotateCcw size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo last movement</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Hide/Show Toggle for Top Right - Positioned below the menu */}
            <div className="flex justify-end mt-2">
              <Button onClick={() => setShowTopRightToolbar(false)} size="sm" className="bg-slate-600/50 hover:bg-slate-500/50" title="Hide Quick Controls">
                <ChevronUp size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Show Top Right Toolbar Button */}
        {!showTopRightToolbar && (
          <Button onClick={() => setShowTopRightToolbar(true)} size="sm" className="absolute top-4 right-4 z-30 bg-slate-600/50 hover:bg-slate-500/50" title="Show Quick Controls">
            <ChevronDown size={16} />
          </Button>
        )}

        {/* Bottom Left Toolbar - New Position for Main Actions */}
        {showBottomLeftToolbar && (
          <div className="absolute bottom-4 left-4 z-30 max-w-md flex items-end">
            <div className="bg-black/70 backdrop-blur-md rounded-lg border border-amber-500/30 shadow-2xl">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-center p-2 border-b border-slate-600">
                  <TabsList className="bg-slate-700/50 h-8">
                    <TabsTrigger value="actions" className="text-xs">
                      Actions
                    </TabsTrigger>
                    <TabsTrigger value="army" className="text-xs">
                      Army
                    </TabsTrigger>
                    <TabsTrigger value="info" className="text-xs">
                      Info
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-xs">
                      Logs
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-4 max-h-96 overflow-y-auto">
                  <TabsContent value="actions" className="mt-0 space-y-3">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-amber-400">Quick Actions</h4>

                      {/* Auto Deploy - Deployment Phase */}
                      {gameState.currentPhase === "deployment" && reserveUnits.length > 0 && (
                        <Button onClick={autoDeployAll} className="w-full bg-purple-600 hover:bg-purple-700 transition-all" size="sm">
                          <RefreshCw size={16} className="mr-2" />
                          Auto Deploy
                        </Button>
                      )}

                      {/* Auto AI Move - Battle Phase */}
                      {gameState.currentPhase === "battle" && gameState.activationsRemaining > 0 && (
                        <Button onClick={performAutoAIMove} className="w-full bg-blue-600 hover:bg-blue-700 transition-all font-bold" size="sm">
                          <Cpu size={16} className="mr-2" />
                          Auto Next Move
                        </Button>
                      )}

                      {/* Unit Actions */}
                      {selectedUnit && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-slate-300">Selected Unit Actions</h5>



                          {selectedUnit.isDeployed && gameState.currentPhase === "deployment" && (
                            <Button onClick={() => handleUndeploy(selectedUnit.id)} className="w-full bg-orange-600 hover:bg-orange-700" size="sm">
                              <RotateCcw size={16} className="mr-2" />
                              Undeploy
                            </Button>
                          )}

                          {selectedUnit.isDeployed && gameState.currentPhase === "battle" && !selectedUnit.activated && gameState.activationsRemaining > 0 && (
                            <>
                              <Button onClick={() => selectUnitForAction(selectedUnit, "move_attack")} className="w-full bg-red-600 hover:bg-red-700" size="sm" disabled={actionMode === "move_attack"}>
                                <Sword size={16} className="mr-2" />
                                Move & Attack
                              </Button>

                              <Button onClick={() => setShowAttackRange(!showAttackRange)} className="w-full bg-yellow-600 hover:bg-yellow-700" size="sm" variant="outline">
                                <Target size={16} className="mr-2" />
                                {showAttackRange ? "Hide" : "Show"} Range
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="army" className="mt-0">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-amber-400">Army Status</h4>

                      {/* Current Player's Units */}
                      <div className="space-y-2">
                        <div className="text-xs text-slate-300 flex justify-between">
                          <span>Deployed Units</span>
                          <span>{deployedUnits.length}</span>
                        </div>

                        {deployedUnits.map((unit) => {
                          const template = getUnitTemplate(unit.templateId);
                          return (
                            <div key={unit.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${selectedUnit?.id === unit.id ? "bg-blue-600/30 border border-blue-400" : "bg-slate-700/30 hover:bg-slate-600/30"}`} onClick={() => setSelectedUnit(unit)}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${unit.currentHp > 0 ? (unit.activated ? "bg-yellow-400" : "bg-green-400") : "bg-red-400"}`} />
                                <span className="text-sm">{template?.name || "Unknown"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <Heart size={12} className="text-red-400" />
                                <span>
                                  {unit.currentHp}/{template?.hp || 0}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reserves */}
                      {showReserves && reserveUnits.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-300 flex justify-between">
                            <span>{gameState.currentPhase === "battle" ? "📦 Available Reserves" : "Reserves"}</span>
                            <span>{reserveUnits.length}</span>
                          </div>

                          {reserveUnits.map((unit) => {
                            const template = getUnitTemplate(unit.templateId);
                            return (
                              <div key={unit.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${selectedUnit?.id === unit.id ? "bg-purple-600/30 border border-purple-400" : "bg-slate-700/30 hover:bg-slate-600/30"}`} onClick={() => {
                                setSelectedUnit(unit);
                                // Auto-trigger deployment mode during deployment or battle phase
                                if ((gameState.currentPhase === "deployment" || gameState.currentPhase === "battle") && currentPlayer.cp >= 1) {
                                  setActionMode("deploy");
                                  GameLogger.log("ACTION", "Auto-triggered deployment mode from army tab", { unitId: unit.id, phase: gameState.currentPhase });
                                }
                              }}>
                                <div className="flex items-center gap-2">
                                  <MapPin size={12} className="text-purple-400" />
                                  <span className="text-sm">{template?.name || "Unknown"}</span>
                                </div>
                                <div className="text-xs text-slate-400">
                                  {gameState.currentPhase === "battle" ? "Deploy (1 Act)" : "Ready to Deploy"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="info" className="mt-0">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-amber-400">Selected Unit Info</h4>

                      {selectedUnit ? (
                        <div className="space-y-2">
                          {(() => {
                            const template = getUnitTemplate(selectedUnit.templateId);
                            return template ? (
                              <div className="space-y-2">
                                <div className="text-lg font-bold text-white">{template.name}</div>
                                <div className="text-sm text-slate-300">{template.type}</div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="bg-slate-700/30 p-2 rounded">
                                    <div className="text-xs text-slate-400">Health</div>
                                    <div className="text-red-400 font-bold">
                                      {selectedUnit.currentHp}/{template.hp}
                                    </div>
                                  </div>

                                  <div className="bg-slate-700/30 p-2 rounded">
                                    <div className="text-xs text-slate-400">Defense</div>
                                    <div className="text-blue-400 font-bold">{template.defense}</div>
                                  </div>

                                  <div className="bg-slate-700/30 p-2 rounded">
                                    <div className="text-xs text-slate-400">Attack</div>
                                    <div className="text-red-400 font-bold">{template.melee}</div>
                                  </div>

                                  <div className="bg-slate-700/30 p-2 rounded">
                                    <div className="text-xs text-slate-400">Move</div>
                                    <div className="text-green-400 font-bold">{template.move}</div>
                                  </div>
                                </div>

                                {template.keywords && template.keywords.length > 0 && (
                                  <div className="bg-amber-900/20 p-2 rounded">
                                    <div className="text-xs text-amber-300 font-semibold mb-1">Keywords</div>
                                    <div className="text-xs text-amber-200">{template.keywords.join(", ")}</div>
                                  </div>
                                )}

                                <div className="flex gap-2 text-xs">
                                  <Badge variant={selectedUnit.activated ? "destructive" : "default"}>{selectedUnit.activated ? "Activated" : "Ready"}</Badge>

                                  <Badge variant={selectedUnit.isDeployed ? "default" : "secondary"}>{selectedUnit.isDeployed ? "Deployed" : "Reserves"}</Badge>

                                  {selectedUnit.moraleTokens > 0 && (
                                    <Badge variant="outline" className="text-purple-400">
                                      {selectedUnit.moraleTokens} Morale
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400">Unit template not found</div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-slate-400">Select a unit to view details</div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="logs" className="mt-0">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-amber-400">Game Log</h4>

                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {GameLogger.getLogs()
                          .slice(-10)
                          .map((log, index) => (
                            <div key={index} className="text-xs p-1 rounded bg-slate-700/20">
                              <span className="text-slate-400">[{log.timestamp}]</span>
                              <span className={`ml-1 ${log.type === "ERROR" ? "text-red-400" : log.type === "COMBAT" ? "text-yellow-400" : log.type === "DEPLOYMENT" ? "text-green-400" : "text-slate-300"}`}>{log.message}</span>
                            </div>
                          ))}
                      </div>

                      <Button onClick={() => setShowLogs(!showLogs)} size="sm" variant="outline" className="w-full">
                        <List size={14} className="mr-2" />
                        {showLogs ? "Hide" : "Show"} Detailed Logs
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Hide/Show Toggle for Bottom Left - Positioned at bottom right */}
            <Button onClick={() => setShowBottomLeftToolbar(false)} size="sm" className="ml-2 mb-0 bg-slate-600/50 hover:bg-slate-500/50" title="Hide Toolbar">
              <ChevronLeft size={16} />
            </Button>
          </div>
        )}

        {/* Show Bottom Left Toolbar Button */}
        {!showBottomLeftToolbar && (
          <Button onClick={() => setShowBottomLeftToolbar(true)} size="sm" className="absolute bottom-4 left-4 z-30 bg-slate-600/50 hover:bg-slate-500/50" title="Show Toolbar">
            <ChevronRight size={16} />
          </Button>
        )}

        {/* Side Combat Overlay */}
        {showSideCombat && selectedUnit && combatTarget && (
          <div className="absolute right-4 top-20 bottom-4 w-96 z-40">
            <EnhancedDiceCombat
              attacker={selectedUnit}
              defender={combatTarget}
              gameState={gameState}
              onCombatComplete={handleCombatComplete}
              onCancel={() => {
                setShowSideCombat(false);
                setCombatTarget(null);
              }}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
