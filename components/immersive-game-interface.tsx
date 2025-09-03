"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { GameState, HexPosition, Unit } from "../lib/game-types";
import { HexGrid } from "./hex-grid";
import { EnhancedDiceCombat } from "./enhanced-dice-combat";
import { UnitTooltip, TerrainTooltip } from "./enhanced-tooltip-system";
import { getUnitTemplate } from "../lib/unit-templates";
import { positionToKey } from "../lib/hex-utils";
import { isInDeploymentZone } from "../lib/game-state-manager";
import { EnhancedGameManager, GameLogger } from "../lib/enhanced-game-logic";
import { Sword, Shield, Heart, Zap, Users, MapPin, Target, Move, AlertCircle, Info, RotateCcw, Eye, ChevronUp, ChevronDown, Home, Settings, Trophy, Clock } from "lucide-react";

interface ImmersiveGameInterfaceProps {
  gameState: GameState;
  onGameStateChange: (newState: GameState) => void;
}

type ActionMode = "select" | "move_attack" | "deploy";

export function ImmersiveGameInterface({ gameState, onGameStateChange }: ImmersiveGameInterfaceProps) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<HexPosition | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>("select");
  const [error, setError] = useState<string>("");
  const [showCombatDialog, setShowCombatDialog] = useState(false);
  const [combatTarget, setCombatTarget] = useState<Unit | null>(null);
  const [showAttackRange, setShowAttackRange] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const otherPlayer = gameState.players[gameState.currentPlayer === "player1" ? "player2" : "player1"];

  const deployedUnits = Object.values(gameState.units).filter((unit) => unit.isDeployed && unit.playerId === gameState.currentPlayer && unit.currentHp > 0);
  const reserveUnits = Object.values(gameState.units).filter((unit) => unit.isInReserves && unit.playerId === gameState.currentPlayer && unit.currentHp > 0);

  // Auto-deployment function
  const autoDeployAll = useCallback(() => {
    if (gameState.currentPhase !== "deployment") return;

    let newState = { ...gameState };
    const unitsToAutoDeploy = Object.values(newState.units).filter((unit) => unit.isInReserves && unit.playerId === gameState.currentPlayer && unit.currentHp > 0);

    // Get all available deployment positions
    const availablePositions: HexPosition[] = [];
    for (let q = 0; q < gameState.boardSize.width; q++) {
      for (let r = 0; r < gameState.boardSize.height; r++) {
        const position = { q, r };
        const posKey = positionToKey(position);

        const occupyingUnit = Object.values(newState.units).find((u) => u.position && positionToKey(u.position) === posKey && u.isDeployed && u.currentHp > 0);

        if (!occupyingUnit && isInDeploymentZone(position, gameState.currentPlayer, newState)) {
          availablePositions.push(position);
        }
      }
    }

    // Deploy units to available positions (up to max deployment limit)
    let deployedCount = 0;
    const maxDeployments = Math.min(unitsToAutoDeploy.length, availablePositions.length, 5);

    for (let i = 0; i < maxDeployments; i++) {
      const unit = unitsToAutoDeploy[i];
      const position = availablePositions[i];

      try {
        newState = EnhancedGameManager.deployUnitEnhanced(unit.id, position, newState);
        deployedCount++;
      } catch (error) {
        GameLogger.log("ERROR", "Auto-deployment failed for unit", { unitId: unit.id, error });
        break;
      }
    }

    if (deployedCount > 0) {
      onGameStateChange(newState);
      GameLogger.log("DEPLOYMENT", `Auto-deployed ${deployedCount} units`);
    }
  }, [gameState, onGameStateChange]);

  // Check for victory conditions and handle game end
  useEffect(() => {
    const victory = EnhancedGameManager.checkVictoryConditions(gameState);
    if (victory.winner) {
      const newState = { ...gameState };
      newState.currentPhase = "match-end";
      newState.matchScore[victory.winner as "player1" | "player2"]++;
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

  // Get valid positions based on current action mode with enhanced logic
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

  const validPositions = getValidPositions();
  const attackRangePositions = getAttackRangePositions();

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
          setShowAttackRange(false);
          GameLogger.log("ACTION", "Selected own unit", { unitId: clickedUnit.id });
        } else if (selectedUnit && !selectedUnit.activated && gameState.activationsRemaining > 0 && gameState.currentPhase === "battle") {
          // Allow combat if we have a selected unit during battle phase, regardless of action mode
          const validTargets = EnhancedGameManager.getValidAttackTargets(selectedUnit, gameState);
          const canAttackTarget = validTargets.some((target) => target.id === clickedUnit.id);

          if (canAttackTarget) {
            setCombatTarget(clickedUnit);
            setShowCombatDialog(true);
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
        } else {
          setSelectedPosition(position);
        }
      }
    },
    [gameState, selectedUnit, actionMode]
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
        const newState = EnhancedGameManager.moveUnitEnhanced(unitId, position, gameState);
        onGameStateChange(newState);
        setSelectedUnit(null);
        setActionMode("select");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to move unit");
      }
    },
    [gameState, onGameStateChange]
  );

  const handleCombatComplete = useCallback(
    (result: any) => {
      try {
        let newState = { ...gameState };
        newState.combatLog.push(result);

        // Apply damage
        if (result.damage > 0) {
          if (result.result === "miss" && selectedUnit) {
            // Attacker takes damage
            newState.units[selectedUnit.id] = {
              ...selectedUnit,
              currentHp: Math.max(0, selectedUnit.currentHp - result.damage),
            };
          } else if (combatTarget) {
            // Defender takes damage
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
        setShowCombatDialog(false);
        setCombatTarget(null);
        setSelectedUnit(null);
        setActionMode("select");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Combat failed");
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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to end turn");
    }
  }, [gameState, onGameStateChange]);

  const selectUnitForAction = useCallback((unit: Unit, mode: ActionMode) => {
    setSelectedUnit(unit);
    setActionMode(mode);
    setShowAttackRange(mode === "move_attack");
    setError("");
    GameLogger.log("ACTION", "Unit selected for action", { unitId: unit.id, mode });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Immersive Battlefield Background */}
      <div className="absolute inset-0 w-full h-full">
        <HexGrid gameState={gameState} onHexClick={handleHexClick} selectedPosition={selectedPosition} highlightedPositions={validPositions} attackRangePositions={showAttackRange ? attackRangePositions : []} />
      </div>

      {/* Floating UI Elements */}

      {/* Top Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-amber-500/50 p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">TOWERS</div>
              <div className="text-sm text-amber-200">Turn {gameState.turn}</div>
            </div>

            <div className="w-px h-12 bg-amber-500/30"></div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${gameState.currentPlayer === "player1" ? "text-red-400" : "text-blue-400"}`}>{currentPlayer.name}</div>
              <div className="text-sm text-slate-300">{gameState.currentPhase === "deployment" ? "🪖 Deploying" : "⚔️ Battle Phase"}</div>
            </div>

            <div className="w-px h-12 bg-amber-500/30"></div>

            <div className="flex gap-4">
              <div className="text-center bg-slate-700/50 rounded-lg px-3 py-2">
                <div className="text-xl font-bold text-blue-400">{currentPlayer.cp}</div>
                <div className="text-xs text-slate-300">CP</div>
              </div>

              <div className={`text-center rounded-lg px-3 py-2 ${gameState.activationsRemaining > 0 ? "bg-green-900/50" : "bg-red-900/50"}`}>
                <div className={`text-xl font-bold ${gameState.activationsRemaining > 0 ? "text-green-400" : "text-red-400"}`}>{gameState.activationsRemaining}</div>
                <div className="text-xs text-slate-300">Acts</div>
              </div>
            </div>
          </div>

          {/* Action Mode Indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${actionMode === "select" ? "bg-blue-600" : actionMode === "move_attack" ? "bg-green-600" : actionMode === "deploy" ? "bg-purple-600" : "bg-gray-600"}`}>{actionMode === "select" ? "👆 Select Unit" : actionMode === "move_attack" ? "🎯 Move & Attack" : actionMode === "deploy" ? "🪖 Deploying" : "Unknown"}</div>

            {selectedUnit && (
              <div className="text-amber-200 text-sm">
                <strong>{getUnitTemplate(selectedUnit.templateId)?.name}</strong>
                {selectedUnit.activated && " (Already used)"}
                {selectedUnit.currentHp <= 0 && " (Dead)"}
              </div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-amber-500/50 p-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                // Center the map properly
                const centerEvent = new CustomEvent("centerMap");
                window.dispatchEvent(centerEvent);
              }}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
              title="Center Map">
              <Home size={16} />
            </Button>

            <Button onClick={() => setShowGameMenu(!showGameMenu)} size="sm" variant="outline" className="border-slate-500">
              <Settings size={16} />
            </Button>

            <Button onClick={handleEndTurn} size="sm" className="bg-red-600 hover:bg-red-700 font-bold">
              End Turn
            </Button>
          </div>

          {showGameMenu && (
            <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-sm rounded-lg border border-amber-500/50 p-3 min-w-48">
              <div className="space-y-2">
                <div className="text-amber-400 font-bold text-sm">Match Score</div>
                <div className="flex justify-between text-sm">
                  <span>Player 1:</span>
                  <span className="text-red-400 font-bold">{gameState.matchScore.player1}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Player 2:</span>
                  <span className="text-blue-400 font-bold">{gameState.matchScore.player2}</span>
                </div>
                <div className="border-t border-slate-600 pt-2">
                  <Button onClick={() => setShowLogs(!showLogs)} size="sm" variant="outline" className="w-full border-slate-500">
                    {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Game Logs
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 bg-red-900/90 backdrop-blur-sm border border-red-600 rounded-lg p-4 flex items-center gap-2 animate-pulse">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-red-200 font-medium">{error}</span>
        </div>
      )}

      {/* Side Panel for Units */}
      <div className="absolute top-4 right-4 bottom-4 w-80 z-20 bg-black/80 backdrop-blur-sm rounded-lg border border-amber-500/50 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Side Panel Header */}
          <div className="p-4 border-b border-amber-500/30">
            <h2 className="text-amber-400 font-bold text-lg flex items-center gap-2">
              <Users size={18} />
              Army Command
            </h2>

            {/* Auto Deploy Button for Deployment Phase */}
            {gameState.currentPhase === "deployment" && reserveUnits.length > 0 && (
              <Button onClick={autoDeployAll} className="w-full mt-2 bg-purple-600 hover:bg-purple-700" size="sm">
                🚀 Auto Deploy All
              </Button>
            )}
          </div>

          <Tabs defaultValue="units" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700 mx-4 mt-2">
              <TabsTrigger value="units" className="text-sm">
                Units
              </TabsTrigger>
              <TabsTrigger value="info" className="text-sm">
                Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="units" className="flex-1 p-4 space-y-3 overflow-hidden">
              {/* Action Buttons for Selected Unit */}
              {selectedUnit && selectedUnit.playerId === gameState.currentPlayer && selectedUnit.currentHp > 0 && (
                <Card className="bg-slate-800/50 border-slate-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-amber-400 text-sm flex items-center gap-1">
                      <Target size={16} />
                      Unit Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {gameState.currentPhase === "deployment" && selectedUnit.isInReserves && (
                      <Button onClick={() => selectUnitForAction(selectedUnit, "deploy")} className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
                        Deploy Unit
                      </Button>
                    )}

                    {gameState.currentPhase === "deployment" && selectedUnit.isDeployed && (
                      <Button onClick={() => handleUndeploy(selectedUnit.id)} className="w-full bg-orange-600 hover:bg-orange-700" size="sm">
                        <RotateCcw size={14} className="mr-1" />
                        Undeploy
                      </Button>
                    )}

                    {gameState.currentPhase === "battle" && selectedUnit.isDeployed && !selectedUnit.activated && gameState.activationsRemaining > 0 && (
                      <div className="space-y-2">
                        <Button onClick={() => selectUnitForAction(selectedUnit, "move_attack")} className="w-full bg-green-600 hover:bg-green-700" size="sm">
                          <Move size={14} className="mr-1" />
                          Move & Attack
                        </Button>
                        <Button onClick={() => setShowAttackRange(!showAttackRange)} variant="outline" className="w-full border-slate-500" size="sm">
                          <Eye size={14} className="mr-1" />
                          {showAttackRange ? "Hide" : "Show"} Range
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setActionMode("select");
                        setShowAttackRange(false);
                        setSelectedUnit(null);
                      }}
                      variant="outline"
                      className="w-full"
                      size="sm">
                      Clear Selection
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Deployed Units */}
              <Card className="bg-slate-800/50 border-slate-600 flex-1 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-amber-400 text-sm flex items-center gap-1">
                    <Users size={14} />
                    Deployed ({deployedUnits.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-1">
                  {deployedUnits.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-4">No units deployed</p>
                  ) : (
                    deployedUnits.map((unit) => (
                      <UnitTooltip key={unit.id} unit={unit} gameState={gameState}>
                        <EnhancedUnitCard
                          unit={unit}
                          isSelected={!!selectedUnit && selectedUnit.id === unit.id}
                          onClick={() => {
                            setSelectedUnit(unit);
                            setActionMode("select");
                            setShowAttackRange(false);
                          }}
                        />
                      </UnitTooltip>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Reserve Units (only show during deployment phase) */}
              {gameState.currentPhase === "deployment" && reserveUnits.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-amber-400 text-sm">Reserves ({reserveUnits.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 max-h-[150px] overflow-y-auto">
                    {reserveUnits.map((unit) => (
                      <UnitTooltip key={unit.id} unit={unit} gameState={gameState}>
                        <EnhancedUnitCard
                          unit={unit}
                          isReserve
                          isSelected={!!selectedUnit && selectedUnit.id === unit.id}
                          onClick={() => {
                            setSelectedUnit(unit);
                            setActionMode("deploy");
                            setShowAttackRange(false);
                          }}
                        />
                      </UnitTooltip>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="info" className="flex-1 p-4 overflow-y-auto">
              {selectedUnit ? (
                <Card className="bg-slate-800/50 border-slate-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-amber-400 text-sm flex items-center gap-1">
                      <Info size={14} />
                      {getUnitTemplate(selectedUnit.templateId)?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UnitDetailedInfo unit={selectedUnit} gameState={gameState} />
                  </CardContent>
                </Card>
              ) : (
                <div className="text-slate-400 text-center py-8">
                  <Info size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Select a unit to view details</p>
                </div>
              )}

              {/* Enhanced Combat Log */}
              {gameState.combatLog.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-600 mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-amber-400 text-sm">Recent Combat</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 max-h-[200px] overflow-y-auto">
                    {gameState.combatLog
                      .slice(-5)
                      .reverse()
                      .map((combat) => (
                        <div key={combat.id} className="bg-slate-700/50 rounded p-2 text-xs">
                          <div className="font-semibold mb-1 text-amber-300">{combat.result === "massive-hit" ? "💥 Massive Hit!" : combat.result === "hit" ? "🎯 Hit!" : combat.result === "miss" ? "❌ Miss!" : "🤝 Tie!"}</div>
                          <div className="text-slate-300 grid grid-cols-2 gap-2">
                            <div>
                              ATK: {combat.attackerValue} + {combat.attackerRoll}
                            </div>
                            <div>
                              DEF: {combat.defenderValue} + {combat.defenderRoll}
                            </div>
                          </div>
                          {combat.damage > 0 && <div className="text-red-400 font-bold">💀 {combat.damage} damage</div>}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Game Logs Overlay */}
      {showLogs && (
        <div className="absolute bottom-4 left-4 right-96 z-30 bg-black/90 backdrop-blur-sm rounded-lg border border-amber-500/50 p-4 max-h-64 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-amber-400 font-bold">Game Logs</h3>
            <Button onClick={() => setShowLogs(false)} size="sm" variant="ghost" className="text-slate-400 hover:text-white">
              ✕
            </Button>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            {GameLogger.getLogs(15)
              .reverse()
              .map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className={`px-1 rounded text-xs font-mono ${log.type === "ERROR" ? "bg-red-600" : log.type === "COMBAT" ? "bg-orange-600" : log.type === "MOVEMENT" ? "bg-green-600" : log.type === "DEPLOYMENT" ? "bg-purple-600" : "bg-slate-600"}`}>{log.type}</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Enhanced Combat Dialog with Dice */}
      {showCombatDialog && selectedUnit && combatTarget && (
        <EnhancedDiceCombat
          attacker={selectedUnit}
          defender={combatTarget}
          gameState={gameState}
          onCombatComplete={handleCombatComplete}
          onCancel={() => {
            setShowCombatDialog(false);
            setCombatTarget(null);
          }}
        />
      )}
    </div>
  );
}

// Enhanced Unit Card Component
function EnhancedUnitCard({ unit, isSelected = false, isReserve = false, onClick }: { unit: Unit; isSelected?: boolean; isReserve?: boolean; onClick?: () => void }) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return null;

  const hpPercent = unit.currentHp / template.hp;
  const isDead = unit.currentHp <= 0;

  return (
    <div className={`bg-slate-700/50 rounded p-2 border cursor-pointer transition-all hover:bg-slate-600/50 ${isSelected ? "border-amber-500 ring-1 ring-amber-500" : "border-slate-600"} ${isReserve ? "opacity-70" : ""} ${unit.activated ? "opacity-50" : ""} ${isDead ? "opacity-25 grayscale" : ""}`} onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-xs truncate ${isDead ? "text-red-500 line-through" : "text-white"}`}>
            {template.name} {isDead && "☠️"}
          </h4>
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-red-400">⚔{template.melee || "-"}</span>
            <span className="text-blue-400">🏹{template.ranged || "-"}</span>
            <span className="text-green-400">🛡{template.defense}</span>
          </div>
        </div>
        <div className="ml-2">
          <Badge variant={hpPercent > 0.5 ? "default" : "destructive"} className="text-xs px-1 py-0">
            {unit.currentHp}/{template.hp}
          </Badge>
        </div>
      </div>

      <div className="flex gap-1 mt-1 flex-wrap">
        {unit.moraleTokens > 0 && (
          <Badge variant="secondary" className="bg-orange-600 text-xs px-1 py-0">
            😰{unit.moraleTokens}
          </Badge>
        )}
        {!unit.inSupply && (
          <Badge variant="destructive" className="text-xs px-1 py-0">
            ⚠️ Supply
          </Badge>
        )}
        {unit.activated && (
          <Badge variant="secondary" className="bg-gray-600 text-xs px-1 py-0">
            Used
          </Badge>
        )}
        {isDead && (
          <Badge variant="destructive" className="text-xs px-1 py-0">
            ☠️ Dead
          </Badge>
        )}
      </div>
    </div>
  );
}

function UnitDetailedInfo({ unit, gameState }: { unit: Unit; gameState: GameState }) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return null;

  const hpPercent = unit.currentHp / template.hp;
  const isDead = unit.currentHp <= 0;

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-lg font-bold text-white">
          {template.name} {isDead && "☠️"}
        </div>
        <div className="text-slate-400 text-sm">{template.type}</div>
        <div className="text-xs text-amber-300 mt-1">
          {unit.playerId === "player1" ? "Player 1" : "Player 2"} • {template.cost} points
        </div>
      </div>

      {/* Combat Stats Grid */}
      <div className="bg-slate-700/50 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-red-400">{template.melee || "-"}</div>
            <div className="text-xs text-slate-400">Melee</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">{template.ranged || "-"}</div>
            <div className="text-xs text-slate-400">Ranged</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">{template.defense}</div>
            <div className="text-xs text-slate-400">Defense</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">{template.move}</div>
            <div className="text-xs text-slate-400">Movement</div>
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="bg-slate-700/50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-300 text-sm">Health</span>
          <span className={`font-bold ${hpPercent > 0.5 ? "text-green-400" : "text-red-400"}`}>
            {unit.currentHp}/{template.hp}
          </span>
        </div>
        <div className="w-full bg-slate-600 rounded-full h-2">
          <div className={`h-full rounded-full transition-all ${hpPercent > 0.6 ? "bg-green-500" : hpPercent > 0.3 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.max(0, hpPercent * 100)}%` }} />
        </div>
      </div>

      {/* Status Effects */}
      <div className="space-y-2">
        <h4 className="text-amber-400 font-semibold text-sm">Status Effects</h4>
        <div className="flex flex-wrap gap-1">
          {unit.moraleTokens > 0 && <Badge className="bg-orange-600 text-xs">😰 Morale: {unit.moraleTokens}</Badge>}
          {!unit.inSupply && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ Out of Supply (-2 to all rolls)
            </Badge>
          )}
          {unit.activated && gameState.currentPhase === "battle" && <Badge className="bg-gray-600 text-xs">✓ Activated This Turn</Badge>}
          {isDead && (
            <Badge variant="destructive" className="text-xs">
              ☠️ Eliminated
            </Badge>
          )}
        </div>
      </div>

      {/* Special Ability */}
      <div className="bg-slate-700/50 rounded-lg p-3">
        <h4 className="text-amber-400 font-semibold mb-1 text-sm flex items-center gap-1">
          <Zap size={14} />
          Special Ability
        </h4>
        <p className="text-slate-300 text-xs leading-relaxed">{template.abilityDescription}</p>
      </div>

      {/* Keywords */}
      {template.keywords && template.keywords.length > 0 && (
        <div>
          <h4 className="text-amber-400 font-semibold mb-1 text-sm">Keywords</h4>
          <div className="flex flex-wrap gap-1">
            {template.keywords.map((keyword) => (
              <Badge key={keyword} variant="outline" className="text-xs border-amber-500 text-amber-300">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
