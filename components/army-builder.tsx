
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { UNIT_TEMPLATES, getUnitTemplate } from '../lib/unit-templates';
import { Army } from '../lib/game-types';
import { DEFAULT_CONFIG } from '../lib/game-state-manager';

interface ArmyBuilderProps {
  onArmyComplete: (army: Army) => void;
  playerId: string;
  playerName: string;
  player1Army?: Army; // To show what player 1 selected
}

export function ArmyBuilder({ onArmyComplete, playerId, playerName, player1Army }: ArmyBuilderProps) {
  // Explicitly ensure clean state for each player by using playerId in the key
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() => []);
  const [selectedCommandCards, setSelectedCommandCards] = useState<string[]>(() => []);

  // Reset army builder state when player changes
  useEffect(() => {
    setSelectedUnits([]);
    setSelectedCommandCards([]);
  }, [playerId]);

  const totalCost = selectedUnits.reduce((sum, templateId) => {
    const template = getUnitTemplate(templateId);
    return sum + (template?.cost || 0);
  }, 0);

  const remainingPoints = DEFAULT_CONFIG.pointLimit - totalCost;

  const addUnit = (templateId: string) => {
    const template = getUnitTemplate(templateId);
    if (!template) return;
    
    if (totalCost + template.cost <= DEFAULT_CONFIG.pointLimit) {
      setSelectedUnits([...selectedUnits, templateId]);
    }
  };

  const removeUnit = (index: number) => {
    const newUnits = [...selectedUnits];
    newUnits.splice(index, 1);
    setSelectedUnits(newUnits);
  };

  const canAddUnit = (templateId: string): boolean => {
    const template = getUnitTemplate(templateId);
    return template ? totalCost + template.cost <= DEFAULT_CONFIG.pointLimit : false;
  };

  const randomizeArmy = () => {
    const availableTemplates = [...UNIT_TEMPLATES];
    const randomUnits: string[] = [];
    let remainingPoints = DEFAULT_CONFIG.pointLimit;
    
    // Shuffle the templates array
    for (let i = availableTemplates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableTemplates[i], availableTemplates[j]] = [availableTemplates[j], availableTemplates[i]];
    }
    
    // Add units randomly until we can't afford any more
    while (remainingPoints > 0) {
      const affordableUnits = availableTemplates.filter(template => template.cost <= remainingPoints);
      if (affordableUnits.length === 0) break;
      
      const randomTemplate = affordableUnits[Math.floor(Math.random() * affordableUnits.length)];
      randomUnits.push(randomTemplate.id);
      remainingPoints -= randomTemplate.cost;
    }
    
    setSelectedUnits(randomUnits);
    setSelectedCommandCards([]);
  };

  const completeArmy = () => {
    if (selectedUnits.length === 0) return;
    
    const army: Army = {
      units: selectedUnits,
      commandCards: selectedCommandCards,
      totalCost
    };
    
    onArmyComplete(army);
  };

  const clearArmy = () => {
    setSelectedUnits([]);
    setSelectedCommandCards([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-slate-800/80 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">⚔️</span>
              </div>
              <div>
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                  TOWERS
                </h1>
                <p className="text-slate-300 text-lg">Army Builder</p>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-3xl text-amber-400 mb-2 font-semibold">{playerName}</h2>
              <div className="flex items-center justify-center gap-6">
                <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 rounded-xl p-4 border border-blue-400/30">
                  <div className="text-blue-400 text-lg font-semibold">
                    Points Used: {totalCost}
                  </div>
                  <div className="text-blue-300 text-sm">
                    / {DEFAULT_CONFIG.pointLimit} total
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 rounded-xl p-4 border border-green-400/30">
                  <div className="text-green-400 text-lg font-semibold">
                    Remaining: {remainingPoints}
                  </div>
                  <div className="text-green-300 text-sm">
                    points available
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={randomizeArmy}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                <span className="text-lg mr-2">🎲</span>
                Randomize Army
              </Button>
              <Button
                onClick={clearArmy}
                variant="outline"
                className="border-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400 font-bold px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                <span className="text-lg mr-2">🗑️</span>
                Clear All
              </Button>
              
              {selectedUnits.length > 0 && (
                <Button
                  onClick={completeArmy}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 animate-pulse"
                  size="lg"
                >
                  <span className="text-lg mr-2">✓</span>
                  Complete Army ({selectedUnits.length} units)
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Player 1's Army Display (only for Player 2) */}
        {playerId === 'player2' && player1Army && (
          <div className="mb-6">
            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-slate-200">Player 1's Army ({player1Army.totalCost} points)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {player1Army.units.map((templateId, index) => {
                    const template = getUnitTemplate(templateId);
                    if (!template) return null;
                    return (
                      <div key={`p1-${templateId}-${index}`} className="bg-slate-700 p-2 rounded text-xs">
                        <div className="text-slate-100 font-semibold truncate">{template.name}</div>
                        <div className="text-slate-300">{template.cost}pts</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Available Units - Enhanced Cards */}
          <div className="xl:col-span-2">
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-3">
                <span className="text-3xl">🛡️</span>
                Available Units
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {UNIT_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-5 border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                      canAddUnit(template.id) 
                        ? 'border-slate-600/50 hover:border-amber-400/50 cursor-pointer' 
                        : 'border-red-500/50 opacity-60'
                    }`}
                    onClick={() => canAddUnit(template.id) && addUnit(template.id)}
                  >
                    {/* Background glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-amber-100 font-bold text-xl group-hover:text-amber-300 transition-colors">
                            {template.name}
                          </h4>
                          <p className="text-slate-300 text-sm font-medium">{template.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold px-3 py-1 shadow-md"
                          >
                            {template.cost} pts
                          </Badge>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              addUnit(template.id);
                            }}
                            disabled={!canAddUnit(template.id)}
                            size="sm"
                            className={`font-bold transition-all duration-200 ${
                              canAddUnit(template.id)
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-green-500/25'
                                : 'bg-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {canAddUnit(template.id) ? '+ Add' : 'Max Points'}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <div className="text-green-400 font-bold text-lg">{template.move}</div>
                          <div className="text-slate-400 text-xs">Move</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <div className="text-red-400 font-bold text-lg">{template.hp}</div>
                          <div className="text-slate-400 text-xs">Health</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <div className="text-blue-400 font-bold text-lg">{template.defense}</div>
                          <div className="text-slate-400 text-xs">Defense</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <div className="text-orange-400 font-bold">{template.melee || 'N/A'}</div>
                          <div className="text-slate-400 text-xs">Attack</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <div className="text-purple-400 font-bold">{template.supply}</div>
                          <div className="text-slate-400 text-xs">Supply</div>
                        </div>
                      </div>
                      
                      {/* Special Abilities */}
                      {template.abilityDescription && (
                        <div className="bg-amber-900/20 rounded-lg p-2 border border-amber-600/30">
                          <div className="text-amber-300 text-sm">
                            <strong className="text-amber-400">Ability:</strong> {template.abilityDescription}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Army */}
          <div>
            <Card className="bg-amber-950/80 border-amber-700">
              <CardHeader>
                <CardTitle className="text-amber-100">Your Army</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedUnits.length === 0 ? (
                  <p className="text-amber-300 text-center py-8">
                    No units selected
                  </p>
                ) : (
                  <>
                    {selectedUnits.map((templateId, index) => {
                      const template = getUnitTemplate(templateId);
                      if (!template) return null;
                      
                      return (
                        <div
                          key={`${templateId}-${index}`}
                          className="bg-amber-900/50 rounded p-3 border border-amber-700 flex justify-between items-center"
                        >
                          <div>
                            <div className="text-amber-100 font-semibold">
                              {template.name}
                            </div>
                            <div className="text-amber-300 text-sm">
                              {template.cost} points
                            </div>
                          </div>
                          <Button
                            onClick={() => removeUnit(index)}
                            size="sm"
                            variant="destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                    
                    <div className="pt-4 border-t border-amber-700">
                      <Button
                        onClick={completeArmy}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={selectedUnits.length === 0}
                      >
                        Complete Army ({selectedUnits.length} units)
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
