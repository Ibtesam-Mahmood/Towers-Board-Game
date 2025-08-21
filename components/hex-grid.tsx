
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { HexPosition, GameState, Unit } from '../lib/game-types';
import { hexToPixel, positionToKey, isValidPosition } from '../lib/hex-utils';
import { getUnitTemplate } from '../lib/unit-templates';
import { getTerrainType } from '../lib/terrain';
import { UnitTooltip, TerrainTooltip } from './enhanced-tooltip-system';

interface HexGridProps {
  gameState: GameState;
  onHexClick: (position: HexPosition) => void;
  selectedPosition?: HexPosition | null;
  highlightedPositions?: HexPosition[];
  attackRangePositions?: HexPosition[];
  onHexHover?: (position: HexPosition | null) => void;
  showOverlays?: boolean;
}

// Dynamic hex size - larger for better immersion
const getHexSize = () => {
  if (typeof window === 'undefined') return 60;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Make hex size larger for better immersion
  const baseSize = Math.min(screenWidth, screenHeight);
  
  if (baseSize < 480) return 40;      // Small mobile
  if (baseSize < 768) return 50;      // Large mobile/small tablet
  if (baseSize < 1024) return 60;     // Tablet
  return 70;                          // Desktop - larger for immersion
};

export function HexGrid({ gameState, onHexClick, selectedPosition, highlightedPositions = [], attackRangePositions = [], onHexHover, showOverlays = true }: HexGridProps) {
  const [hexSize, setHexSize] = useState(60);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  
  // Update hex size on window resize
  useEffect(() => {
    const updateHexSize = () => {
      setHexSize(getHexSize());
    };
    
    updateHexSize(); // Initial size
    window.addEventListener('resize', updateHexSize);
    return () => window.removeEventListener('resize', updateHexSize);
  }, []);

  // Listen for center map events
  useEffect(() => {
    const handleCenterMap = () => {
      if (transformRef.current) {
        transformRef.current.centerView(0.8, 200, 'easeOut');
      }
    };
    
    window.addEventListener('centerMap', handleCenterMap);
    return () => window.removeEventListener('centerMap', handleCenterMap);
  }, []);
  
  const { boardSize } = gameState;
  const HEX_WIDTH = hexSize * 2;
  const HEX_HEIGHT = hexSize * Math.sqrt(3);
  
  // Calculate board dimensions - make larger for immersion
  const boardWidth = (boardSize.width * HEX_WIDTH * 0.75) + hexSize * 4;
  const boardHeight = (boardSize.height * HEX_HEIGHT) + hexSize * 4;
  
  // Better centering offset
  const offsetX = hexSize * 2;
  const offsetY = hexSize * 2;

  const checkIsInDeploymentZone = (pos: HexPosition): boolean => {
    const { width, height } = gameState.boardSize;
    const { q, r } = pos;
    
    // Player 1: top 2 rows, Player 2: bottom 2 rows
    return (r >= 0 && r <= 1 && q >= 0 && q < width) || 
           (r >= height - 2 && r < height && q >= 0 && q < width);
  };

  const renderHex = (position: HexPosition) => {
    if (!isValidPosition(position, boardSize.width, boardSize.height)) {
      return null;
    }

    const { x, y } = hexToPixel(position, hexSize);
    // Apply centering offset
    const centeredX = x + offsetX;
    const centeredY = y + offsetY;
    const posKey = positionToKey(position);
    const terrainId = gameState.terrain[posKey] || 'plain';
    const terrain = getTerrainType(terrainId);
    
    // Find unit at this position (only show alive deployed units)
    const unit = Object.values(gameState.units).find(
      u => u.position && positionToKey(u.position) === posKey && u.isDeployed && u.currentHp > 0
    );

    const isSelected = selectedPosition && positionToKey(selectedPosition) === posKey;
    const isHighlighted = highlightedPositions.some(pos => positionToKey(pos) === posKey);
    const isInAttackRange = attackRangePositions.some(pos => positionToKey(pos) === posKey);
    const isDeploymentZone = checkIsInDeploymentZone(position);
    
    // Enhanced hex colors and styling
    const getHexColor = () => {
      if (isSelected) return '#FFD700'; // Gold for selected
      if (isHighlighted) {
        // Different colors for different action types
        if (unit && unit.playerId !== gameState.currentPlayer) {
          return '#FF6B6B'; // Red for enemy units that can be attacked
        }
        return '#00FF88'; // Bright green for valid moves/actions
      }
      if (isInAttackRange) return '#FF8C42'; // Orange for attack range
      
      let baseColor;
      switch (terrainId) {
        case 'forest': baseColor = '#2D5A2D'; break;
        case 'hill': baseColor = '#8B7355'; break;
        case 'river': baseColor = '#4682B4'; break;
        case 'marsh': baseColor = '#556B2F'; break;
        case 'city': baseColor = '#696969'; break;
        case 'fort': baseColor = '#2F4F4F'; break;
        case 'supply_camp': baseColor = '#DAA520'; break;
        default: baseColor = '#4A5D3A'; break; // Darker green for plains
      }
      
      // Slightly lighten deployment zones
      if (isDeploymentZone && terrainId === 'plain') {
        return '#5A6D4A'; // Slightly lighter green for deployment zones
      }
      
      return baseColor;
    };

    const getStrokeColor = () => {
      if (isSelected) return '#FFA500'; // Orange outline for selected
      if (isHighlighted) {
        if (unit && unit.playerId !== gameState.currentPlayer) {
          return '#FF0000'; // Red outline for attackable enemies
        }
        return '#00CC66'; // Dark green for highlighted
      }
      if (isInAttackRange) return '#FF6600'; // Orange for attack range
      if (isDeploymentZone) return '#8FBC8F'; // Light green for deployment zones (very subtle)
      return '#2A3F2A'; // Dark green-gray for normal borders
    };



    const hexElement = (
      <g key={posKey}>
        {/* Hex shape with enhanced styling */}
        <polygon
          points={getHexPoints(centeredX, centeredY)}
          fill={getHexColor()}
          stroke={getStrokeColor()}
          strokeWidth={isSelected ? 3 : isHighlighted ? 2.5 : isInAttackRange ? 2 : isDeploymentZone ? 1.5 : 1}
          opacity={isHighlighted ? 0.9 : 0.85}
          className="cursor-pointer hover:brightness-110 transition-all duration-150"
          onClick={() => onHexClick(position)}
          style={{
            filter: isHighlighted ? 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.6))' : 
                   isSelected ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' : 'none'
          }}
        />
        
        {/* Terrain label - improved visibility with tooltip */}
        {terrain && terrain.name !== 'Plain' && !unit && (
          <text
            x={centeredX}
            y={centeredY - 8}
            textAnchor="middle"
            className="text-lg font-bold pointer-events-auto cursor-help"
            fill="white"
            style={{ 
              textShadow: '2px 2px 4px black, -1px -1px 2px black',
              fontSize: '18px'
            }}
          >
            <title>{terrain.description || `${terrain.name} terrain`}</title>
            {terrain.name === 'Forest' ? '🌲' :
             terrain.name === 'Hill' ? '⛰️' :
             terrain.name === 'River' ? '🌊' :
             terrain.name === 'Supply Camp' ? '📦' :
             terrain.name === 'Marsh' ? '🌿' :
             terrain.name === 'City' ? '🏘️' :
             terrain.name === 'Fort' ? '🏰' :
             terrain.name[0]}
          </text>
        )}
        
        {/* Action indicator for highlighted hexes */}
        {isHighlighted && !unit && (
          <text
            x={centeredX}
            y={centeredY + 8}
            textAnchor="middle"
            className="text-xl font-bold pointer-events-none"
            fill="white"
            style={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              animation: 'pulse 1.5s infinite'
            }}
          >
            ✨
          </text>
        )}
        
        {/* Unit display with tooltip */}
        {unit && (
          <g className="cursor-pointer">
            <UnitTooltip unit={unit} gameState={gameState}>
              <g style={{ pointerEvents: 'all' }}>
                <UnitHexDisplay unit={unit} x={centeredX} y={centeredY} isSelected={!!isSelected} hexSize={hexSize} />
              </g>
            </UnitTooltip>
          </g>
        )}
        
        {/* Coordinate display (smaller and less intrusive) */}
        <text
          x={centeredX}
          y={centeredY + 30}
          textAnchor="middle"
          className="text-xs pointer-events-none"
          fill="rgba(255,255,255,0.2)"
          style={{ fontSize: '8px' }}
        >
          {position.q},{position.r}
        </text>
      </g>
    );

    // Wrap terrain hexes with tooltips if they have special properties
    if (terrain && terrain.name !== 'Plain' && !unit) {
      return (
        <TerrainTooltip key={posKey} terrainId={terrainId}>
          {hexElement}
        </TerrainTooltip>
      );
    }

    return hexElement;
  };



  const getHexPoints = (x: number, y: number): string => {
    const points: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = x + hexSize * Math.cos(angle);
      const py = y + hexSize * Math.sin(angle);
      points.push([px, py]);
    }
    return points.map(p => p.join(',')).join(' ');
  };

  // Generate all hex positions
  const hexes: JSX.Element[] = [];
  for (let q = 0; q < boardSize.width; q++) {
    for (let r = 0; r < boardSize.height; r++) {
      const hex = renderHex({ q, r });
      if (hex) hexes.push(hex);
    }
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <TransformWrapper
        ref={transformRef}
        initialScale={0.8}
        minScale={0.3}
        maxScale={3}
        limitToBounds={false}
        centerOnInit={true}
        centerZoomedOut={true}
        panning={{
          disabled: false,
          velocityDisabled: false,
          lockAxisX: false,
          lockAxisY: false
        }}
        pinch={{
          disabled: false,
          step: 5
        }}
        wheel={{
          disabled: false,
          step: 0.2
        }}
        doubleClick={{
          disabled: false,
          mode: "zoomIn",
          step: 0.5,
          animationTime: 200
        }}
      >
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="w-full h-full flex items-center justify-center"
        >
          <svg
            width={boardWidth}
            height={boardHeight}
            viewBox={`0 0 ${boardWidth} ${boardHeight}`}
            className="max-w-none select-none"
            preserveAspectRatio="xMidYMid meet"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(139, 115, 85, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(34, 139, 34, 0.2) 0%, transparent 50%)'
            }}
          >
            <defs>
              <style>
                {`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                  }
                  .hex-grid {
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
                  }
                `}
              </style>
            </defs>
            <g className="hex-grid">
              {hexes}
            </g>
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

