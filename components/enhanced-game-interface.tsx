"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { GameState, HexPosition, Unit } from "../lib/game-types";
import { HexGrid } from "./hex-grid";
import { getUnitTemplate } from "../lib/unit-templates";
import { positionToKey, hexDistance } from "../lib/hex-utils";
import { isInDeploymentZone, cleanupDeadUnits } from "../lib/game-state-manager";
import { EnhancedGameManager, GameLogger } from "../lib/enhanced-game-logic";
import { Sword, Shield, Heart, Zap, Users, MapPin, Target, Move, AlertCircle, Info, RotateCcw, Eye, ChevronUp, ChevronDown } from "lucide-react";

interface EnhancedGameInterfaceProps {
  gameState: GameState;
  onGameStateChange: (newState: GameState) => void;
}

type ActionMode = "select" | "move_attack" | "deploy";

export function EnhancedGameInterface({ gameState, onGameStateChange }: EnhancedGameInterfaceProps) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<HexPosition | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>("select");
  const [error, setError] = useState<string>("");
  const [showCombatDialog, setShowCombatDialog] = useState(false);
  const [combatTarget, setCombatTarget] = useState<Unit | null>(null);
  const [showAttackRange, setShowAttackRange] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [animatingCombat, setAnimatingCombat] = useState(false);
  const [lastCombatResult, setLastCombatResult] = useState<any>(null);

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const deployedUnits = Object.values(gameState.units).filter((unit) => unit.isDeployed && unit.playerId === gameState.currentPlayer && unit.currentHp > 0);
  const reserveUnits = Object.values(gameState.units).filter((unit) => unit.isInReserves && unit.playerId === gameState.currentPlayer && unit.currentHp > 0);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Get valid positions based on current action mode
  const getValidPositions = (): HexPosition[] => {
    if (!selectedUnit) return [];

    if (actionMode === "deploy") {
      const validPositions: HexPosition[] = [];
      for (let q = 0; q < gameState.boardSize.width; q++) {
        for (let r = 0; r < gameState.boardSize.height; r++) {
          const position = { q, r };
          const posKey = positionToKey(position);

          // Check if position is occupied by alive unit
          const occupyingUnit = Object.values(gameState.units).find((u) => u.position && positionToKey(u.position) === posKey && u.isDeployed && u.currentHp > 0);

          if (!occupyingUnit && isInDeploymentZone(position, selectedUnit.playerId, gameState)) {
            validPositions.push(position);
          }
        }
      }
      return validPositions;
    }

    if (actionMode === "move_attack" && selectedUnit.position) {
      // Fire Emblem style: show both movement and attack positions
      const movePositions = EnhancedGameManager.getValidMovementPositions(selectedUnit, gameState);
      const attackPositions: HexPosition[] = [];

      // Get attack positions from current location
      const attackTargets = EnhancedGameManager.getValidAttackTargets(selectedUnit, gameState);
      attackTargets.forEach((target) => {
        if (target.position) {
          attackPositions.push(target.position);
        }
      });

      // Also show potential attack positions from movement destinations
      movePositions.forEach((movePos) => {
        const tempUnit = { ...selectedUnit, position: movePos };
        const targetsFromPos = EnhancedGameManager.getValidAttackTargets(tempUnit, gameState);
        targetsFromPos.forEach((target) => {
          if (target.position && !attackPositions.some((pos) => pos.q === target.position!.q && pos.r === target.position!.r)) {
            attackPositions.push(target.position);
          }
        });
      });

      return [...movePositions, ...attackPositions];
    }

    return [];
  };

  // Get attack range positions for highlighting
  const getAttackRangePositions = (): HexPosition[] => {
    if (!selectedUnit || !showAttackRange) return [];

    const template = getUnitTemplate(selectedUnit.templateId);
    if (!template) return [];

    const positions: HexPosition[] = [];
    const unitPos = selectedUnit.position;
    if (!unitPos) return [];

    for (let q = 0; q < gameState.boardSize.width; q++) {
      for (let r = 0; r < gameState.boardSize.height; r++) {
        const pos = { q, r };
        const distance = hexDistance(unitPos, pos);

        if ((template.melee > 0 && distance === 1) || (template.ranged > 0 && distance >= 1 && distance <= (template.id === "siege_engine" ? 3 : 2))) {
          positions.push(pos);
        }
      }
    }

    return positions;
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
          // Select own unit
          setSelectedUnit(clickedUnit);
          setSelectedPosition(position);
          setActionMode("select");
          setShowAttackRange(false);
          GameLogger.log("ACTION", "Selected own unit", { unitId: clickedUnit.id });
        } else if (selectedUnit && !selectedUnit.activated && gameState.activationsRemaining > 0 && gameState.currentPhase === "battle") {
          // Allow combat if we have a selected unit during battle phase, regardless of action mode
          const canAttackDirectly = EnhancedGameManager.getValidAttackTargets(selectedUnit, gameState).some((target) => target.id === clickedUnit.id);

          if (canAttackDirectly) {
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
        } else if (actionMode === "move_attack" && selectedUnit?.position) {
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

  const handleCombat = useCallback(async () => {
    if (!selectedUnit || !combatTarget) return;

    setAnimatingCombat(true);
    try {
      const newState = EnhancedGameManager.executeCombat(selectedUnit.id, combatTarget.id, gameState);

      // Get the combat result for animation
      const combatResult = newState.combatLog[newState.combatLog.length - 1];
      setLastCombatResult(combatResult);

      // Animate the result
      setTimeout(() => {
        // Clean up dead units immediately after combat
        const cleanState = cleanupDeadUnits(newState);
        onGameStateChange(cleanState);
        setShowCombatDialog(false);
        setCombatTarget(null);
        setSelectedUnit(null);
        setActionMode("select");
        setAnimatingCombat(false);
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Combat failed");
      setAnimatingCombat(false);
    }
  }, [selectedUnit, combatTarget, gameState, onGameStateChange]);

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
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="p-4 space-y-4">
          {/* Enhanced Header */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-amber-400">TOWERS</h1>
                <div className="flex gap-4 items-center mt-1">
                  <p className="text-slate-200 text-lg">
                    Turn {gameState.turn} - {currentPlayer.name}
                  </p>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${actionMode === "select" ? "bg-blue-600" : actionMode === "move_attack" ? "bg-green-600" : actionMode === "deploy" ? "bg-purple-600" : "bg-gray-600"}`}>{actionMode === "select" ? "👆 Select Unit" : actionMode === "move_attack" ? "🎯 Move & Attack" : actionMode === "deploy" ? "🪖 Deploying" : "Unknown"}</div>
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center bg-slate-700/50 rounded-lg p-2 cursor-help">
                      <div className="text-2xl font-bold text-blue-400">{currentPlayer.cp}</div>
                      <div className="text-xs text-slate-300">Command Points</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Command Points are used for special abilities and command cards</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`text-center bg-slate-700/50 rounded-lg p-2 cursor-help ${gameState.activationsRemaining <= 0 ? "bg-red-900/50" : ""}`}>
                      <div className={`text-2xl font-bold ${gameState.activationsRemaining > 0 ? "text-green-400" : "text-red-400"}`}>{gameState.activationsRemaining}</div>
                      <div className="text-xs text-slate-300">Activations Left</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of unit activations remaining this turn</p>
                  </TooltipContent>
                </Tooltip>

                <Button onClick={handleEndTurn} size="lg" className="bg-red-600 hover:bg-red-700">
                  End Turn
                </Button>

                <Button onClick={() => setShowLogs(!showLogs)} size="sm" variant="outline" className="border-slate-500">
                  {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Logs
                </Button>
              </div>
            </div>

            {/* Error Display with enhanced styling */}
            {error && (
              <div className="mt-3 bg-red-900/50 border border-red-600 rounded p-2 flex items-center gap-2 animate-pulse">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-red-200">{error}</span>
              </div>
            )}

            {/* Enhanced Action Instructions */}
            <div className="mt-3 bg-slate-700/50 rounded p-2">
              <div className="text-sm text-slate-300">
                <strong>Phase:</strong> {gameState.currentPhase} |<strong> Skirmish:</strong> {gameState.currentSkirmish} |<strong> Score:</strong> {gameState.matchScore.player1} - {gameState.matchScore.player2}
              </div>

              {selectedUnit && (
                <div className="mt-1 text-amber-200">
                  <strong>Selected:</strong> {getUnitTemplate(selectedUnit.templateId)?.name}
                  {actionMode === "deploy" && " - Click on a blue highlighted hex to deploy"}
                  {actionMode === "move_attack" && " - Click to move (green) or attack (red). Movement and attack are combined."}
                  {actionMode === "select" && " - Choose an action below or click another unit"}
                  {selectedUnit.activated && " ⏸️ (Already used this turn)"}
                  {selectedUnit.currentHp <= 0 && " ☠️ (Dead)"}
                </div>
              )}
            </div>

            {/* Log Display */}
            {showLogs && (
              <div className="mt-3 bg-slate-800/50 rounded p-2 max-h-32 overflow-y-auto">
                <div className="text-xs text-slate-300 space-y-1">
                  {GameLogger.getLogs(10)
                    .reverse()
                    .map((log, idx) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className={`px-1 rounded text-xs font-mono ${log.type === "ERROR" ? "bg-red-600" : log.type === "COMBAT" ? "bg-orange-600" : log.type === "MOVEMENT" ? "bg-green-600" : log.type === "DEPLOYMENT" ? "bg-purple-600" : "bg-slate-600"}`}>{log.type}</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-4">
            {/* Main Battlefield */}
            <div className="col-span-4">
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-amber-400 text-xl">Battlefield</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[700px] relative">
                    <HexGrid gameState={gameState} onHexClick={handleHexClick} selectedPosition={selectedPosition} highlightedPositions={validPositions} attackRangePositions={showAttackRange ? attackRangePositions : []} />

                    {/* Combat Animation Overlay */}
                    {animatingCombat && lastCombatResult && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
                        <div className="bg-slate-800 border border-amber-500 rounded-lg p-6 text-center">
                          <div className="text-2xl font-bold mb-2">{lastCombatResult.result === "hit" ? "🎯 HIT!" : lastCombatResult.result === "massive-hit" ? "💥 MASSIVE HIT!" : lastCombatResult.result === "miss" ? "❌ MISS!" : "🤝 TIE!"}</div>
                          {lastCombatResult.damage > 0 && <div className="text-red-400 text-lg font-bold">-{lastCombatResult.damage} HP</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Side Panel */}
            <div className="space-y-4">
              {/* Action Buttons for Selected Unit */}
              {selectedUnit && selectedUnit.playerId === gameState.currentPlayer && selectedUnit.currentHp > 0 && (
                <Card className="bg-slate-800/50 border-slate-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-amber-400 text-sm flex items-center gap-1">
                      <Target size={16} />
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {gameState.currentPhase === "deployment" && selectedUnit.isInReserves && (
                      <div className="space-y-2">
                        <Button onClick={() => selectUnitForAction(selectedUnit, "deploy")} className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
                          Deploy Unit
                        </Button>
                      </div>
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
                      Cancel Action
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="units" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger value="units" className="text-xs">
                    Units
                  </TabsTrigger>
                  <TabsTrigger value="info" className="text-xs">
                    Info
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="units" className="space-y-2">
                  {/* Deployed Units */}
                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-amber-400 text-sm flex items-center gap-1">
                        <Users size={14} />
                        Deployed ({deployedUnits.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 max-h-[200px] overflow-y-auto">
                      {deployedUnits.length === 0 ? (
                        <p className="text-slate-400 text-xs text-center py-4">No units deployed</p>
                      ) : (
                        deployedUnits.map((unit) => (
                          <EnhancedUnitCard
                            key={unit.id}
                            unit={unit}
                            isSelected={!!selectedUnit && selectedUnit.id === unit.id}
                            onClick={() => {
                              setSelectedUnit(unit);
                              setActionMode("select");
                              setShowAttackRange(false);
                            }}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Reserve Units */}
                  {reserveUnits.length > 0 && (
                    <Card className="bg-slate-800/50 border-slate-600">
                      <CardHeader className="pb-1">
                        <CardTitle className="text-amber-400 text-sm">Reserves ({reserveUnits.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 max-h-[200px] overflow-y-auto">
                        {reserveUnits.map((unit) => (
                          <EnhancedUnitCard
                            key={unit.id}
                            unit={unit}
                            isReserve
                            isSelected={!!selectedUnit && selectedUnit.id === unit.id}
                            onClick={() => {
                              setSelectedUnit(unit);
                              setActionMode(gameState.currentPhase === "deployment" ? "deploy" : "select");
                              setShowAttackRange(false);
                            }}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="info">
                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-amber-400 text-sm flex items-center gap-1">
                        <Info size={14} />
                        Unit Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent>{selectedUnit ? <EnhancedUnitInfo unit={selectedUnit} gameState={gameState} /> : <p className="text-slate-400 text-xs text-center py-4">No unit selected</p>}</CardContent>
                  </Card>

                  {/* Enhanced Combat Log */}
                  {gameState.combatLog.length > 0 && (
                    <Card className="bg-slate-800/50 border-slate-600">
                      <CardHeader className="pb-1">
                        <CardTitle className="text-amber-400 text-sm">Recent Combat</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 max-h-[200px] overflow-y-auto">
                        {gameState.combatLog
                          .slice(-3)
                          .reverse()
                          .map((combat) => (
                            <div key={combat.id} className="bg-slate-700/50 rounded p-2 text-xs">
                              <div className="font-semibold mb-1 text-amber-300">{combat.result === "massive-hit" ? "💥 Massive Hit!" : combat.result === "hit" ? "🎯 Hit!" : combat.result === "miss" ? "❌ Miss!" : "🤝 Tie!"}</div>
                              <div className="text-slate-300">
                                ATK: {combat.attackerValue} + {combat.attackerRoll} = {combat.attackerValue + combat.attackerRoll}
                              </div>
                              <div className="text-slate-300">
                                DEF: {combat.defenderValue} + {combat.defenderRoll} = {combat.defenderValue + combat.defenderRoll}
                              </div>
                              {combat.damage > 0 && <div className="text-red-400 font-bold">💀 {combat.damage} damage dealt</div>}
                              {combat.specialEffects.length > 0 && <div className="text-purple-400 text-xs mt-1">✨ {combat.specialEffects.join(", ")}</div>}
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Enhanced Combat Dialog */}
        {showCombatDialog && selectedUnit && combatTarget && !animatingCombat && (
          <EnhancedCombatDialog
            attacker={selectedUnit}
            defender={combatTarget}
            gameState={gameState}
            onConfirm={handleCombat}
            onCancel={() => {
              setShowCombatDialog(false);
              setCombatTarget(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// Enhanced Unit Card Component
function EnhancedUnitCard({ unit, isSelected = false, isReserve = false, onClick }: { unit: Unit; isSelected?: boolean; isReserve?: boolean; onClick?: () => void }) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return null;

  const hpPercent = unit.currentHp / template.hp;
  const isDead = unit.currentHp <= 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-bold">{template.name}</div>
            <div className="text-sm">{template.type}</div>
            <div className="text-xs">{template.abilityDescription}</div>
            {isDead && <div className="text-red-400 font-bold">This unit is dead!</div>}
            {unit.activated && !isDead && <div className="text-orange-400">Already activated this turn</div>}
            {unit.moraleTokens > 0 && <div className="text-orange-400">Suffering from low morale</div>}
            {!unit.inSupply && <div className="text-red-400">Out of supply - gains morale tokens</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Enhanced Unit Info Component
function EnhancedUnitInfo({ unit, gameState }: { unit: Unit; gameState: GameState }) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return null;

  const hpPercent = unit.currentHp / template.hp;
  const isDead = unit.currentHp <= 0;
  const attackTargets = EnhancedGameManager.getValidAttackTargets(unit, gameState);
  const movePositions = EnhancedGameManager.getValidMovementPositions(unit, gameState);

  return (
    <div className="space-y-2">
      <div>
        <h3 className={`font-bold text-sm ${isDead ? "text-red-500 line-through" : "text-white"}`}>
          {template.name} {isDead && "☠️"}
        </h3>
        <p className="text-slate-400 text-xs">{template.type}</p>
      </div>

      {/* Combat Stats */}
      <div className="bg-slate-700/50 rounded p-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Tooltip>
            <TooltipTrigger>
              <div className="cursor-help">
                <div className="text-lg font-bold text-red-400">{template.melee || "-"}</div>
                <div className="text-xs text-slate-400">Melee</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Melee attack value (adjacent combat)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <div className="cursor-help">
                <div className="text-lg font-bold text-blue-400">{template.ranged || "-"}</div>
                <div className="text-xs text-slate-400">Ranged</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ranged attack value (1-2 hex range)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <div className="cursor-help">
                <div className="text-lg font-bold text-green-400">{template.defense}</div>
                <div className="text-xs text-slate-400">Defense</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Defense value against attacks</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Status */}
      <div className="bg-slate-700/50 rounded p-2 space-y-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex justify-between cursor-help">
                <span>HP:</span>
                <span className={hpPercent > 0.5 ? "text-green-400" : "text-red-400"}>
                  {unit.currentHp}/{template.hp}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current / Maximum Hit Points</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <div className="flex justify-between cursor-help">
                <span>Move:</span>
                <span className="text-blue-400">{template.move}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Movement range in hexes</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Enhanced Status Effects with tooltips */}
        <div className="flex gap-1 flex-wrap">
          {unit.moraleTokens > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="bg-orange-600 text-xs cursor-help">
                  😰 Morale: {unit.moraleTokens}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Morale tokens: {unit.moraleTokens}</p>
                <p>Units with 3+ tokens must pass morale checks</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!unit.inSupply && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive" className="text-xs cursor-help">
                  ⚠️ Out of Supply
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This unit is out of supply!</p>
                <p>-2 to defense and gains morale tokens each turn</p>
              </TooltipContent>
            </Tooltip>
          )}

          {unit.activated && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="bg-gray-600 text-xs cursor-help">
                  ✓ Activated
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This unit has already acted this turn</p>
              </TooltipContent>
            </Tooltip>
          )}

          {unit.isInReserves && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="bg-blue-600 text-xs cursor-help">
                  📦 In Reserve
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This unit is in reserves and can be deployed</p>
              </TooltipContent>
            </Tooltip>
          )}

          {isDead && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive" className="text-xs cursor-help">
                  ☠️ Dead
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This unit has been destroyed and cannot act</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Enhanced Tactical Info */}
      {!isDead && unit.isDeployed && (
        <div className="bg-slate-700/50 rounded p-2 space-y-1">
          <div className="text-xs font-semibold text-amber-400">Tactical Status</div>
          <div className="text-xs text-slate-300 space-y-1">
            <div>Can attack: {attackTargets.length} targets</div>
            <div>Can move to: {movePositions.length} positions</div>
            {unit.position && (
              <div>
                Position: ({unit.position.q},{unit.position.r})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Special Ability with enhanced description */}
      <div className="bg-slate-700/50 rounded p-2">
        <div className="text-xs font-semibold text-amber-400 mb-1">Special Ability</div>
        <div className="text-xs text-slate-300 leading-relaxed">{template.abilityDescription}</div>
      </div>
    </div>
  );
}

// Enhanced Combat Dialog
function EnhancedCombatDialog({ attacker, defender, gameState, onConfirm, onCancel }: { attacker: Unit; defender: Unit; gameState: GameState; onConfirm: () => void; onCancel: () => void }) {
  const attackerTemplate = getUnitTemplate(attacker.templateId);
  const defenderTemplate = getUnitTemplate(defender.templateId);

  if (!attackerTemplate || !defenderTemplate) return null;

  // Determine attack type based on distance
  const isRanged = attacker.position && defender.position && hexDistance(attacker.position, defender.position) > 1;

  const attackValue = isRanged ? attackerTemplate.ranged || 0 : attackerTemplate.melee || 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800 border-slate-600 w-full max-w-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-400 text-center text-xl">⚔️ Combat Resolution</CardTitle>
          <p className="text-slate-300 text-sm text-center">{isRanged ? "🏹 Ranged Attack" : "⚔️ Melee Attack"}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Enhanced Attacker Display */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <h4 className="font-bold text-blue-400 text-center mb-2">Attacker</h4>
              <div className="text-center space-y-2">
                <div className="font-bold text-white text-sm">{attackerTemplate.name}</div>
                <div className="text-slate-300 text-xs">{attackerTemplate.type}</div>
                <div className="bg-slate-600 rounded p-2">
                  <div className="text-3xl font-bold text-red-400">{attackValue}</div>
                  <div className="text-xs text-slate-300">{isRanged ? "Ranged" : "Melee"}</div>
                </div>
                <div className="text-xs text-slate-400">
                  HP: {attacker.currentHp}/{attackerTemplate.hp}
                </div>
                {attacker.moraleTokens > 0 && <div className="text-orange-400 text-xs">😰 Morale: {attacker.moraleTokens}</div>}
              </div>
            </div>

            {/* Enhanced Defender Display */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <h4 className="font-bold text-red-400 text-center mb-2">Defender</h4>
              <div className="text-center space-y-2">
                <div className="font-bold text-white text-sm">{defenderTemplate.name}</div>
                <div className="text-slate-300 text-xs">{defenderTemplate.type}</div>
                <div className="bg-slate-600 rounded p-2">
                  <div className="text-3xl font-bold text-green-400">{defenderTemplate.defense}</div>
                  <div className="text-xs text-slate-300">Defense</div>
                </div>
                <div className="text-xs text-slate-400">
                  HP: {defender.currentHp}/{defenderTemplate.hp}
                </div>
                {defender.moraleTokens > 0 && <div className="text-orange-400 text-xs">😰 Morale: {defender.moraleTokens}</div>}
              </div>
            </div>
          </div>

          {/* Enhanced Combat Preview */}
          <div className="bg-slate-700/30 rounded-lg p-4 text-center space-y-2">
            <div className="text-sm text-amber-300 mb-2 font-semibold">Combat Preview</div>
            <div className="text-sm text-slate-200">
              Roll 1d6 + {attackValue} vs Roll 1d6 + {defenderTemplate.defense}
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>• Win by 1-2: Deal 1 damage</div>
              <div>• Win by 3+: Deal 2 damage (Massive Hit)</div>
              <div>• Tie: Both gain morale token</div>
              <div>• Lose: You take 1 damage (counterattack)</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-lg py-3">
              ⚔️ ATTACK!
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1 border-slate-500 py-3">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
