"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import Dice from "react-dice-roll";
import { GameState, Unit, CombatResult } from "../lib/game-types";
import { getUnitTemplate } from "../lib/unit-templates";
import { hexDistance } from "../lib/hex-utils";
import { calculateAttackerValue, calculateDefenderValue } from "../lib/combat-system";

interface EnhancedDiceCombatProps {
  attacker: Unit;
  defender: Unit;
  gameState: GameState;
  onCombatComplete: (result: CombatResult) => void;
  onCancel: () => void;
}

export function EnhancedDiceCombat({ attacker, defender, gameState, onCombatComplete, onCancel }: EnhancedDiceCombatProps) {
  const [phase, setPhase] = useState<"preview" | "rolling" | "result">("preview");
  const [attackerRoll, setAttackerRoll] = useState<number>(0);
  const [defenderRoll, setDefenderRoll] = useState<number>(0);
  const [rollsComplete, setRollsComplete] = useState({ attacker: false, defender: false });
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);

  const attackerTemplate = getUnitTemplate(attacker.templateId);
  const defenderTemplate = getUnitTemplate(defender.templateId);

  if (!attackerTemplate || !defenderTemplate) return null;

  const isRanged = !!(attacker.position && defender.position && hexDistance(attacker.position, defender.position) > 1);

  const attackerValue = calculateAttackerValue(attacker, defender, gameState, isRanged);
  const defenderValue = calculateDefenderValue(defender, attacker, gameState, isRanged);

  const startCombat = () => {
    setPhase("rolling");
    setRollsComplete({ attacker: false, defender: false });
    
    // Auto-roll dice after a short delay for visual effect
    setTimeout(() => {
      const attackerRollValue = Math.floor(Math.random() * 6) + 1;
      const defenderRollValue = Math.floor(Math.random() * 6) + 1;
      handleAttackerRoll(attackerRollValue);
      handleDefenderRoll(defenderRollValue);
    }, 1000);
  };

  const handleAttackerRoll = (value: number) => {
    setAttackerRoll(value);
    setRollsComplete((prev) => ({ ...prev, attacker: true }));
  };

  const handleDefenderRoll = (value: number) => {
    setDefenderRoll(value);
    setRollsComplete((prev) => ({ ...prev, defender: true }));
  };

  useEffect(() => {
    if (rollsComplete.attacker && rollsComplete.defender) {
      // Calculate combat result
      const totalAttacker = attackerValue + attackerRoll;
      const totalDefender = defenderValue + defenderRoll;
      const difference = totalAttacker - totalDefender;

      let result: CombatResult["result"];
      let damage = 0;
      let moraleGained = 0;
      const specialEffects: string[] = [];

      if (difference >= 3) {
        result = "massive-hit";
        damage = 2;
      } else if (difference >= 1) {
        result = "hit";
        damage = 1;
      } else if (difference === 0) {
        result = "tie";
        damage = 0;
        moraleGained = 1;

        // Shardbearer wins ties automatically
        if (attackerTemplate.id === "shardbearer") {
          result = "hit";
          damage = 1;
          moraleGained = 0;
          specialEffects.push("Shardbearer wins tie automatically");
        }
      } else {
        result = "miss";
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
        specialEffects,
      };

      setCombatResult(finalResult);
      setPhase("result");
    }
  }, [rollsComplete, attackerRoll, defenderRoll, attackerValue, defenderValue, attacker.id, defender.id, attackerTemplate.id]);

  const completeCombat = () => {
    if (combatResult) {
      onCombatComplete(combatResult);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-800/95 backdrop-blur-md border border-slate-600 rounded-lg shadow-2xl flex flex-col">
      {/* Close Button - Small X in top left */}
      <button
        onClick={onCancel}
        className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-slate-700/80 hover:bg-slate-600/80 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        title="Close combat menu"
      >
        ✕
      </button>

      {/* Header */}
      <div className="flex-shrink-0 pt-8 pb-3 px-6">
        <h2 className="text-amber-400 text-center text-2xl font-bold">⚔️ Combat Resolution</h2>
        <p className="text-slate-300 text-sm text-center">{isRanged ? "🏹 Ranged Attack" : "⚔️ Melee Combat"}</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-4">{/* Added bottom padding for floating button */}
        {phase === "preview" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                <p>
                  • Margin 1-2: <span className="text-yellow-400">1 damage</span>
                </p>
                <p>
                  • Margin 3+: <span className="text-red-400">2 damage</span>
                </p>
                <p>
                  • Tie: <span className="text-blue-400">Both gain morale token</span>
                </p>
                <p>
                  • Miss: <span className="text-purple-400">Attacker takes 1 damage</span>
                </p>
              </div>
            </div>
          </>
        )}

        {phase === "rolling" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-amber-400 mb-4">🎲 Rolling Dice...</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Attacker Dice */}
              <div className="text-center">
                <h4 className="text-lg font-bold text-blue-400 mb-4">Attacker Roll</h4>
                <div className="flex justify-center">
                  {rollsComplete.attacker ? (
                    <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                      {attackerRoll}
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center text-3xl font-bold text-white shadow-lg animate-spin">
                      🎲
                    </div>
                  )}
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
                  {rollsComplete.defender ? (
                    <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                      {defenderRoll}
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-3xl font-bold text-white shadow-lg animate-spin">
                      🎲
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-green-400">{defenderValue}</div>
                  <div className="text-sm text-slate-300">Base Defense</div>
                </div>
              </div>
            </div>

            <div className="text-center text-amber-300">
              {rollsComplete.attacker && rollsComplete.defender 
                ? "Dice rolled! Calculating result..." 
                : "Rolling dice automatically..."
              }
            </div>
          </div>
        )}

        {phase === "result" && combatResult && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">{combatResult.result === "massive-hit" ? "💥 MASSIVE HIT!" : combatResult.result === "hit" ? "🎯 HIT!" : combatResult.result === "miss" ? "❌ MISS!" : "🤝 TIE!"}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
              {combatResult.damage > 0 && <div className="text-lg font-bold">{combatResult.result === "miss" ? <span className="text-purple-400">💔 Attacker takes {combatResult.damage} damage!</span> : <span className="text-red-400">💀 Defender takes {combatResult.damage} damage!</span>}</div>}
              {combatResult.moraleGained > 0 && <div className="text-blue-400 font-bold">😰 Both units gain {combatResult.moraleGained} morale token!</div>}
              {combatResult.specialEffects.length > 0 && <div className="text-purple-400 mt-2">✨ {combatResult.specialEffects.join(", ")}</div>}
            </div>

            {/* Continue button moved to floating section for result phase */}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {phase === "preview" && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Button 
            onClick={startCombat} 
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-lg shadow-lg"
          >
            ⚔️ ROLL FOR COMBAT!
          </Button>
        </div>
      )}

      {phase === "result" && combatResult && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Button 
            onClick={completeCombat} 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg shadow-lg"
          >
            Continue Game
          </Button>
        </div>
      )}
    </div>
  );
}
