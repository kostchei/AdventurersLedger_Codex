// Hex grid utilities for flat-top hexagons

export interface HexCoord {
  q: number; // column
  r: number; // row
}

export interface Point {
  x: number;
  y: number;
}

export class HexGrid {
  private hexSize: number;
  private orientation: 'flat' | 'pointy';
  private columns: number;
  private rows: number;
  private width: number;
  private height: number;

  constructor(
    hexSize: number,
    columns: number,
    rows: number,
    width: number,
    height: number,
    orientation: 'flat' | 'pointy' = 'flat'
  ) {
    this.hexSize = hexSize;
    this.orientation = orientation;
    this.columns = columns;
    this.rows = rows;
    this.width = width;
    this.height = height;
  }

  // Convert hex coordinates to pixel coordinates
  hexToPixel(hex: HexCoord): Point {
    const size = this.hexSize;

    if (this.orientation === 'flat') {
      const x = size * (3 / 2 * hex.q);
      const y = size * Math.sqrt(3) * (hex.r + hex.q / 2);
      return { x, y };
    } else {
      // Pointy top
      const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
      const y = size * (3 / 2 * hex.r);
      return { x, y };
    }
  }

  // Convert pixel coordinates to hex coordinates
  pixelToHex(point: Point): HexCoord {
    const size = this.hexSize;

    if (this.orientation === 'flat') {
      const q = (2 / 3 * point.x) / size;
      const r = (-1 / 3 * point.x + Math.sqrt(3) / 3 * point.y) / size;
      return this.roundHex(q, r);
    } else {
      // Pointy top
      const q = (Math.sqrt(3) / 3 * point.x - 1 / 3 * point.y) / size;
      const r = (2 / 3 * point.y) / size;
      return this.roundHex(q, r);
    }
  }

  // Round fractional hex coordinates to nearest hex
  private roundHex(q: number, r: number): HexCoord {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  // Get all hex corners for drawing
  getHexCorners(hex: HexCoord): Point[] {
    const center = this.hexToPixel(hex);
    const corners: Point[] = [];
    const size = this.hexSize;

    for (let i = 0; i < 6; i++) {
      const angleDeg = this.orientation === 'flat' ? 60 * i : 60 * i - 30;
      const angleRad = (Math.PI / 180) * angleDeg;
      corners.push({
        x: center.x + size * Math.cos(angleRad),
        y: center.y + size * Math.sin(angleRad),
      });
    }

    return corners;
  }

  // Get all hexes within range
  getHexesInRange(center: HexCoord, range: number): HexCoord[] {
    const hexes: HexCoord[] = [];

    for (let q = -range; q <= range; q++) {
      for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
        hexes.push({ q: center.q + q, r: center.r + r });
      }
    }

    return hexes;
  }

  // Check if hex is within grid bounds
  isInBounds(hex: HexCoord): boolean {
    return hex.q >= 0 && hex.q < this.columns && hex.r >= 0 && hex.r < this.rows;
  }

  // Calculate hex distance
  hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }
}
