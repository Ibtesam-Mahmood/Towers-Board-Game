'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sword, Shield, Heart, Zap, Coins } from 'lucide-react';

interface UnitTemplate {
  id: string;
  name: string;
  cost: number;
  move: number;
  hp: number;
  attack: number;
  defense: number;
  supply: number;
  abilities?: string[];
  description: string;
  role: 'Infantry' | 'Elite' | 'Support' | 'Specialist';
}

const unitTemplates: UnitTemplate[] = [
  {
    id: 'militia',
    name: 'Militia',
    cost: 4,
    move: 2,
    hp: 1,
    attack: 2,
    defense: 2,
    supply: 1,
    description: 'Cheap basic infantry. Good for holding ground and overwhelming enemies with numbers.',
    role: 'Infantry'
  },
  {
    id: 'warrior',
    name: 'Warrior',
    cost: 8,
    move: 2,
    hp: 3,
    attack: 4,
    defense: 3,
    supply: 2,
    description: 'Reliable melee fighters. The backbone of most armies with solid stats across the board.',
    role: 'Infantry'
  },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    cost: 6,
    move: 3,
    hp: 2,
    attack: 3,
    defense: 2,
    supply: 1,
    abilities: ['Ranged Attack', 'Mobile'],
    description: 'Fast-moving ranged units. Excel at hit-and-run tactics and controlling key positions.',
    role: 'Specialist'
  },
  {
    id: 'shardbearer',
    name: 'Shardbearer',
    cost: 24,
    move: 2,
    hp: 5,
    attack: 6,
    defense: 5,
    supply: 3,
    abilities: ['Heavy Armor', 'Devastating Strike'],
    description: 'Elite warriors with magical armor. Expensive but nearly unstoppable in combat.',
    role: 'Elite'
  },
  {
    id: 'commander',
    name: 'Commander',
    cost: 20,
    move: 2,
    hp: 4,
    attack: 4,
    defense: 4,
    supply: 2,
    abilities: ['Command Aura', 'Rally'],
    description: 'Provides leadership and tactical bonuses. Essential for maintaining army morale.',
    role: 'Support'
  },
  {
    id: 'siege-engine',
    name: 'Siege Engine',
    cost: 16,
    move: 1,
    hp: 3,
    attack: 5,
    defense: 2,
    supply: 3,
    abilities: ['Long Range', 'Area Attack'],
    description: 'Slow but powerful ranged weapon. Can devastate enemy formations from afar.',
    role: 'Support'
  }
];

export function InteractiveUnitShowcase() {
  const [selectedUnit, setSelectedUnit] = useState<UnitTemplate>(unitTemplates[0]);
  const [compareUnit, setCompareUnit] = useState<UnitTemplate | null>(null);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Infantry': return 'bg-blue-700 text-blue-200';
      case 'Elite': return 'bg-purple-700 text-purple-200';
      case 'Support': return 'bg-green-700 text-green-200';
      case 'Specialist': return 'bg-yellow-700 text-yellow-200';
      default: return 'bg-slate-700 text-slate-200';
    }
  };

  const StatBar = ({ value, max = 6, color = 'bg-blue-500' }: { value: number; max?: number; color?: string }) => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
      <span className="text-sm font-mono w-4">{value}</span>
    </div>
  );

  const UnitCard = ({ unit, isCompare = false }: { unit: UnitTemplate; isCompare?: boolean }) => (
    <div className={`bg-slate-800/50 border rounded-lg p-4 ${isCompare ? 'border-yellow-500/50' : 'border-slate-600/50'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-semibold text-slate-100">{unit.name}</h4>
          <Badge className={`text-xs ${getRoleColor(unit.role)}`}>
            {unit.role}
          </Badge>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-400">
            <Coins size={14} />
            <span className="font-bold">{unit.cost}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-green-400" />
            <span className="text-xs text-slate-300">Move</span>
            <StatBar value={unit.move} max={4} color="bg-green-500" />
          </div>
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-red-400" />
            <span className="text-xs text-slate-300">HP</span>
            <StatBar value={unit.hp} max={6} color="bg-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sword size={14} className="text-orange-400" />
            <span className="text-xs text-slate-300">Attack</span>
            <StatBar value={unit.attack} max={6} color="bg-orange-500" />
          </div>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-400" />
            <span className="text-xs text-slate-300">Defense</span>
            <StatBar value={unit.defense} max={6} color="bg-blue-500" />
          </div>
        </div>
      </div>

      {unit.abilities && (
        <div className="mb-3">
          <div className="text-xs text-slate-400 mb-1">Special Abilities:</div>
          <div className="flex flex-wrap gap-1">
            {unit.abilities.map(ability => (
              <Badge key={ability} variant="outline" className="text-xs border-amber-500/50 text-amber-300">
                {ability}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-300 leading-relaxed">
        {unit.description}
      </p>
    </div>
  );

  return (
    <Card className="bg-slate-800/50 border-amber-500/30 mt-4">
      <CardHeader>
        <CardTitle className="text-amber-400 text-lg">
          ⚔️ Interactive Unit Showcase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unit Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {unitTemplates.map(unit => (
            <Button
              key={unit.id}
              onClick={() => setSelectedUnit(unit)}
              size="sm"
              variant={selectedUnit.id === unit.id ? "default" : "outline"}
              className={`text-xs p-2 h-auto flex flex-col ${
                selectedUnit.id === unit.id 
                  ? 'bg-amber-600 hover:bg-amber-700 text-slate-900' 
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="font-semibold">{unit.name}</div>
              <div className="text-xs opacity-75">{unit.cost} pts</div>
            </Button>
          ))}
        </div>

        {/* Main Unit Display */}
        <UnitCard unit={selectedUnit} />

        {/* Compare Button */}
        <div className="flex gap-2">
          <select
            value={compareUnit?.id || ''}
            onChange={(e) => {
              const unit = unitTemplates.find(u => u.id === e.target.value);
              setCompareUnit(unit || null);
            }}
            className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 flex-1"
          >
            <option value="">Compare with...</option>
            {unitTemplates
              .filter(u => u.id !== selectedUnit.id)
              .map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.cost} pts)
                </option>
              ))}
          </select>
          {compareUnit && (
            <Button
              onClick={() => setCompareUnit(null)}
              size="sm"
              variant="outline"
              className="border-slate-500 text-slate-400 hover:text-slate-200"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Comparison Display */}
        {compareUnit && (
          <div className="border-t border-slate-600 pt-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-3">Comparison View</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <UnitCard unit={selectedUnit} />
              <UnitCard unit={compareUnit} isCompare />
            </div>
          </div>
        )}

        {/* Army Building Tips */}
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-amber-400 mb-2">💡 Army Building Tips</h4>
          <ul className="text-xs text-amber-200 space-y-1">
            <li>• Balance cheap units with elite forces for tactical flexibility</li>
            <li>• Include support units like Commanders for army-wide benefits</li>
            <li>• Consider supply costs - expensive units drain your logistics</li>
            <li>• Mix unit roles: Infantry holds ground, Specialists provide mobility</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}