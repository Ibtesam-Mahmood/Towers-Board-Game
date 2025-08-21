
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { GameState, HexPosition, Unit } from '../lib/game-types';
import { HexGrid } from './hex-grid';
import { getUnitTemplate } from '../lib/unit-templates';
import { positionToKey, hexDistance, isValidPosition } from '../lib/hex-utils';
import { canAttack, resolveCombat } from '../lib/combat-system';
import { deployUnit, moveUnit, endTurn, isInDeploymentZone } from '../lib/game-state-manager';
import { Sword, Shield, Heart, Zap, Users, MapPin, Target, Move, AlertCircle, Info } from 'lucide-react';

interface GameInterfaceProps {
  gameState: GameState;
  onGameStateChange: (newState: GameState) => void;
}

export function GameInterface({ gameState, onGameStateChange }: GameInterfaceProps) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<HexPosition | null>(null);
  const [combatTarget, setCombatTarget] = useState<Unit | null>(null);
  const [showCombatDialog, setShowCombatDialog] = useState(false);
  const [actionMode, setActionMode] = useState<'select' | 'move' | 'attack' | 'deploy'>('select');
  const [error, setError] = useState<string>('');

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const deployedUnits = Object.values(gameState.units).filter(
    unit => unit.isDeployed && unit.playerId === gameState.currentPlayer
  );
  const reserveUnits = Object.values(gameState.units).filter(
    unit => unit.isInReserves && unit.playerId === gameState.currentPlayer
  );

  // Get valid positions for current action
  const getValidPositions = (): HexPosition[] => {
    if (!selectedUnit) return [];
    
    const validPositions: HexPosition[] = [];
    const template = getUnitTemplate(selectedUnit.templateId);
    
    if (!template) return [];

    for (let q = 0; q < gameState.boardSize.width; q++) {
      for (let r = 0; r < gameState.boardSize.height; r++) {
        const position = { q, r };
        const posKey = positionToKey(position);
        
        // Check if position is occupied
        const occupyingUnit = Object.values(gameState.units).find(
          u => u.position && positionToKey(u.position) === posKey && u.isDeployed
        );

        if (actionMode === 'deploy') {
          // For deployment, check deployment zones and empty positions
          if (!occupyingUnit && isInDeploymentZone(position, selectedUnit.playerId, gameState)) {
            validPositions.push(position);
          }
        } else if (actionMode === 'move' && selectedUnit.position) {
          // For movement, check range and empty positions
          const distance = hexDistance(selectedUnit.position, position);
          if (!occupyingUnit && distance <= template.move && distance > 0) {
            validPositions.push(position);
          }
        } else if (actionMode === 'attack' && selectedUnit.position) {
          // For attacks, check for enemy units in range
          if (occupyingUnit && occupyingUnit.playerId !== selectedUnit.playerId) {
            const distance = hexDistance(selectedUnit.position, position);
            const meleeRange = template.melee ? 1 : 0;
            const rangedRange = template.ranged ? 3 : 0; // Assume max ranged range of 3
            
            if (distance <= Math.max(meleeRange, rangedRange)) {
              validPositions.push(position);
            }
          }
        }
      }
    }
    
    return validPositions;
  };

  const validPositions = getValidPositions();

  const handleHexClick = useCallback((position: HexPosition) => {
    setError(''); // Clear any previous errors
    
    const posKey = positionToKey(position);
    const clickedUnit = Object.values(gameState.units).find(
      unit => unit.position && positionToKey(unit.position) === posKey && unit.isDeployed
    );

    if (clickedUnit) {
      if (clickedUnit.playerId === gameState.currentPlayer) {
        // Select own unit
        setSelectedUnit(clickedUnit);
        setSelectedPosition(position);
        setActionMode('select');
      } else if (actionMode === 'attack' && selectedUnit) {
        // Attack enemy unit
        setCombatTarget(clickedUnit);
        setShowCombatDialog(true);
      } else {
        // Clicking enemy unit in select mode shows info
        setSelectedUnit(clickedUnit);
        setSelectedPosition(position);
        setActionMode('select');
      }
    } else {
      // Empty hex clicked
      if (actionMode === 'deploy' && selectedUnit?.isInReserves) {
        deployUnitToPosition(selectedUnit.id, position);
      } else if (actionMode === 'move' && selectedUnit?.position) {
        moveUnitToPosition(selectedUnit.id, position);
      } else {
        setSelectedPosition(position);
      }
    }
  }, [gameState, selectedUnit, actionMode]);

  const deployUnitToPosition = (unitId: string, position: HexPosition) => {
    try {
      const newState = deployUnit(unitId, position, gameState);
      onGameStateChange(newState);
      setSelectedUnit(null);
      setActionMode('select');
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to deploy unit');
    }
  };

  const moveUnitToPosition = (unitId: string, position: HexPosition) => {
    try {
      const newState = moveUnit(unitId, position, gameState);
      onGameStateChange(newState);
      setSelectedUnit(null);
      setActionMode('select');
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to move unit');
    }
  };

  const handleEndTurn = () => {
    try {
      const newState = endTurn(gameState);
      onGameStateChange(newState);
      setSelectedUnit(null);
      setActionMode('select');
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to end turn');
    }
  };

  const selectUnitForAction = (unit: Unit, mode: 'move' | 'attack' | 'deploy') => {
    setSelectedUnit(unit);
    setActionMode(mode);
    setError('');
  };

  const handleCombat = () => {
    if (!selectedUnit || !combatTarget) return;

    try {
      const isRanged = !!(selectedUnit.position && combatTarget.position && 
        hexDistance(selectedUnit.position, combatTarget.position) > 1);
      
      const combatResult = resolveCombat(
        selectedUnit.id,
        combatTarget.id,
        gameState,
        isRanged
      );

      // Update game state based on combat result
      const newState = { ...gameState };
      newState.combatLog.push(combatResult);

      // Apply damage
      if (combatResult.damage > 0) {
        if (combatResult.result === 'miss') {
          // Attacker takes damage
          newState.units[selectedUnit.id] = {
            ...selectedUnit,
            currentHp: Math.max(0, selectedUnit.currentHp - combatResult.damage)
          };
        } else {
          // Defender takes damage
          newState.units[combatTarget.id] = {
            ...combatTarget,
            currentHp: Math.max(0, combatTarget.currentHp - combatResult.damage)
          };
        }
      }

      // Apply morale tokens
      if (combatResult.moraleGained > 0 && combatResult.result === 'tie') {
        newState.units[selectedUnit.id] = {
          ...newState.units[selectedUnit.id],
          moraleTokens: newState.units[selectedUnit.id].moraleTokens + 1
        };
        newState.units[combatTarget.id] = {
          ...newState.units[combatTarget.id],
          moraleTokens: newState.units[combatTarget.id].moraleTokens + 1
        };
      }

      // Mark attacker as activated
      newState.units[selectedUnit.id] = {
        ...newState.units[selectedUnit.id],
        activated: true
      };

      // Use activation
      newState.activationsRemaining--;

      onGameStateChange(newState);
      setShowCombatDialog(false);
      setCombatTarget(null);
      setSelectedUnit(null);

    } catch (error) {
      console.error('Combat error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="p-4 space-y-4">
        {/* Enhanced Header with Current Action */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-amber-400">TOWERS</h1>
              <div className="flex gap-4 items-center mt-1">
                <p className="text-slate-200 text-lg">
                  Turn {gameState.turn} - {currentPlayer.name}
                </p>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  actionMode === 'select' ? 'bg-blue-600' :
                  actionMode === 'move' ? 'bg-green-600' :
                  actionMode === 'attack' ? 'bg-red-600' :
                  actionMode === 'deploy' ? 'bg-purple-600' : 'bg-gray-600'
                }`}>
                  {actionMode === 'select' ? '👆 Select Unit' :
                   actionMode === 'move' ? '🚶 Moving Unit' :
                   actionMode === 'attack' ? '⚔️ Attacking' :
                   actionMode === 'deploy' ? '🪖 Deploying' : 'Unknown'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 items-center">
              <div className="text-center bg-slate-700/50 rounded-lg p-2">
                <div className="text-2xl font-bold text-blue-400">{currentPlayer.cp}</div>
                <div className="text-xs text-slate-300">Command Points</div>
              </div>
              
              <div className="text-center bg-slate-700/50 rounded-lg p-2">
                <div className="text-2xl font-bold text-green-400">{gameState.activationsRemaining}</div>
                <div className="text-xs text-slate-300">Activations Left</div>
              </div>
              
              <Button onClick={handleEndTurn} size="lg" className="bg-red-600 hover:bg-red-700">
                End Turn
              </Button>
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mt-3 bg-red-900/50 border border-red-600 rounded p-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-red-200">{error}</span>
            </div>
          )}
          
          {/* Current Action Instruction */}
          <div className="mt-3 bg-slate-700/50 rounded p-2">
            <div className="text-sm text-slate-300">
              <strong>Phase:</strong> {gameState.currentPhase} | 
              <strong> Skirmish:</strong> {gameState.currentSkirmish} | 
              <strong> Score:</strong> {gameState.matchScore.player1} - {gameState.matchScore.player2}
            </div>
            
            {selectedUnit && (
              <div className="mt-1 text-amber-200">
                <strong>Selected:</strong> {getUnitTemplate(selectedUnit.templateId)?.name} 
                {actionMode === 'deploy' && ' - Click on a highlighted hex to deploy'}
                {actionMode === 'move' && ' - Click on a highlighted hex to move'}
                {actionMode === 'attack' && ' - Click on an enemy unit to attack'}
                {actionMode === 'select' && ' - Choose an action below'}
              </div>
            )}
            
            {!selectedUnit && (
              <div className="mt-1 text-slate-300">
                {gameState.currentPhase === 'deployment' 
                  ? 'Click on a reserve unit to deploy it, or a deployed unit to select it'
                  : 'Click on one of your units to select it and see available actions'
                }
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Main Battlefield - Much Larger */}
          <div className="col-span-4">
            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-400 text-xl">Battlefield</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[700px]">
                  <HexGrid
                    gameState={gameState}
                    onHexClick={handleHexClick}
                    selectedPosition={selectedPosition}
                    highlightedPositions={validPositions}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compact Side Panel */}
          <div className="space-y-4">
            {/* Action Buttons for Selected Unit */}
            {selectedUnit && selectedUnit.playerId === gameState.currentPlayer && (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-amber-400 text-sm flex items-center gap-1">
                    <Target size={16} />
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {gameState.currentPhase === 'deployment' && selectedUnit.isInReserves && (
                    <Button
                      onClick={() => selectUnitForAction(selectedUnit, 'deploy')}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="sm"
                    >
                      Deploy Unit
                    </Button>
                  )}
                  
                  {gameState.currentPhase === 'battle' && selectedUnit.isDeployed && !selectedUnit.activated && (
                    <>
                      <Button
                        onClick={() => selectUnitForAction(selectedUnit, 'move')}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Move size={14} className="mr-1" />
                        Move Unit
                      </Button>
                      <Button
                        onClick={() => selectUnitForAction(selectedUnit, 'attack')}
                        className="w-full bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        <Sword size={14} className="mr-1" />
                        Attack
                      </Button>
                    </>
                  )}
                  
                  <Button
                    onClick={() => setActionMode('select')}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Cancel Action
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="units" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                <TabsTrigger value="units" className="text-xs">Units</TabsTrigger>
                <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
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
                      deployedUnits.map(unit => (
                        <CompactUnitCard 
                          key={unit.id} 
                          unit={unit} 
                          isSelected={!!selectedUnit && selectedUnit.id === unit.id}
                          onClick={() => {
                            setSelectedUnit(unit);
                            setActionMode('select');
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
                      {reserveUnits.map(unit => (
                        <CompactUnitCard 
                          key={unit.id} 
                          unit={unit} 
                          isReserve 
                          isSelected={!!selectedUnit && selectedUnit.id === unit.id}
                          onClick={() => {
                            setSelectedUnit(unit);
                            setActionMode(gameState.currentPhase === 'deployment' ? 'deploy' : 'select');
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
                  <CardContent>
                    {selectedUnit ? (
                      <SelectedUnitInfo unit={selectedUnit} />
                    ) : (
                      <p className="text-slate-400 text-xs text-center py-4">No unit selected</p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Recent Combat Log */}
                {gameState.combatLog.length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-amber-400 text-sm">Recent Combat</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 max-h-[200px] overflow-y-auto">
                      {gameState.combatLog.slice(-3).reverse().map(combat => (
                        <div key={combat.id} className="bg-slate-700/50 rounded p-2 text-xs">
                          <div className="font-semibold mb-1 text-amber-300">
                            {combat.result === 'hit' ? '🎯 Hit!' : 
                             combat.result === 'miss' ? '❌ Miss!' : '🤝 Tie!'}
                          </div>
                          <div className="text-slate-300">
                            ATK: {combat.attackerValue + combat.attackerRoll} vs DEF: {combat.defenderValue + combat.defenderRoll}
                          </div>
                          {combat.damage > 0 && (
                            <div className="text-red-400">
                              -{combat.damage} HP
                            </div>
                          )}
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

      {/* Combat Dialog */}
      {showCombatDialog && selectedUnit && combatTarget && (
        <CombatDialog
          attacker={selectedUnit}
          defender={combatTarget}
          gameState={gameState}
          onConfirm={handleCombat}
          onCancel={() => setShowCombatDialog(false)}
        />
      )}
    </div>
  );
}

// Compact unit card for the side panel
function CompactUnitCard({ 
  unit, 
  isSelected = false, 
  isReserve = false, 
  onClick 
}: { 
  unit: Unit; 
  isSelected?: boolean; 
  isReserve?: boolean;
  onClick?: () => void;
}) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return null;

  const hpPercent = unit.currentHp / template.hp;
  
  return (
    <div 
      className={`bg-slate-700/50 rounded p-2 border cursor-pointer transition-colors hover:bg-slate-600/50 ${
        isSelected ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-600'
      } ${isReserve ? 'opacity-70' : ''} ${unit.activated ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-xs truncate">{template.name}</h4>
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-red-400">⚔{template.melee || '-'}</span>
            <span className="text-blue-400">🏹{template.ranged || '-'}</span>
            <span className="text-green-400">🛡{template.defense}</span>
          </div>
        </div>
        <div className="ml-2">
          <Badge variant={hpPercent > 0.5 ? 'default' : 'destructive'} className="text-xs px-1 py-0">
            {unit.currentHp}/{template.hp}
          </Badge>
        </div>
      </div>
      
      <div className="flex gap-1 mt-1">
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
      </div>
    </div>
  );
}

function SelectedUnitInfo({ unit }: { unit: Unit }) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return null;

  const hpPercent = unit.currentHp / template.hp;

  return (
    <div className="space-y-2">
      <div>
        <h3 className="font-bold text-sm text-white">{template.name}</h3>
        <p className="text-slate-400 text-xs">{template.type}</p>
      </div>
      
      {/* Combat Stats */}
      <div className="bg-slate-700/50 rounded p-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-red-400">{template.melee || '-'}</div>
            <div className="text-xs text-slate-400">Melee</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">{template.ranged || '-'}</div>
            <div className="text-xs text-slate-400">Ranged</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">{template.defense}</div>
            <div className="text-xs text-slate-400">Defense</div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-slate-700/50 rounded p-2 space-y-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span>HP:</span>
            <span className={hpPercent > 0.5 ? 'text-green-400' : 'text-red-400'}>
              {unit.currentHp}/{template.hp}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Move:</span>
            <span className="text-blue-400">{template.move}</span>
          </div>
          <div className="flex justify-between">
            <span>Supply:</span>
            <span className="text-purple-400">{template.supply}</span>
          </div>
          <div className="flex justify-between">
            <span>Cost:</span>
            <span className="text-yellow-400">{template.cost}</span>
          </div>
        </div>
        
        {/* Status Effects */}
        <div className="flex gap-1 flex-wrap">
          {unit.moraleTokens > 0 && (
            <Badge variant="secondary" className="bg-orange-600 text-xs">
              😰 Morale: {unit.moraleTokens}
            </Badge>
          )}
          {!unit.inSupply && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ Out of Supply
            </Badge>
          )}
          {unit.activated && (
            <Badge variant="secondary" className="bg-gray-600 text-xs">
              ✓ Activated
            </Badge>
          )}
          {unit.isInReserves && (
            <Badge variant="secondary" className="bg-blue-600 text-xs">
              📦 In Reserve
            </Badge>
          )}
        </div>
      </div>
      
      {/* Special Ability */}
      <div className="bg-slate-700/50 rounded p-2">
        <div className="text-xs font-semibold text-amber-400 mb-1">Special Ability</div>
        <div className="text-xs text-slate-300 leading-relaxed">{template.abilityDescription}</div>
      </div>
    </div>
  );
}

