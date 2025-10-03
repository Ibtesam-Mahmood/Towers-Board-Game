'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface CombatResult {
  attackerRoll: number;
  defenderRoll: number;
  attackerTotal: number;
  defenderTotal: number;
  result: string;
  damage: number;
}

export function InteractiveCombatDemo() {
  const [attacker] = useState({ name: 'Warrior', attack: 4, hp: 3 });
  const [defender] = useState({ name: 'Militia', defense: 2, hp: 2 });
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const simulateCombat = () => {
    setIsRolling(true);
    
    // Simulate dice rolling animation delay
    setTimeout(() => {
      const attackerRoll = Math.floor(Math.random() * 6) + 1;
      const defenderRoll = Math.floor(Math.random() * 6) + 1;
      const attackerTotal = attacker.attack + attackerRoll;
      const defenderTotal = defender.defense + defenderRoll;
      const difference = attackerTotal - defenderTotal;

      let result: string;
      let damage: number;

      if (difference >= 3) {
        result = 'Decisive Victory!';
        damage = 2;
      } else if (difference >= 1) {
        result = 'Victory';
        damage = 1;
      } else if (difference === 0) {
        result = 'Tie - Both get morale tokens';
        damage = 0;
      } else {
        result = 'Defeat - Attacker takes damage';
        damage = -1;
      }

      setCombatResult({
        attackerRoll,
        defenderRoll,
        attackerTotal,
        defenderTotal,
        result,
        damage
      });
      setIsRolling(false);
    }, 1000);
  };

  return (
    <Card className="bg-slate-800/50 border-amber-500/30 mt-4">
      <CardHeader>
        <CardTitle className="text-amber-400 text-lg">
          🎲 Interactive Combat Demo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Units Display */}
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="bg-red-700/50 p-3 rounded-lg">
                <h4 className="font-semibold text-red-200">{attacker.name}</h4>
                <div className="text-sm">Attack: {attacker.attack}</div>
                <div className="text-sm">HP: {attacker.hp}</div>
              </div>
            </div>
            <div className="text-2xl">⚔️</div>
            <div className="text-center">
              <div className="bg-blue-700/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-200">{defender.name}</h4>
                <div className="text-sm">Defense: {defender.defense}</div>
                <div className="text-sm">HP: {defender.hp}</div>
              </div>
            </div>
          </div>

          {/* Combat Results */}
          {combatResult && (
            <div className="bg-slate-700/50 p-4 rounded-lg space-y-2 bounce-in">
              <div className="flex justify-between">
                <div className="text-center">
                  <div className="text-sm text-red-300">Attacker Roll</div>
                  <Badge variant="destructive" className="bg-red-700">
                    {combatResult.attackerRoll}
                  </Badge>
                  <div className="text-xs mt-1">
                    {attacker.attack} + {combatResult.attackerRoll} = {combatResult.attackerTotal}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-300">Defender Roll</div>
                  <Badge variant="secondary" className="bg-blue-700">
                    {combatResult.defenderRoll}
                  </Badge>
                  <div className="text-xs mt-1">
                    {defender.defense} + {combatResult.defenderRoll} = {combatResult.defenderTotal}
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-4 p-3 bg-amber-800/50 rounded">
                <div className="font-bold text-amber-200">{combatResult.result}</div>
                {combatResult.damage > 0 && (
                  <div className="text-sm text-red-300">
                    {defender.name} takes {combatResult.damage} damage!
                  </div>
                )}
                {combatResult.damage < 0 && (
                  <div className="text-sm text-red-300">
                    {attacker.name} takes 1 damage!
                  </div>
                )}
              </div>
            </div>
          )}

          <Button 
            onClick={simulateCombat} 
            disabled={isRolling}
            className={`w-full bg-amber-600 hover:bg-amber-700 text-slate-900 font-bold transition-all ${
              isRolling ? 'animate-pulse' : 'hover:pulse-glow'
            }`}
          >
            {isRolling ? (
              <span className="flex items-center justify-center gap-2">
                <span className="dice-rolling">🎲</span>
                Rolling Dice...
              </span>
            ) : (
              '🎲 Simulate Combat'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}