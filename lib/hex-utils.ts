
import { HexPosition } from './game-types';

// Hex coordinate system utilities (axial coordinates)
export const hexNeighbors = [
  { q: 1, r: 0 },   // East
  { q: 0, r: 1 },   // Southeast 
  { q: -1, r: 1 },  // Southwest
  { q: -1, r: 0 },  // West
  { q: 0, r: -1 },  // Northwest
  { q: 1, r: -1 }   // Northeast
];

export function getNeighbors(pos: HexPosition): HexPosition[] {
  return hexNeighbors.map(neighbor => ({
    q: pos.q + neighbor.q,
    r: pos.r + neighbor.r
  }));
}

export function hexDistance(a: HexPosition, b: HexPosition): number {
  // Convert offset coordinates to axial for distance calculation
  const aq = a.q;
  const ar = a.r - Math.floor(a.q / 2);
  const bq = b.q;
  const br = b.r - Math.floor(b.q / 2);
  
  return (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
}

export function hexToPixel(hex: HexPosition, size: number): { x: number; y: number } {
  // Use offset coordinates for rectangular grid
  const x = size * (3/2 * hex.q);
  const y = size * Math.sqrt(3) * (hex.r + (hex.q % 2) * 0.5);
  return { x, y };
}

export function pixelToHex(point: { x: number; y: number }, size: number): HexPosition {
  // Convert from offset coordinates
  const q = Math.round((2/3 * point.x) / size);
  const r = Math.round((point.y / (size * Math.sqrt(3))) - (q % 2) * 0.5);
  return { q, r };
}

export function hexRound(hex: { q: number; r: number }): HexPosition {
  const s = -hex.q - hex.r;
  let rq = Math.round(hex.q);
  let rr = Math.round(hex.r);
  let rs = Math.round(s);
  
  const q_diff = Math.abs(rq - hex.q);
  const r_diff = Math.abs(rr - hex.r);
  const s_diff = Math.abs(rs - s);
  
  if (q_diff > r_diff && q_diff > s_diff) {
    rq = -rr - rs;
  } else if (r_diff > s_diff) {
    rr = -rq - rs;
  }
  
  return { q: rq, r: rr };
}

export function positionToKey(pos: HexPosition): string {
  return `${pos.q},${pos.r}`;
}

export function keyToPosition(key: string): HexPosition {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function isValidPosition(pos: HexPosition, boardWidth: number, boardHeight: number): boolean {
  // For a rectangular hex grid (offset coordinates)
  return pos.q >= 0 && pos.q < boardWidth && pos.r >= 0 && pos.r < boardHeight;
}

export function getHexesInRange(center: HexPosition, range: number): HexPosition[] {
  const results: HexPosition[] = [];
  
  for (let q = -range; q <= range; q++) {
    const r1 = Math.max(-range, -q - range);
    const r2 = Math.min(range, -q + range);
    
    for (let r = r1; r <= r2; r++) {
      results.push({
        q: center.q + q,
        r: center.r + r
      });
    }
  }
  
  return results;
}

export function getLineOfSight(from: HexPosition, to: HexPosition): HexPosition[] {
  const distance = hexDistance(from, to);
  const results: HexPosition[] = [];
  
  for (let i = 0; i <= distance; i++) {
    const t = distance === 0 ? 0 : i / distance;
    const hex = hexRound({
      q: from.q + (to.q - from.q) * t,
      r: from.r + (to.r - from.r) * t
    });
    results.push(hex);
  }
  
  return results;
}
