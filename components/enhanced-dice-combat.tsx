

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Dice from 'react-dice-roll';
import { GameState, Unit, CombatResult } from '../lib/game-types';
import { getUnitTemplate } from '../lib/unit-templates';
import { hexDistance } from '../lib/hex-utils';
import { calculateAttackerValue, calculateDefenderValue } from '../lib/combat-system';

interface EnhancedDiceCombatProps {
  attacker: Unit;
  defender: Unit;
  gameState: GameState;
  onCombatComplete: (result: CombatResult) => void;
  onCancel: () => void;
}

export function EnhancedDiceCombat({ 
  attacker, 
  defender, 
  gameState, 
  onCombatComplete, 
  onCancel 
}: EnhancedDiceCombatProps) {
  const [phase, setPhase] = useState<'preview' | 'rolling' | 'result'>('preview');
  const [attackerRoll, setAttackerRoll] = useState<number>(0);
  const [defenderRoll, setDefenderRoll] = useState<number>(0);
  const [rollsComplete, setRollsComplete] = useState({ attacker: false, defender: false });
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);

  const attackerTemplate = getUnitTemplate(attacker.templateId);
  const defenderTemplate = getUnitTemplate(defender.templateId);
  
  if (!attackerTemplate || !defenderTemplate) return null;

  const isRanged = !!(attacker.position && defender.position && 
    hexDistance(attacker.position, defender.position) > 1);
  
  const attackerValue = calculateAttackerValue(attacker, defender, gameState, isRanged);
  const defenderValue = calculateDefenderValue(defender, attacker, gameState, isRanged);

  const startCombat = () => {
    setPhase('rolling');
    setRollsComplete({ attacker: false, defender: false });
  };

  const handleAttackerRoll = (value: number) => {
    setAttackerRoll(value);
    setRollsComplete(prev => ({ ...prev, attacker: true }));
  };

  const handleDefenderRoll = (value: number) => {
    setDefenderRoll(value);
    setRollsComplete(prev => ({ ...prev, defender: true }));
  };

  useEffect(() => {
    if (rollsComplete.attacker && rollsComplete.defender) {
      // Calculate combat result
      const totalAttacker = attackerValue + attackerRoll;
      const totalDefender = defenderValue + defenderRoll;
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
        damage = 0;
      }
      
      const finalResult: CombatResult = {
        id: `combat_${Date.now()}_${Math.random()}`,
        attackerId: attacker.id,
        defenderId: defender.id,
        attackerValue,
        defenderValue,
        attackerRoll,
        defenderRoll,
        result,
        damage,
        moraleGained,
        specialEffects
      };

      setCombatResult(finalResult);
      setPhase('result');
    }
  }, [rollsComplete, attackerRoll, defenderRoll, attackerValue, defenderValue, attacker.id, defender.id, attackerTemplate.id]);

  const completeCombat = () => {
    if (combatResult) {
      onCombatComplete(combatResult);
    }
  };

  return (
    <Card className="bg-slate-800/95 backdrop-blur-md border-slate-600 w-full h-full shadow-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-400 text-center text-2xl">
            ⚔️ Combat Resolution
          </CardTitle>
          <p className="text-slate-300 text-sm text-center">
            {isRanged ? '🏹 Ranged Attack' : '⚔️ Melee Combat'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {phase === 'preview' && (
            <>
              <div className="grid grid-cols-2 gap-6">
                {/* Attacker */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-bold text-blue-400 text-center mb-3 text-lg">Attacker</h4>
                  <div className="text-center space-y-2">
                    <div className="font-bold text-white">{attackerTemplate.name}</div>
                    <div className="text-slate-300 text-sm">{attackerTemplate.type}</div>
                    <div className="bg-slate-600 rounded-lg p-3">
                      <div className="text-3xl font-bold text-red-400">{attackerValue}</div>
                      <div className="text-sm text-slate-300">Attack Value</div>
                    </div>
                    <div className="text-sm text-slate-400">
                      HP: {attacker.currentHp}/{attackerTemplate.hp}
                    </div>
                  </div>
                </div>
                
                {/* Defender */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-bold text-red-400 text-center mb-3 text-lg">Defender</h4>
                  <div className="text-center space-y-2">
                    <div className="font-bold text-white">{defenderTemplate.name}</div>
                    <div className="text-slate-300 text-sm">{defenderTemplate.type}</div>
                    <div className="bg-slate-600 rounded-lg p-3">
                      <div className="text-3xl font-bold text-green-400">{defenderValue}</div>
                      <div className="text-sm text-slate-300">Defense Value</div>
                    </div>
                    <div className="text-sm text-slate-400">
                      HP: {defender.currentHp}/{defenderTemplate.hp}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                <div className="text-lg text-amber-300 mb-2">🎲 Combat Mechanics</div>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>Both sides roll 1d6 and add their combat values</p>
                  <p>Winner deals damage based on margin of victory:</p>
                  <p>• Margin 1-2: <span className="text-yellow-400">1 damage</span></p>
                  <p>• Margin 3+: <span className="text-red-400">2 damage</span></p>
                  <p>• Tie: <span className="text-blue-400">Both gain morale token</span></p>
                  <p>• Miss: <span className="text-purple-400">Attacker takes 1 damage</span></p>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button onClick={startCombat} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 text-lg">
                  ⚔️ ROLL FOR COMBAT!
                </Button>
                <Button onClick={onCancel} variant="outline" className="border-slate-500 px-8 py-3">
                  Cancel
                </Button>
              </div>
            </>
          )}

          {phase === 'rolling' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-amber-400 mb-4">🎲 Rolling Dice...</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {/* Attacker Dice */}
                <div className="text-center">
                  <h4 className="text-lg font-bold text-blue-400 mb-4">Attacker Roll</h4>
                  <div className="flex justify-center">
                    <Dice
                      onRoll={handleAttackerRoll}
                      rollingTime={500}
                      triggers={['click']}
                      size={60}
                      faceBg="#FF6B6B"
                    />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-red-400">{attackerValue}</div>
                    <div className="text-sm text-slate-300">Base Attack</div>
                  </div>
                </div>
                
                {/* Defender Dice */}
                <div className="text-center">
                  <h4 className="text-lg font-bold text-red-400 mb-4">Defender Roll</h4>
                  <div className="flex justify-center">
                    <Dice
                      onRoll={handleDefenderRoll}
                      rollingTime={500}
                      triggers={['click']}
                      size={60}
                      faceBg="#4DABF7"
                    />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-green-400">{defenderValue}</div>
                    <div className="text-sm text-slate-300">Base Defense</div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-amber-300">
                Click the dice to roll!
              </div>
            </div>
          )}

          {phase === 'result' && combatResult && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">
                  {combatResult.result === 'massive-hit' ? '💥 MASSIVE HIT!' :
                   combatResult.result === 'hit' ? '🎯 HIT!' : 
                   combatResult.result === 'miss' ? '❌ MISS!' : '🤝 TIE!'}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-blue-400 font-bold">Attacker Total</h4>
                  <div className="text-3xl font-bold text-white">
                    {attackerValue} + {attackerRoll} = {attackerValue + attackerRoll}
                  </div>
                </div>
                
                <div className="text-center bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-red-400 font-bold">Defender Total</h4>
                  <div className="text-3xl font-bold text-white">
                    {defenderValue} + {defenderRoll} = {defenderValue + defenderRoll}
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-900/30 rounded-lg p-4 text-center">
                <h4 className="text-amber-300 font-bold mb-2">Combat Result</h4>
                {combatResult.damage > 0 && (
                  <div className="text-lg font-bold">
                    {combatResult.result === 'miss' ? (
                      <span className="text-purple-400">💔 Attacker takes {combatResult.damage} damage!</span>
                    ) : (
                      <span className="text-red-400">💀 Defender takes {combatResult.damage} damage!</span>
                    )}
                  </div>
                )}
                {combatResult.moraleGained > 0 && (
                  <div className="text-blue-400 font-bold">
                    😰 Both units gain {combatResult.moraleGained} morale token!
                  </div>
                )}
                {combatResult.specialEffects.length > 0 && (
                  <div className="text-purple-400 mt-2">
                    ✨ {combatResult.specialEffects.join(', ')}
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <Button onClick={completeCombat} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3">
                  Continue Game
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
  );
}

