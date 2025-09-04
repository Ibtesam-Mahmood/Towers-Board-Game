
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
    <div className="min-h-screen bg-gradient-to-br from-stormlight-smokestone-dark via-stormlight-smokestone to-stormlight-smokestone-dark text-stormlight-pure flex items-center justify-center relative overflow-hidden">
      {/* Atmospheric background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-stormlight-sapphire/10 via-transparent to-transparent opacity-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-stormlight-sapphire/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-stormlight-topaz/5 rounded-full blur-3xl" />
      
      <div className="text-center relative z-10 px-4 max-w-4xl mx-auto">
        <div className="mb-12 fade-in-up">
          <div className="relative inline-block mb-6">
            <h1 className="text-7xl md:text-8xl font-bold text-stormlight-topaz mb-4 tracking-wider relative">
              TOWERS
              <div className="absolute inset-0 text-stormlight-topaz opacity-50 blur-sm">
                TOWERS
              </div>
            </h1>
            <div className="absolute -inset-4 bg-gradient-to-r from-stormlight-sapphire/20 to-stormlight-topaz/20 blur-xl rounded-lg -z-10" />
          </div>
          
          <p className="text-2xl md:text-3xl text-stormlight-sapphire-light mb-4 font-medium">
            A Tactical Strategy Wargame
          </p>
          <p className="text-lg md:text-xl text-stormlight-pure/80 max-w-3xl mx-auto leading-relaxed">
            Command your army in epic battles across the Shattered Plains. 
            Build from shared unit templates, deploy strategic formations, 
            and win the match through tactical superiority and the power of Stormlight.
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-stormlight-sapphire/30 max-w-lg mx-auto shadow-2xl scale-in">
          <CardHeader className="pb-4">
            <CardTitle className="text-stormlight-topaz text-2xl md:text-3xl font-semibold">
              Ready for Battle?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={onStartGame}
              className="w-full bg-gradient-to-r from-stormlight-sapphire to-stormlight-sapphire-dark hover:from-stormlight-sapphire-light hover:to-stormlight-sapphire text-stormlight-pure text-lg py-6 font-semibold menu-button stormlight-glow border border-stormlight-sapphire/50 focus:ring-2 focus:ring-stormlight-sapphire focus:ring-offset-2 focus:ring-offset-stormlight-smokestone-dark"
              aria-label="Start a new game"
            >
              ⚔️ Begin the Conflict
            </Button>
            <Button
              onClick={() => setShowRules(true)}
              variant="outline"
              className="w-full border-2 border-stormlight-topaz text-stormlight-topaz hover:bg-stormlight-topaz hover:text-stormlight-smokestone-dark text-lg py-6 font-semibold menu-button transition-all duration-300 focus:ring-2 focus:ring-stormlight-topaz focus:ring-offset-2 focus:ring-offset-stormlight-smokestone-dark"
              aria-label="Learn game rules and mechanics"
            >
              📜 Study the Ways of War
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-stormlight-pure/60 space-y-1">
          <p className="text-lg">Honor is dead, but I'll see what I can do.</p>
          <p className="text-sm">A 2-player tactical board game • First to 3 victories claims the Shattered Plains</p>
        </div>
      </div>
    </div>
  );
}
