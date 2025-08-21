
'use client';

import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { GameState } from '../lib/game-types';

interface TutorialSystemProps {
  gameState: GameState;
  isEnabled: boolean;
  onNext: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  title: string;
  content: string;
  condition: (gameState: GameState) => boolean;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Deployment",
    content: "First, deploy up to 5 units from your army onto your deployment zone (the closest 2 rows to your side). Units not deployed will stay in reserves.",
    condition: (state) => state.currentPhase === 'deployment' && state.players[state.currentPlayer].deployedUnits === 0
  },
  {
    title: "Turn Structure",
    content: "Each turn you get 4 Command Points (CP) and 3 activations. Use activations to move units, attack, deploy reserves, or play command cards.",
    condition: (state) => state.currentPhase === 'battle' && state.turn === 1
  },
  {
    title: "Moving Units",
    content: "Click a unit to select it, then click an empty hex within its movement range to move. Units can move up to their Move stat in hexes.",
    condition: (state) => state.currentPhase === 'battle' && state.activationsRemaining === 3
  },
  {
    title: "Combat Basics",
    content: "To attack, move adjacent to an enemy unit and click it. Combat uses Attack/Defense + 1d6. Win by 3+ = 2 damage, win by 1-2 = 1 damage.",
    condition: (state) => state.currentPhase === 'battle' && state.turn <= 2 && state.activationsRemaining <= 2
  },
  {
    title: "Supply Lines",
    content: "Units must trace supply back to a Supply Camp or your deployment edge through friendly units. Out-of-supply units get -2 Attack/Defense.",
    condition: (state) => state.currentPhase === 'battle' && state.turn >= 3
  },
  {
    title: "Command Points",
    content: "Use CP to play powerful Command Cards or gain extra activations (1 CP = +1 activation). Manage CP carefully!",
    condition: (state) => state.currentPhase === 'battle' && state.players[state.currentPlayer].cp <= 2
  },
  {
    title: "Morale System",
    content: "Units gain morale tokens from combat ties, being out of supply, or losing commanders. 3+ tokens require morale checks that may force retreats.",
    condition: (state) => {
      return Object.values(state.units).some(unit => unit.moraleTokens >= 1);
    }
  }
];

export function TutorialSystem({ gameState, isEnabled, onNext, onSkip }: TutorialSystemProps) {
  if (!isEnabled) return null;

  const currentStep = tutorialSteps.find(step => step.condition(gameState));
  if (!currentStep) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="bg-blue-900/95 border-blue-400 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 mb-3">
            <div className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              ?
            </div>
            <div className="flex-1">
              <h4 className="text-blue-100 font-semibold text-sm mb-1">
                {currentStep.title}
              </h4>
              <p className="text-blue-200 text-xs leading-relaxed">
                {currentStep.content}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onNext}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
            >
              Got it!
            </Button>
            <Button
              onClick={onSkip}
              size="sm"
              variant="outline"
              className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-blue-900 text-xs"
            >
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
