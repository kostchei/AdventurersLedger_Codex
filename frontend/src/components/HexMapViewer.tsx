import { useEffect, useRef, useState } from 'react';
import { HexGrid, HexCoord } from '../utils/hexGrid';
import { Map } from '../types';

interface HexMapViewerProps {
  map: Map;
  revealedHexes: Set<string>; // Set of "q,r" strings
  partyPosition?: { hexX: number; hexY: number };
  isDM: boolean;
  onHexClick?: (hex: HexCoord) => void;
}

export default function HexMapViewer({
  map,
  revealedHexes,
  partyPosition,
  isDM,
  onHexClick,
}: HexMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hexGrid, setHexGrid] = useState<HexGrid | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Initialize hex grid
  useEffect(() => {
    const hexSize = Math.min(map.imageWidth / map.hexColumns, map.imageHeight / map.hexRows) / 2;
    const grid = new HexGrid(
      hexSize,
      map.hexColumns,
      map.hexRows,
      map.imageWidth,
      map.imageHeight,
      map.hexOrientation as 'flat' | 'pointy'
    );
    setHexGrid(grid);

    // Load image
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = map.imageUrl;
  }, [map]);

  // Render canvas
  useEffect(() => {
    if (!canvasRef.current || !hexGrid || !imageLoaded || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw map image
    ctx.drawImage(imageRef.current, 0, 0, map.imageWidth, map.imageHeight);

    // Draw fog of war (for non-DMs or DM preview)
    if (!isDM || true) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      for (let q = 0; q < map.hexColumns; q++) {
        for (let r = 0; r < map.hexRows; r++) {
          const hex = { q, r };
          const hexKey = `${q},${r}`;

          // If hex is not revealed, draw fog
          if (!revealedHexes.has(hexKey)) {
            const corners = hexGrid.getHexCorners(hex);
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) {
              ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // Draw hex grid overlay (semi-transparent)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let q = 0; q < map.hexColumns; q++) {
      for (let r = 0; r < map.hexRows; r++) {
        const hex = { q, r };
        const corners = hexGrid.getHexCorners(hex);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Highlight hovered hex (if DM)
    if (isDM && hoveredHex && hexGrid.isInBounds(hoveredHex)) {
      const corners = hexGrid.getHexCorners(hoveredHex);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw party position
    if (partyPosition) {
      const partyHex = { q: partyPosition.hexX, r: partyPosition.hexY };
      const center = hexGrid.hexToPixel(partyHex);

      // Draw party marker (circle)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.8)'; // Green
      ctx.beginPath();
      ctx.arc(center.x, center.y, hexGrid['hexSize'] * 0.4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw "P" text
      ctx.fillStyle = 'white';
      ctx.font = `bold ${hexGrid['hexSize'] * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', center.x, center.y);
    }
  }, [hexGrid, imageLoaded, revealedHexes, hoveredHex, partyPosition, isDM, map]);

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hexGrid || !isDM) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hex = hexGrid.pixelToHex({ x, y });

    if (hexGrid.isInBounds(hex)) {
      setHoveredHex(hex);
    } else {
      setHoveredHex(null);
    }
  };

  // Handle click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hexGrid || !isDM || !onHexClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hex = hexGrid.pixelToHex({ x, y });

    if (hexGrid.isInBounds(hex)) {
      onHexClick(hex);
    }
  };

  if (!imageLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-auto bg-gray-900">
      <canvas
        ref={canvasRef}
        width={map.imageWidth}
        height={map.imageHeight}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredHex(null)}
        onClick={handleClick}
        className={`max-w-full h-auto ${isDM ? 'cursor-crosshair' : ''}`}
        style={{ display: 'block' }}
      />

      {isDM && hoveredHex && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-sm">
          Hex: ({hoveredHex.q}, {hoveredHex.r})
          {onHexClick && <span className="block text-xs text-gray-400 mt-1">Click to move party</span>}
        </div>
      )}
    </div>
  );
}
