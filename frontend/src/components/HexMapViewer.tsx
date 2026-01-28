import { useEffect, useRef, useState, useMemo } from 'react';
import { HexGrid } from '../utils/hexGrid';
import type { HexCoord } from '../utils/hexGrid';
import type { Map } from '../types';

interface HexMapViewerProps {
  map: Map;
  currentZ: number;
  revealedHexes: Set<string>; // Set of "q,r,z" strings
  partyPosition?: { hexX: number; hexY: number; z: number };
  isDM: boolean;
  onHexClick?: (hex: HexCoord & { z: number }) => void;
}

export default function HexMapViewer({
  map,
  currentZ,
  revealedHexes,
  partyPosition,
  isDM,
  onHexClick,
}: HexMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const hexGrid = useMemo(() => {
    const hexSize = Math.min(map.imageWidth / map.hexColumns, map.imageHeight / map.hexRows) / 2;
    return new HexGrid(
      hexSize,
      map.hexColumns,
      map.hexRows,
      map.imageWidth,
      map.imageHeight,
      (map.hexOrientation as 'flat' | 'pointy') || 'flat'
    );
  }, [map.imageWidth, map.hexColumns, map.imageHeight, map.hexRows, map.hexOrientation]);

  // Load map image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = map.imageUrl;
    setImageLoaded(false);
  }, [map.imageUrl]);

  // Render canvas
  useEffect(() => {
    if (!canvasRef.current || !hexGrid || !imageLoaded || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw map image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, map.imageWidth, map.imageHeight);

    // 2. Prepare Fog Overlay
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = canvas.width;
    fogCanvas.height = canvas.height;
    const fogCtx = fogCanvas.getContext('2d');
    if (!fogCtx) return;

    // Fill with total fog
    fogCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

    // Punch holes for revealed hexes on the current Z layer
    fogCtx.globalCompositeOperation = 'destination-out';

    // Add SOFTNESS to the holes
    fogCtx.shadowBlur = 20; // Softness radius
    fogCtx.shadowColor = 'black'; // Color doesn't matter much for destination-out but helps preview
    fogCtx.fillStyle = 'black';

    for (let q = 0; q < map.hexColumns; q++) {
      for (let r = 0; r < map.hexRows; r++) {
        const hexKey = `${q},${r},${currentZ}`;
        if (revealedHexes.has(hexKey) || isDM) {
          const corners = hexGrid.getHexCorners({ q, r, z: currentZ });
          fogCtx.beginPath();
          fogCtx.moveTo(corners[0].x, corners[0].y);
          for (let i = 1; i < corners.length; i++) {
            fogCtx.lineTo(corners[i].x, corners[i].y);
          }
          fogCtx.closePath();
          fogCtx.fill();
        }
      }
    }

    // Reset shadow for subsequent drawing
    fogCtx.shadowBlur = 0;

    // Draw the fog layer back onto the main canvas
    ctx.drawImage(fogCanvas, 0, 0);

    // 3. Draw hex grid overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let q = 0; q < map.hexColumns; q++) {
      for (let r = 0; r < map.hexRows; r++) {
        const corners = hexGrid.getHexCorners({ q, r, z: currentZ });
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // 4. Highlight hovered hex (if DM)
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

    // 5. Draw party position if on current Z layer
    if (partyPosition && partyPosition.z === currentZ) {
      const partyHex = { q: partyPosition.hexX, r: partyPosition.hexY, z: partyPosition.z };
      const center = hexGrid.hexToPixel(partyHex);
      const hexSize = hexGrid.hexSize;

      // Draw party marker (circle with glow)
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.9)'; // Green
      ctx.beginPath();
      ctx.arc(center.x, center.y, hexSize * 0.45, 0, 2 * Math.PI);
      ctx.fill();

      ctx.shadowBlur = 0; // Reset shadow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw "P" text
      ctx.fillStyle = 'white';
      ctx.font = `bold ${hexSize * 0.6}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', center.x, center.y);
    }
  }, [hexGrid, imageLoaded, revealedHexes, hoveredHex, partyPosition, isDM, map, currentZ]);

  // Interaction handlers...
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
    setHoveredHex(hexGrid.isInBounds(hex) ? hex : null);
  };

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
      onHexClick({ ...hex, z: currentZ });
    }
  };

  if (!imageLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading map layer {currentZ}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-auto bg-gray-950">
      <canvas
        ref={canvasRef}
        width={map.imageWidth}
        height={map.imageHeight}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredHex(null)}
        onClick={handleClick}
        className={`max-w-full h-auto ${isDM ? 'cursor-crosshair' : ''} shadow-2xl mx-auto`}
        style={{ display: 'block' }}
      />

      {isDM && hoveredHex && (
        <div className="absolute top-4 left-4 bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg shadow-xl text-sm backdrop-blur-md bg-opacity-80">
          <div className="font-bold border-b border-gray-700 pb-1 mb-1">Hex Coordinates</div>
          q: {hoveredHex.q}, r: {hoveredHex.r}, z: {currentZ}
          {onHexClick && <div className="text-xs text-primary-400 mt-2 font-medium">Click to Move Party</div>}
        </div>
      )}
    </div>
  );
}
