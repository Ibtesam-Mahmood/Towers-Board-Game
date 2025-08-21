
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { GameState, Unit, CombatResult } from '../lib/game-types';
import { getUnitTemplate } from '../lib/unit-templates';
import { hexDistance } from '../lib/hex-utils';
import { calculateAttackerValue, calculateDefenderValue } from '../lib/combat-system';

interface EnhancedDiceCombatV2Props {
  attacker: Unit;
  defender: Unit;
  gameState: GameState;
  onCombatComplete: (result: CombatResult) => void;
  onCancel: () => void;
}

export function EnhancedDiceCombatV2({ 
  attacker, 
  defender, 
  gameState, 
  onCombatComplete, 
  onCancel 
}: EnhancedDiceCombatV2Props) {
  const [phase, setPhase] = useState<'preview' | 'rolling' | 'result'>('preview');
  const [attackerRoll, setAttackerRoll] = useState<number>(0);
  const [defenderRoll, setDefenderRoll] = useState<number>(0);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [diceAnimating, setDiceAnimating] = useState(false);

  const attackerTemplate = getUnitTemplate(attacker.templateId);
  const defenderTemplate = getUnitTemplate(defender.templateId);
  
  if (!attackerTemplate || !defenderTemplate) {
    onCancel();
    return null;
  }

  const isRanged = !!(attacker.position && defender.position && 
    hexDistance(attacker.position, defender.position) > 1);
  
  const attackerValue = calculateAttackerValue(attacker, defender, gameState, isRanged);
  const defenderValue = calculateDefenderValue(defender, attacker, gameState, isRanged);

  const rollDice = () => {
    setPhase('rolling');
    setDiceAnimating(true);
    
    // Simulate rolling animation
    setTimeout(() => {
      const attackerRollValue = Math.floor(Math.random() * 6) + 1;
      const defenderRollValue = Math.floor(Math.random() * 6) + 1;
      
      setAttackerRoll(attackerRollValue);
      setDefenderRoll(defenderRollValue);
      setDiceAnimating(false);
      
      // Calculate result
      calculateResult(attackerRollValue, defenderRollValue);
    }, 1500);
  };

  const calculateResult = (attackRoll: number, defRoll: number) => {
    const totalAttacker = attackerValue + attackRoll;
    const totalDefender = defenderValue + defRoll;
    const difference = totalAttacker - totalDefender;
    
    let result: CombatResult['result'];
    let damage = 0;
    let moraleGained = 0;
    const specialEffects: string[] = [];
    
    if (difference >= 3) {
      result = 'massive-hit';
      damage = 2;
    } else if (difference >= 1) {
      result = 'hit';
      damage = 1;
    } else if (difference === 0) {
      result = 'tie';
      damage = 0;
      moraleGained = 1;
      
      // Shardbearer wins ties automatically
      if (attackerTemplate.id === 'shardbearer') {
        result = 'hit';
        damage = 1;
        moraleGained = 0;
        specialEffects.push('Shardbearer wins tie automatically');
      }
    } else {
      result = 'miss';
      damage = isRanged ? 0 : 1; // Only melee attacks have recoil damage
    }
    
    // Special effects
    if (attackerTemplate.id === 'shardbearer' && difference >= 3) {
      damage += 1;
      specialEffects.push('Shardbearer knockback +1 damage');
    }

    const finalResult: CombatResult = {
      id: `combat_${Date.now()}_${Math.random()}`,
      attackerId: attacker.id,
      defenderId: defender.id,
      attackerValue,
      defenderValue,
      attackerRoll: attackRoll,
      defenderRoll: defRoll,
      result,
      damage,
      moraleGained,
      specialEffects
    };

    setCombatResult(finalResult);
    setPhase('result');
  };

  const completeCombat = () => {
    if (combatResult) {
      onCombatComplete(combatResult);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800/90 backdrop-blur-md border-amber-500/50 w-full max-w-2xl shadow-2xl">
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-amber-400 text-2xl flex items-center justify-center gap-2">
            ⚔️ Combat Resolution
          </CardTitle>
          <p className="text-slate-300 text-sm">
            {isRanged ? '🏹 Ranged Attack' : '⚔️ Melee Combat'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {phase === 'preview' && (
            <>
              <div className="grid grid-cols-2 gap-6">
                {/* Attacker */}
                <div className="bg-gradient-to-br from-red-900/30 to-slate-700/30 rounded-lg p-4 border border-red-500/30">
                  <h4 className="font-bold text-red-400 text-center mb-3 text-lg">Attacker</h4>
                  <div className="text-center space-y-2">
                    <div className="text-2xl mb-2">
                      {attackerTemplate.type === 'Infantry' ? '🪖' :
                       attackerTemplate.type === 'Cavalry' ? '🐎' :
                       attackerTemplate.type === 'Archer' ? '🏹' :
                       attackerTemplate.type === 'Artillery' ? '🎯' : '⚔️'}
                    </div>
                    <div className="font-bold text-white">{attackerTemplate.name}</div>
                    <div className="text-slate-300 text-sm">{attackerTemplate.type}</div>
                    <div className="bg-slate-600/50 rounded-lg p-3">
                      <div className="text-3xl font-bold text-red-400">{attackerValue}</div>
                      <div className="text-sm text-slate-300">Attack Value</div>
                    </div>
                    <Badge variant={attacker.currentHp > attackerTemplate.hp / 2 ? 'default' : 'destructive'}>
                      {attacker.currentHp}/{attackerTemplate.hp} HP
                    </Badge>
                  </div>
                </div>
                
                {/* Defender */}
                <div className="bg-gradient-to-br from-blue-900/30 to-slate-700/30 rounded-lg p-4 border border-blue-500/30">
                  <h4 className="font-bold text-blue-400 text-center mb-3 text-lg">Defender</h4>
                  <div className="text-center space-y-2">
                    <div className="text-2xl mb-2">
                      {defenderTemplate.type === 'Infantry' ? '🪖' :
                       defenderTemplate.type === 'Cavalry' ? '🐎' :
                       defenderTemplate.type === 'Archer' ? '🏹' :
                       defenderTemplate.type === 'Artillery' ? '🎯' : '⚔️'}
                    </div>
                    <div className="font-bold text-white">{defenderTemplate.name}</div>
                    <div className="text-slate-300 text-sm">{defenderTemplate.type}</div>
                    <div className="bg-slate-600/50 rounded-lg p-3">
                      <div className="text-3xl font-bold text-blue-400">{defenderValue}</div>
                      <div className="text-sm text-slate-300">Defense Value</div>
                    </div>
                    <Badge variant={defender.currentHp > defenderTemplate.hp / 2 ? 'default' : 'destructive'}>
                      {defender.currentHp}/{defenderTemplate.hp} HP
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-lg p-4 text-center border border-amber-500/30">
                <div className="text-lg text-amber-300 mb-2 flex items-center justify-center gap-2">
                  🎲 Combat Mechanics
                </div>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>Both sides roll 1d6 and add their combat values</p>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p>• <span className="text-yellow-400">Hit (1-2 margin)</span>: 1 damage</p>
                      <p>• <span className="text-red-400">Massive Hit (3+ margin)</span>: 2 damage</p>
                    </div>
                    <div>
                      <p>• <span className="text-blue-400">Tie</span>: Both gain morale</p>
                      <p>• <span className="text-purple-400">Miss</span>: Attacker takes 1 damage</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={rollDice} 
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-8 py-3 text-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  🎲 ROLL FOR COMBAT!
                </Button>
                <Button 
                  onClick={onCancel} 
                  variant="outline" 
                  className="border-slate-500 bg-slate-700/50 px-8 py-3 hover:bg-slate-600/50 transition-all"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {phase === 'rolling' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-amber-400 mb-4 animate-pulse">🎲 Rolling Dice...</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {/* Attacker Dice */}
                <div className="text-center">
                  <h4 className="text-lg font-bold text-red-400 mb-4">Attacker Roll</h4>
                  <div className="flex justify-center mb-4">
                    <div className={`w-20 h-20 bg-red-500 rounded-lg flex items-center justify-center text-4xl font-bold text-white shadow-lg transition-transform ${
                      diceAnimating ? 'animate-spin' : ''
                    }`}>
                      {diceAnimating ? '🎲' : attackerRoll}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2">
                    <div className="text-xl font-bold text-red-400">{attackerValue}</div>
                    <div className="text-sm text-slate-300">Base Attack</div>
                  </div>
                </div>
                
                {/* Defender Dice */}
                <div className="text-center">
                  <h4 className="text-lg font-bold text-blue-400 mb-4">Defender Roll</h4>
                  <div className="flex justify-center mb-4">
                    <div className={`w-20 h-20 bg-blue-500 rounded-lg flex items-center justify-center text-4xl font-bold text-white shadow-lg transition-transform ${
                      diceAnimating ? 'animate-spin' : ''
                    }`}>
                      {diceAnimating ? '🎲' : defenderRoll}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2">
                    <div className="text-xl font-bold text-blue-400">{defenderValue}</div>
                    <div className="text-sm text-slate-300">Base Defense</div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-amber-300">
                {diceAnimating ? 'Rolling...' : 'Dice rolled! Calculating result...'}
              </div>
            </div>
          )}

          {phase === 'result' && combatResult && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-4 animate-bounce">
                  {combatResult.result === 'massive-hit' ? '💥 MASSIVE HIT!' :
                   combatResult.result === 'hit' ? '🎯 HIT!' : 
                   combatResult.result === 'miss' ? '❌ MISS!' : '🤝 TIE!'}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center bg-red-900/30 rounded-lg p-4 border border-red-500/50">
                  <h4 className="text-red-400 font-bold mb-2">Attacker Total</h4>
                  <div className="text-2xl font-bold text-white">
                    {attackerValue} + {attackerRoll} = <span className="text-red-400">{attackerValue + attackerRoll}</span>
                  </div>
                </div>
                
                <div className="text-center bg-blue-900/30 rounded-lg p-4 border border-blue-500/50">
                  <h4 className="text-blue-400 font-bold mb-2">Defender Total</h4>
                  <div className="text-2xl font-bold text-white">
                    {defenderValue} + {defenderRoll} = <span className="text-blue-400">{defenderValue + defenderRoll}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-lg p-4 text-center border border-amber-500/50">
                <h4 className="text-amber-300 font-bold mb-3 text-lg">Combat Result</h4>
                
                {combatResult.damage > 0 ? (
                  <div className="text-lg font-bold mb-2">
                    {combatResult.result === 'miss' ? (
                      <span className="text-purple-400 flex items-center justify-center gap-2">
                        💔 Attacker takes {combatResult.damage} damage!
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center justify-center gap-2">
                        💀 Defender takes {combatResult.damage} damage!
                      </span>
                    )}
                  </div>
                ) : combatResult.result === 'miss' ? (
                  <div className="text-lg font-bold mb-2">
                    <span className="text-slate-400 flex items-center justify-center gap-2">
                      🛡️ Attack missed - no damage dealt!
                    </span>
                  </div>
                ) : null}
                
                {combatResult.moraleGained > 0 && (
                  <div className="text-blue-400 font-bold mb-2">
                    😰 Both units gain {combatResult.moraleGained} morale token!
                  </div>
                )}
                
                {combatResult.specialEffects.length > 0 && (
                  <div className="text-purple-400 mt-2">
                    <div className="font-bold mb-1">✨ Special Effects:</div>
                    {combatResult.specialEffects.map((effect, index) => (
                      <div key={index} className="text-sm">• {effect}</div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <Button 
                  onClick={completeCombat} 
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold px-8 py-3 transition-all transform hover:scale-105 shadow-lg"
                >
                  Continue Game
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
