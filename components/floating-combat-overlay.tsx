"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { CombatResult } from "../lib/game-types";

interface FloatingCombatOverlayProps {
  phase: "rolling" | "result" | null;
  attackerRoll: number;
  defenderRoll: number;
  attackerValue: number;
  defenderValue: number;
  combatResult: CombatResult | null;
  onComplete?: () => void;
  autoCloseDelay?: number; // milliseconds to auto-close after result
}

export function FloatingCombatOverlay({
  phase,
  attackerRoll,
  defenderRoll,
  attackerValue,
  defenderValue,
  combatResult,
  onComplete,
  autoCloseDelay = 3000
}: FloatingCombatOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (phase) {
      setIsVisible(true);
      setIsClosing(false);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "result" && combatResult && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300); // Animation duration
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [phase, combatResult, autoCloseDelay, onComplete]);

  if (!isVisible || !phase) return null;

  const getResultIcon = () => {
    if (!combatResult) return "🎲";
    switch (combatResult.result) {
      case "massive-hit": return "💥";
      case "hit": return "🎯";
      case "tie": return "🤝";
      case "miss": return "❌";
      default: return "🎲";
    }
  };

  const getResultText = () => {
    if (!combatResult) return "";
    switch (combatResult.result) {
      case "massive-hit": return "MASSIVE HIT!";
      case "hit": return "HIT!";
      case "tie": return "TIE!";
      case "miss": return "MISS!";
      default: return "";
    }
  };

  const getDamageText = () => {
    if (!combatResult) return "";
    if (combatResult.damage > 0) {
      const target = combatResult.result === "miss" ? "Attacker" : "Defender";
      return `${target} takes ${combatResult.damage} damage!`;
    }
    if (combatResult.moraleGained > 0) {
      return "Both gain morale token!";
    }
    return "";
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isClosing ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <Card className="bg-slate-800/95 backdrop-blur-md border-slate-600 shadow-2xl min-w-[280px] max-w-[320px]">
        <CardContent className="p-4">
          {phase === "rolling" && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-sm font-bold text-amber-400 mb-2">🎲 Rolling Dice</h3>
              </div>
              
              <div className="flex justify-center gap-4">
                {/* Attacker Dice */}
                <div className="text-center">
                  <div className="text-xs text-blue-400 mb-1">Attacker</div>
                  <div className="flex flex-col items-center">
                    {attackerRoll > 0 ? (
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-lg">
                        {attackerRoll}
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-lg animate-spin">
                        🎲
                      </div>
                    )}
                    <div className="text-xs text-slate-300 mt-1">+{attackerValue}</div>
                  </div>
                </div>

                {/* Defender Dice */}
                <div className="text-center">
                  <div className="text-xs text-red-400 mb-1">Defender</div>
                  <div className="flex flex-col items-center">
                    {defenderRoll > 0 ? (
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-lg">
                        {defenderRoll}
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-lg animate-spin">
                        🎲
                      </div>
                    )}
                    <div className="text-xs text-slate-300 mt-1">+{defenderValue}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === "result" && combatResult && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl mb-1">{getResultIcon()}</div>
                <h3 className="text-sm font-bold text-amber-400">{getResultText()}</h3>
              </div>
              
              <div className="flex justify-center gap-4 text-xs">
                <div className="text-center">
                  <div className="text-blue-400">Attacker</div>
                  <div className="font-bold text-white">
                    {attackerValue} + {attackerRoll} = {attackerValue + attackerRoll}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-red-400">Defender</div>
                  <div className="font-bold text-white">
                    {defenderValue} + {defenderRoll} = {defenderValue + defenderRoll}
                  </div>
                </div>
              </div>

              {getDamageText() && (
                <div className="text-center text-xs">
                  <div className={`font-bold ${
                    combatResult.result === "miss" ? "text-purple-400" : 
                    combatResult.moraleGained > 0 ? "text-blue-400" : "text-red-400"
                  }`}>
                    {getDamageText()}
                  </div>
                </div>
              )}

              {combatResult.specialEffects.length > 0 && (
                <div className="text-center text-xs text-purple-400">
                  ✨ {combatResult.specialEffects.join(", ")}
                </div>
              )}

              {/* Auto-close indicator with click to dismiss */}
              <div 
                className="text-center text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => {
                  setIsClosing(true);
                  setTimeout(() => {
                    setIsVisible(false);
                    onComplete?.();
                  }, 300);
                }}
                title="Click to dismiss"
              >
                Auto-closing in {Math.ceil(autoCloseDelay / 1000)}s... (click to dismiss)
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
