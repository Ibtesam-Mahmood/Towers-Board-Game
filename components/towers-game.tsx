
'use client';

import React, { useState, useCallback } from 'react';
import { GameState, Army } from '../lib/game-types';
import { createInitialGameState, buildArmy, startBattlePhase, getDeploymentZones } from '../lib/game-state-manager';
import { ArmyBuilder } from './army-builder';
import { EnhancedImmersiveGameInterface } from './enhanced-immersive-game-interface';
import { TitleScreen } from './title-screen';
import { TutorialSystem } from './tutorial-system';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { EnhancedGameManager } from '../lib/enhanced-game-logic';

export function TowersGame() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [currentArmyBuilder, setCurrentArmyBuilder] = useState<'player1' | 'player2' | null>(null);
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [player1Army, setPlayer1Army] = useState<Army | null>(null);
  const [player2Army, setPlayer2Army] = useState<Army | null>(null);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const startGame = useCallback(() => {
    setShowTitleScreen(false);
    setCurrentArmyBuilder('player1');
  }, []);

  const handleArmyComplete = useCallback((army: Army, playerId: string) => {
    try {
      const newState = buildArmy(playerId, army.units, gameState);
      setGameState(newState);

      if (playerId === 'player1') {
        setPlayer1Army(army);
        setCurrentArmyBuilder('player2');
      } else {
        setPlayer2Army(army);
        // Both armies built, move to deployment
        const deploymentState = { ...newState };
        deploymentState.currentPhase = 'deployment';
        setGameState(deploymentState);
        setCurrentArmyBuilder(null);
      }
    } catch (error) {
      console.error('Error building army:', error);
    }
  }, [gameState]);

  const handleGameStateChange = useCallback((newState: GameState) => {
    // Check victory conditions before updating state - Single Battle Format
    const victory = EnhancedGameManager.checkVictoryConditions(newState);
    if (victory.winner && newState.currentPhase !== 'match-end') {
      // End the game immediately
      const finalState = EnhancedGameManager.endGame(newState, victory.winner);
      setGameState(finalState);
    } else {
      setGameState(newState);
    }
  }, []);

  const switchDeployingPlayer = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 'player1' ? 'player2' : 'player1'
    }));
  }, []);

  const readyToStart = useCallback(() => {
    // Check if both players have deployed at least one unit
    const player1HasDeployed = Object.values(gameState.units).some(
      unit => unit.playerId === 'player1' && unit.isDeployed && unit.currentHp > 0
    );
    const player2HasDeployed = Object.values(gameState.units).some(
      unit => unit.playerId === 'player2' && unit.isDeployed && unit.currentHp > 0
    );
    
    return player1HasDeployed && player2HasDeployed;
  }, [gameState]);

  const startBattle = useCallback(() => {
    const battleState = startBattlePhase(gameState);
    setGameState(battleState);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(createInitialGameState());
    setCurrentArmyBuilder('player1');
    setPlayer1Army(null);
    setPlayer2Army(null);
    setShowTitleScreen(true);
    setTutorialEnabled(false);
    setTutorialStep(0);
  }, []);

  const toggleTutorial = useCallback(() => {
    setTutorialEnabled(!tutorialEnabled);
  }, [tutorialEnabled]);

  const nextTutorialStep = useCallback(() => {
    setTutorialStep(tutorialStep + 1);
  }, [tutorialStep]);

  const skipTutorial = useCallback(() => {
    setTutorialEnabled(false);
  }, []);

  // Title Screen
  if (showTitleScreen) {
    return <TitleScreen onStartGame={startGame} />;
  }

  // Army Building Phase
  if (currentArmyBuilder) {
    return (
      <ArmyBuilder
        key={currentArmyBuilder} // Force new component instance for each player
        onArmyComplete={(army) => handleArmyComplete(army, currentArmyBuilder)}
        playerId={currentArmyBuilder}
        playerName={gameState.players[currentArmyBuilder].name}
        player1Army={currentArmyBuilder === 'player2' ? player1Army || undefined : undefined}
      />
    );
  }

  // Deployment Phase or Battle Phase - Use Enhanced Interface
  if (gameState.currentPhase === 'deployment' || gameState.currentPhase === 'battle') {
    return (
      <div className="relative">
        <EnhancedImmersiveGameInterface
          gameState={gameState}
          onGameStateChange={handleGameStateChange}
          switchPlayer={switchDeployingPlayer}
          readyToStart={readyToStart}
          onStartBattle={startBattle}
        />
        
        <TutorialSystem
          gameState={gameState}
          isEnabled={tutorialEnabled}
          onNext={nextTutorialStep}
          onSkip={skipTutorial}
        />
      </div>
    );
  }

  // Game End - Single Battle Format
  if (gameState.currentPhase === 'match-end') {
    // Determine winner from victory conditions
    const victory = EnhancedGameManager.checkVictoryConditions(gameState);
    const winner = victory.winner === 'player1' ? 'Player 1' : victory.winner === 'player2' ? 'Player 2' : 'Unknown';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-600 w-96">
          <CardHeader>
            <CardTitle className="text-amber-400 text-center">Game Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-2xl font-bold text-white">
              {winner} Wins!
            </div>
            <div className="text-slate-300">
              {victory.reason}
            </div>
            <div className="text-sm text-slate-400">
              Battle lasted {gameState.turn} turns
            </div>
            <Button onClick={resetGame} className="w-full">
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
      <Card className="bg-slate-800/50 border-slate-600">
        <CardHeader>
          <CardTitle className="text-amber-400">Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={resetGame}>Start Game</Button>
        </CardContent>
      </Card>
    </div>
  );
}
