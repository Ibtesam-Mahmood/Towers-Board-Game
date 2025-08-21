
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RulesExplainer } from './rules-explainer';

interface TitleScreenProps {
  onStartGame: () => void;
}

export function TitleScreen({ onStartGame }: TitleScreenProps) {
  const [showRules, setShowRules] = useState(false);

  if (showRules) {
    return <RulesExplainer onBack={() => setShowRules(false)} onStartGame={onStartGame} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="mb-12">
          <h1 className="text-8xl font-bold text-amber-400 mb-4 tracking-wider">
            TOWERS
          </h1>
          <p className="text-2xl text-amber-200 mb-2">
            A Tactical Strategy Wargame
          </p>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Command your army in epic battles across modular battlefields. 
            Build from shared unit templates, deploy strategic formations, 
            and win the match through tactical superiority.
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-600 max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="text-amber-400 text-2xl">
              Ready for Battle?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={onStartGame}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
            >
              🎮 Start Game
            </Button>
            <Button
              onClick={() => setShowRules(true)}
              variant="outline"
              className="w-full border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-900 text-lg py-6"
            >
              📜 Learn the Rules
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-slate-400">
          <p>A 2-player local tactical board game</p>
          <p>Best of 3 skirmishes to win the match</p>
        </div>
      </div>
    </div>
  );
}
