

'use client';

import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { Unit, GameState } from '../lib/game-types';
import { getUnitTemplate } from '../lib/unit-templates';
import { getTerrainType } from '../lib/terrain';
import { Sword, Shield, Heart, Zap, Users, MapPin, Move, Eye } from 'lucide-react';

interface UnitTooltipProps {
  unit: Unit;
  gameState: GameState;
  children: React.ReactNode;
}

export function UnitTooltip({ unit, gameState, children }: UnitTooltipProps) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return <>{children}</>;

  const hpPercent = unit.currentHp / template.hp;
  const isDead = unit.currentHp <= 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-0 bg-slate-800 border-amber-500 z-[60]">
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  {template.type === 'Infantry' ? '🪖' :
                   template.type === 'Cavalry' ? '🐎' :
                   template.type === 'Archer' ? '🏹' :
                   template.type === 'Artillery' ? '🎯' : '⚔️'}
                  {template.name}
                  {isDead && '☠️'}
                </h3>
                <p className="text-slate-400 text-sm">{template.type}</p>
                <p className="text-amber-300 text-xs">{unit.playerId === 'player1' ? 'Player 1' : 'Player 2'}</p>
              </div>
              <div className="text-right">
                <Badge variant={hpPercent > 0.6 ? 'default' : hpPercent > 0.3 ? 'secondary' : 'destructive'}>
                  {unit.currentHp}/{template.hp} HP
                </Badge>
              </div>
            </div>
            
            {/* Combat Stats */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-1">
                <Sword size={14} />
                Combat Stats
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Melee:</span>
                  <span className="text-red-400 font-bold">{template.melee || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Ranged:</span>
                  <span className="text-blue-400 font-bold">{template.ranged || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Defense:</span>
                  <span className="text-green-400 font-bold">{template.defense}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Movement:</span>
                  <span className="text-yellow-400 font-bold">{template.move}</span>
                </div>
              </div>
            </div>

            {/* Status Effects */}
            <div className="space-y-2">
              <h4 className="text-amber-400 font-semibold text-sm flex items-center gap-1">
                <Heart size={14} />
                Status
              </h4>
              <div className="flex flex-wrap gap-1">
                {unit.moraleTokens > 0 && (
                  <Badge className="bg-orange-600 text-xs">
                    😰 Morale: {unit.moraleTokens}
                  </Badge>
                )}
                {!unit.inSupply && (
                  <Badge variant="destructive" className="text-xs">
                    ⚠️ Out of Supply
                  </Badge>
                )}
                {unit.activated && gameState.currentPhase === 'battle' && (
                  <Badge className="bg-gray-600 text-xs">
                    ✓ Activated
                  </Badge>
                )}
                {unit.isInReserves && (
                  <Badge className="bg-blue-600 text-xs">
                    📦 In Reserve
                  </Badge>
                )}
                {isDead && (
                  <Badge variant="destructive" className="text-xs">
                    ☠️ Dead
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Special Ability */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <h4 className="text-amber-400 font-semibold mb-1 text-sm flex items-center gap-1">
                <Zap size={14} />
                Special Ability
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">{template.abilityDescription}</p>
            </div>

            {/* Keywords */}
            {template.keywords && template.keywords.length > 0 && (
              <div>
                <h4 className="text-amber-400 font-semibold mb-1 text-sm">Keywords</h4>
                <div className="flex flex-wrap gap-1">
                  {template.keywords.map(keyword => (
                    <Badge key={keyword} variant="outline" className="text-xs border-amber-500 text-amber-300">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface TerrainTooltipProps {
  terrainId: string;
  children: React.ReactNode;
}

export function TerrainTooltip({ terrainId, children }: TerrainTooltipProps) {
  const terrain = getTerrainType(terrainId);
  if (!terrain || terrain.name === 'Plain') return <>{children}</>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-0 bg-slate-800 border-amber-500 z-[60]">
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {terrain.name === 'Forest' ? '🌲' :
                 terrain.name === 'Hill' ? '⛰️' :
                 terrain.name === 'River' ? '🌊' :
                 terrain.name === 'Marsh' ? '🌿' :
                 terrain.name === 'City' ? '🏘️' :
                 terrain.name === 'Fort' ? '🏰' :
                 terrain.name === 'Supply Camp' ? '📦' : '🟢'}
              </span>
              <h3 className="font-bold text-white">{terrain.name}</h3>
            </div>
            
            {terrain.description && (
              <p className="text-slate-300 text-sm leading-relaxed">{terrain.description}</p>
            )}
            
            <div className="bg-slate-700/50 rounded p-2 space-y-1">
              {terrain.movementCost !== 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Movement Cost:</span>
                  <span className="text-yellow-400 font-semibold">{terrain.movementCost}</span>
                </div>
              )}
              
              {terrain.defenseBonus !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Defense Bonus:</span>
                  <span className="text-green-400 font-semibold">+{terrain.defenseBonus}</span>
                </div>
              )}
              
              {terrain.rangedDefenseBonus !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">vs Ranged:</span>
                  <span className="text-blue-400 font-semibold">+{terrain.rangedDefenseBonus}</span>
                </div>
              )}
              
              {terrain.name === 'Supply Camp' && (
                <div className="text-xs text-purple-300 mt-2">
                  🔗 Units within 3 hexes are in supply and fight better
                </div>
              )}
            </div>
            
            {terrain.blocks_line_of_sight && (
              <div className="text-xs text-red-300">
                👁️ Blocks line of sight for ranged attacks
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

