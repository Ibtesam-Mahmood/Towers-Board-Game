
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
          <li>Deploy initial forces, then reinforce during battle</li>
          <li>Win by eliminating all enemy units</li>
          <li>Deploy reserves as actions during your turn</li>
        </ul>
        <div className="bg-slate-700 p-4 rounded">
          <strong>Key Concepts:</strong> Command Points (CP), Supply Lines, Morale, Terrain Effects, Reserve Deployment
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
              <li>Deploy a unit from reserves (costs 1 activation)</li>
              <li>Play a Command Card (costs CP)</li>
            </ul>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <strong>3. End Turn:</strong> Check supply, morale
          </div>
        </div>
        <div className="bg-amber-800 p-4 rounded mt-4">
          <strong>Reserve Deployment:</strong>
          <p>During battle, you can deploy any unit from reserves as an action. This costs 1 activation and the unit is marked as activated.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-stormlight-smokestone-dark via-stormlight-smokestone to-stormlight-smokestone-dark text-stormlight-pure p-6 relative overflow-hidden">
      {/* Atmospheric background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-stormlight-sapphire/5 via-transparent to-transparent opacity-50" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-stormlight-topaz/5 rounded-full blur-3xl" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-8 fade-in-up">
          <h1 className="text-3xl md:text-4xl font-bold text-stormlight-topaz mb-2">
            TOWERS - The Ways of War
          </h1>
          <div className="flex justify-center gap-2 mb-4">
            {rulesSections.map((_, index) => (
              <Badge
                key={index}
                variant={index === currentSection ? "default" : "secondary"}
                className={index === currentSection ? 
                  "bg-stormlight-topaz text-stormlight-smokestone-dark font-semibold" : 
                  "bg-stormlight-smokestone-light text-stormlight-pure border border-stormlight-sapphire/30"
                }
              >
                {index + 1}
              </Badge>
            ))}
          </div>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-stormlight-sapphire/30 shadow-2xl scale-in">
          <CardHeader>
            <CardTitle className="text-stormlight-topaz text-2xl md:text-3xl font-semibold">
              {rulesSections[currentSection].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-stormlight-pure/90">
            {rulesSections[currentSection].content}
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-2 border-stormlight-pure/40 text-stormlight-pure/80 hover:bg-stormlight-pure/10 hover:text-stormlight-pure menu-button focus:ring-2 focus:ring-stormlight-pure/40 focus:ring-offset-2 focus:ring-offset-stormlight-smokestone-dark"
            aria-label="Return to main menu"
          >
            ← Return to the Shattered Plains
          </Button>
          
          <div className="flex gap-4">
            <Button
              onClick={prevSection}
              disabled={currentSection === 0}
              variant="outline"
              className="border-2 border-stormlight-topaz text-stormlight-topaz hover:bg-stormlight-topaz hover:text-stormlight-smokestone-dark disabled:opacity-50 disabled:cursor-not-allowed menu-button focus:ring-2 focus:ring-stormlight-topaz focus:ring-offset-2 focus:ring-offset-stormlight-smokestone-dark"
              aria-label="Previous section"
            >
              ← Previous
            </Button>
            
            {currentSection === rulesSections.length - 1 ? (
              <Button
                onClick={onStartGame}
                className="bg-gradient-to-r from-stormlight-sapphire to-stormlight-sapphire-dark hover:from-stormlight-sapphire-light hover:to-stormlight-sapphire text-stormlight-pure menu-button stormlight-glow border border-stormlight-sapphire/50 focus:ring-2 focus:ring-stormlight-sapphire focus:ring-offset-2 focus:ring-offset-stormlight-smokestone-dark"
                aria-label="Begin the battle"
              >
                ⚔️ Begin the Conflict!
              </Button>
            ) : (
              <Button
                onClick={nextSection}
                className="bg-gradient-to-r from-stormlight-topaz to-stormlight-topaz-dark hover:from-stormlight-topaz-light hover:to-stormlight-topaz text-stormlight-smokestone-dark menu-button focus:ring-2 focus:ring-stormlight-topaz focus:ring-offset-2 focus:ring-offset-stormlight-smokestone-dark"
                aria-label="Next section"
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
