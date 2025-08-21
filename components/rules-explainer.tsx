
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface RulesExplainerProps {
  onBack: () => void;
  onStartGame: () => void;
}

const rulesSections = [
  {
    title: "Game Overview",
    content: (
      <div className="space-y-4">
        <p>TOWERS is a 2-player tactical strategy game where you:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Build custom armies from shared unit templates</li>
          <li>Deploy forces on a hex-based battlefield</li>
          <li>Win by taking 2 out of 3 skirmishes</li>
          <li>Preserve units between battles for strategic advantage</li>
        </ul>
        <div className="bg-slate-700 p-4 rounded">
          <strong>Key Concepts:</strong> Command Points (CP), Supply Lines, Morale, Terrain Effects
        </div>
      </div>
    )
  },
  {
    title: "Army Building",
    content: (
      <div className="space-y-4">
        <p>Each player builds a 100-point army:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Choose units from shared templates</li>
          <li>Each unit has Move, HP, Attack, Defense, Supply costs</li>
          <li>Include up to 5 Command Cards for tactical abilities</li>
          <li>Balance cheap units vs expensive elites</li>
        </ul>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-green-800 p-3 rounded">
            <strong>Cheap Units:</strong><br/>
            Militia (4 pts), Skirmishers (6 pts)
          </div>
          <div className="bg-purple-800 p-3 rounded">
            <strong>Elite Units:</strong><br/>
            Shardbearer (24 pts), Commander (20 pts)
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Turn Structure",
    content: (
      <div className="space-y-4">
        <p>Each turn follows this pattern:</p>
        <div className="space-y-3">
          <div className="bg-slate-700 p-3 rounded">
            <strong>1. Refill Command Points (CP):</strong> +4 CP (max 6)
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <strong>2. Take 3 Activations:</strong>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>Move & attack with a unit</li>
              <li>Deploy from reserves</li>
              <li>Play a Command Card (costs CP)</li>
            </ul>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <strong>3. End Turn:</strong> Check supply, morale
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Combat System",
    content: (
      <div className="space-y-4">
        <p>Combat uses dice + stats:</p>
        <div className="space-y-3">
          <div className="bg-red-800 p-3 rounded">
            <strong>Attacker Value:</strong> Attack Stat + 1d6 + Modifiers
          </div>
          <div className="bg-blue-800 p-3 rounded">
            <strong>Defender Value:</strong> Defense Stat + 1d6 + Modifiers
          </div>
        </div>
        <div className="bg-slate-700 p-4 rounded">
          <strong>Results:</strong>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>Win by 3+: 2 HP damage</li>
            <li>Win by 1-2: 1 HP damage</li>
            <li>Tie: Both get morale token</li>
            <li>Lose: Attacker takes 1 HP</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    title: "Supply & Morale",
    content: (
      <div className="space-y-4">
        <div className="bg-amber-800 p-4 rounded">
          <strong>Supply Lines:</strong>
          <p>Units must trace back to Supply Camps or deployment edge through friendly units.</p>
          <p><strong>Out of Supply:</strong> -2 Attack/Defense, gain morale tokens</p>
        </div>
        <div className="bg-red-800 p-4 rounded">
          <strong>Morale System:</strong>
          <p>Units gain morale tokens from combat ties, supply issues, commander death.</p>
          <p><strong>3+ Tokens:</strong> Must roll morale check or retreat</p>
        </div>
      </div>
    )
  }
];

export function RulesExplainer({ onBack, onStartGame }: RulesExplainerProps) {
  const [currentSection, setCurrentSection] = useState(0);

  const nextSection = () => {
    if (currentSection < rulesSections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">TOWERS Rules</h1>
          <div className="flex justify-center gap-2 mb-4">
            {rulesSections.map((_, index) => (
              <Badge
                key={index}
                variant={index === currentSection ? "default" : "secondary"}
                className={index === currentSection ? "bg-amber-600" : "bg-slate-600"}
              >
                {index + 1}
              </Badge>
            ))}
          </div>
        </div>

        <Card className="bg-slate-800/80 border-slate-600">
          <CardHeader>
            <CardTitle className="text-amber-400 text-2xl">
              {rulesSections[currentSection].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-100">
            {rulesSections[currentSection].content}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-slate-400 text-slate-400 hover:bg-slate-400 hover:text-slate-900"
          >
            ← Back to Menu
          </Button>
          
          <div className="flex gap-4">
            <Button
              onClick={prevSection}
              disabled={currentSection === 0}
              variant="outline"
              className="border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-900"
            >
              Previous
            </Button>
            
            {currentSection === rulesSections.length - 1 ? (
              <Button
                onClick={onStartGame}
                className="bg-green-600 hover:bg-green-700"
              >
                Start Playing! 🎮
              </Button>
            ) : (
              <Button
                onClick={nextSection}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Next →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