function CombatDialog({ 
  attacker, 
  defender, 
  gameState, 
  onConfirm, 
  onCancel 
}: {
  attacker: Unit;
  defender: Unit;
  gameState: GameState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const attackerTemplate = getUnitTemplate(attacker.templateId);
  const defenderTemplate = getUnitTemplate(defender.templateId);
  
  if (!attackerTemplate || !defenderTemplate) return null;

  // Determine attack type based on distance
  const isRanged = attacker.position && defender.position && 
    hexDistance(attacker.position, defender.position) > 1;
  
  const attackValue = isRanged ? (attackerTemplate.ranged || 0) : (attackerTemplate.melee || 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800 border-slate-600 w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-400 text-center text-lg">
            ⚔️ Combat Resolution
          </CardTitle>
          <p className="text-slate-300 text-sm text-center">
            {isRanged ? '🏹 Ranged Attack' : '⚔️ Melee Attack'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Attacker */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <h4 className="font-bold text-blue-400 text-center mb-2">Attacker</h4>
              <div className="text-center">
                <div className="font-bold text-white text-sm">{attackerTemplate.name}</div>
                <div className="text-slate-300 text-xs mb-2">{attackerTemplate.type}</div>
                <div className="bg-slate-600 rounded p-2">
                  <div className="text-2xl font-bold text-red-400">{attackValue}</div>
                  <div className="text-xs text-slate-300">Attack</div>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  HP: {attacker.currentHp}/{attackerTemplate.hp}
                </div>
              </div>
            </div>
            
            {/* Defender */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <h4 className="font-bold text-red-400 text-center mb-2">Defender</h4>
              <div className="text-center">
                <div className="font-bold text-white text-sm">{defenderTemplate.name}</div>
                <div className="text-slate-300 text-xs mb-2">{defenderTemplate.type}</div>
                <div className="bg-slate-600 rounded p-2">
                  <div className="text-2xl font-bold text-green-400">{defenderTemplate.defense}</div>
                  <div className="text-xs text-slate-300">Defense</div>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  HP: {defender.currentHp}/{defenderTemplate.hp}
                </div>
              </div>
            </div>
          </div>
          
          {/* Combat Preview */}
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="text-sm text-amber-300 mb-2">Combat Preview</div>
            <div className="text-xs text-slate-300">
              Roll 1d6 + {attackValue} vs 1d6 + {defenderTemplate.defense}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Winner deals 1 damage. Ties give both units morale tokens.
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold">
              ⚔️ Attack!
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1 border-slate-500">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
