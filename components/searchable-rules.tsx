'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Search, X } from 'lucide-react';

interface RuleEntry {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  category: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

const rulesDatabase: RuleEntry[] = [
  {
    id: 'movement',
    title: 'Unit Movement',
    content: 'Units can move up to their Move stat in hexes. Movement through difficult terrain costs extra movement points.',
    keywords: ['move', 'movement', 'hex', 'terrain', 'mobility'],
    category: 'Basic Rules',
    difficulty: 'basic'
  },
  {
    id: 'combat-basics',
    title: 'Combat Resolution',
    content: 'Attacker rolls Attack + 1d6 vs Defender\'s Defense + 1d6. Win by 3+ = 2 damage, 1-2 = 1 damage, tie = morale tokens.',
    keywords: ['combat', 'attack', 'defense', 'dice', 'damage', 'morale'],
    category: 'Combat',
    difficulty: 'basic'
  },
  {
    id: 'command-points',
    title: 'Command Points (CP)',
    content: 'Gain 4 CP per turn (max 6). Spend CP on Command Cards or extra activations (1 CP = +1 activation).',
    keywords: ['cp', 'command', 'points', 'activations', 'cards'],
    category: 'Turn Structure',
    difficulty: 'intermediate'
  },
  {
    id: 'supply-lines',
    title: 'Supply Lines',
    content: 'Units must trace supply to deployment edge or Supply Camp through friendly units. Out-of-supply units get -2 Attack/Defense.',
    keywords: ['supply', 'lines', 'camp', 'deployment', 'penalty'],
    category: 'Advanced Rules',
    difficulty: 'advanced'
  },
  {
    id: 'morale-system',
    title: 'Morale Tokens',
    content: 'Units gain morale from combat ties, being out of supply, or losing commanders. 3+ tokens require morale checks.',
    keywords: ['morale', 'tokens', 'retreat', 'commander', 'check'],
    category: 'Advanced Rules',
    difficulty: 'advanced'
  },
  {
    id: 'deployment',
    title: 'Initial Deployment',
    content: 'Deploy up to 5 units in your deployment zone (closest 2 rows). Remaining units stay in reserves.',
    keywords: ['deployment', 'reserves', 'zone', 'initial', 'setup'],
    category: 'Setup',
    difficulty: 'basic'
  },
  {
    id: 'reserve-deployment',
    title: 'Reserve Deployment',
    content: 'Deploy units from reserves as an action (costs 1 activation). Deployed unit is marked as activated.',
    keywords: ['reserves', 'deployment', 'activation', 'action', 'battle'],
    category: 'Turn Structure',
    difficulty: 'intermediate'
  },
  {
    id: 'terrain-effects',
    title: 'Terrain Effects',
    content: 'Plains (no effect), Forest (+1 movement cost, +1 ranged defense), Hills (+1 defense, +1 ranged attack).',
    keywords: ['terrain', 'forest', 'hills', 'plains', 'movement', 'defense', 'attack'],
    category: 'Advanced Rules',
    difficulty: 'intermediate'
  }
];

interface SearchableRulesProps {
  onRuleSelect?: (rule: RuleEntry) => void;
}

export function SearchableRules({ onRuleSelect }: SearchableRulesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = ['all', ...new Set(rulesDatabase.map(rule => rule.category))];
  const difficulties = ['all', 'basic', 'intermediate', 'advanced'];

  const filteredRules = useMemo(() => {
    return rulesDatabase.filter(rule => {
      const matchesSearch = searchTerm === '' || 
        rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || rule.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || rule.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchTerm, selectedCategory, selectedDifficulty]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-700 text-green-200';
      case 'intermediate': return 'bg-yellow-700 text-yellow-200';
      case 'advanced': return 'bg-red-700 text-red-200';
      default: return 'bg-slate-700 text-slate-200';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
  };

  return (
    <Card className="bg-slate-800/50 border-amber-500/30 mt-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search Header */}
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-400">Rule Search & Reference</h3>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search rules... (e.g., 'combat', 'movement', 'supply')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-slate-200"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-slate-200"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>
                  {difficulty === 'all' ? 'All Difficulties' : difficulty}
                </option>
              ))}
            </select>

            {(searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
              <Button
                onClick={clearFilters}
                size="sm"
                variant="outline"
                className="text-xs border-slate-500 text-slate-400 hover:text-slate-200"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredRules.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No rules found matching your search criteria.
              </div>
            ) : (
              filteredRules.map(rule => (
                <div
                  key={rule.id}
                  className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => onRuleSelect?.(rule)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-100">{rule.title}</h4>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {rule.category}
                      </Badge>
                      <Badge className={`text-xs ${getDifficultyColor(rule.difficulty)}`}>
                        {rule.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {rule.content}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rule.keywords.slice(0, 3).map(keyword => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="text-xs border-slate-500 text-slate-400"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}