interface UnitHexDisplayProps {
  unit: Unit;
  x: number;
  y: number;
  isSelected?: boolean;
  hexSize: number;
}

function UnitHexDisplay({ unit, x, y, isSelected = false, hexSize }: UnitHexDisplayProps) {
  const template = getUnitTemplate(unit.templateId);
  if (!template) return null;

  const playerColor = unit.playerId === 'player1' ? '#FF6B6B' : '#4DABF7';
  const hpPercent = unit.currentHp / template.hp;
  const unitRadius = hexSize * 0.65;
  const isDead = unit.currentHp <= 0;
  
  return (
    <g>
      {/* Selection glow effect */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={unitRadius + 4}
          fill="none"
          stroke="#FFD700"
          strokeWidth="3"
          opacity="0.8"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))',
            animation: 'pulse 2s infinite'
          }}
        />
      )}
      
      {/* Unit background circle */}
      <circle
        cx={x}
        cy={y}
        r={unitRadius}
        fill={isDead ? '#4A4A4A' : playerColor}
        stroke={isDead ? '#8B0000' : 'white'}
        strokeWidth={isSelected ? 3 : 2}
        opacity={isDead ? 0.3 : unit.activated ? 0.6 : 0.95}
        style={{
          filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
          ...(isDead && { filter: 'grayscale(100%) drop-shadow(0 1px 2px rgba(0,0,0,0.5))' })
        }}
      />
      
      {/* Unit type icon or initial */}
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        className="text-sm font-bold pointer-events-none"
        fill={isDead ? '#FF0000' : 'white'}
        style={{ 
          textShadow: '2px 2px 4px black',
          fontSize: '16px'
        }}
      >
        {isDead ? '☠️' :
         template.type === 'Infantry' ? '🪖' :
         template.type === 'Cavalry' ? '🐎' :
         template.type === 'Archer' ? '🏹' :
         template.type === 'Artillery' ? '🎯' :
         template.name.substring(0, 2).toUpperCase()}
      </text>
      
      {/* HP display */}
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        className="text-sm font-bold pointer-events-none"
        fill={isDead ? '#8B0000' : hpPercent > 0.5 ? 'white' : '#FF6B6B'}
        style={{ 
          textShadow: '2px 2px 4px black',
          fontSize: '12px',
          ...(isDead && { textDecoration: 'line-through' })
        }}
      >
        {isDead ? 'DEAD' : `${unit.currentHp}/${template.hp}`}
      </text>
      
      {/* Status indicators */}
      <g>
        {/* Morale tokens */}
        {unit.moraleTokens > 0 && (
          <g style={{ pointerEvents: 'all', cursor: 'help' }}>
            <title>Morale Tokens: {unit.moraleTokens} (unit has reduced effectiveness)</title>
            <circle
              cx={x + 20}
              cy={y - 20}
              r={8}
              fill="#FF8C00"
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={x + 20}
              y={y - 16}
              textAnchor="middle"
              className="text-xs font-bold pointer-events-none"
              fill="white"
              style={{ fontSize: '12px' }}
            >
              😰
            </text>
          </g>
        )}
        
        {/* Out of supply indicator */}
        {!unit.inSupply && (
          <g style={{ pointerEvents: 'all', cursor: 'help' }}>
            <title>Out of Supply: Unit fights with reduced effectiveness</title>
            <circle
              cx={x - 20}
              cy={y - 20}
              r={8}
              fill="#DC3545"
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={x - 20}
              y={y - 16}
              textAnchor="middle"
              className="text-xs font-bold pointer-events-none"
              fill="white"
              style={{ fontSize: '12px' }}
            >
              ⚠️
            </text>
          </g>
        )}
        
        {/* Activated indicator */}
        {unit.activated && (
          <g style={{ pointerEvents: 'all', cursor: 'help' }}>
            <title>Activated: Unit has acted this turn</title>
            <circle
              cx={x}
              cy={y - 25}
              r={6}
              fill="#6C757D"
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={x}
              y={y - 21}
              textAnchor="middle"
              className="text-xs font-bold pointer-events-none"
              fill="white"
              style={{ fontSize: '10px' }}
            >
              ✓
            </text>
          </g>
        )}
      </g>
    </g>
  );
}
