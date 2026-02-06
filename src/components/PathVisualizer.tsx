interface Spot {
  name: string;
  x: number;
  y: number;
  score: number;
  required_for_vgoal: boolean;
}

interface PathVisualizerProps {
  spots: Record<number, Spot>;
  path: number[];
  mapWidth: number;
  mapHeight: number;
}

// Convert field coordinates (meters) to pixel position
function fieldToPixel(
  fieldX: number, // meters, 0-3.5
  fieldY: number, // meters, 0-7.0
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number } {
  // Field: 3.5m x 7.0m
  // X: 0m is at right edge, 3.5m is at left edge
  // Y: 0m is at bottom edge, 7.0m is at top edge

  const pixelFromRight = (fieldX / 3.5) * mapWidth;
  const pixelX = mapWidth - pixelFromRight;

  const pixelFromBottom = (fieldY / 7.0) * mapHeight;
  const pixelY = mapHeight - pixelFromBottom;

  return { x: pixelX, y: pixelY };
}

export function PathVisualizer({
  spots,
  path,
  mapWidth,
  mapHeight,
}: PathVisualizerProps) {
  if (path.length === 0) return null;

  // Calculate pixel positions for all spots in path
  const coordCounts = new Map<string, number>();

  const pathPixels = path.map((spotId, index) => {
    const spot = spots[spotId];
    // Safety check just in case
    if (!spot) return { x: 0, y: 0, id: spotId, name: 'Unknown', index };

    let pos = fieldToPixel(spot.x, spot.y, mapWidth, mapHeight);
    
    // Create a unique key for this coordinate
    const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
    const count = coordCounts.get(key) || 0;
    
    // If revisited, offset the position slightly to avoid overlap
    if (count > 0) {
      pos = { ...pos, x: pos.x + count * 25 }; // Offset by 25px to the right
    }
    
    coordCounts.set(key, count + 1);

    return { id: spotId, index, name: spot.name, ...pos };
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ width: mapWidth, height: mapHeight }}
    >
      <title>Robot path visualization</title>
      {/* Draw path lines */}
      {pathPixels.map((point, index) => {
        if (index === 0) return null;
        const prevPoint = pathPixels[index - 1];

        return (
          <line
            key={`line-${point.index}-${index}`}
            x1={prevPoint.x}
            y1={prevPoint.y}
            x2={point.x}
            y2={point.y}
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="5,5"
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
        </marker>
      </defs>

      {/* Draw spots */}
      {pathPixels.map((point) => (
        <g key={`spot-${point.index}`}>
          {/* Spot circle */}
          <circle
            cx={point.x}
            cy={point.y}
            r="8"
            fill={spots[point.id].required_for_vgoal ? '#ef4444' : '#10b981'}
            stroke="white"
            strokeWidth="2"
          />

          {/* Order number */}
          <circle
            cx={point.x}
            cy={point.y - 20}
            r="10"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
            fillOpacity="0.8"
          />
          <text
            x={point.x}
            y={point.y - 16}
            fontSize="12"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            {point.index + 1}
          </text>

          {/* Spot name */}
          <text
            x={point.x}
            y={point.y + 25}
            fontSize="10"
            fill="#1f2937"
            textAnchor="middle"
            fontWeight="500"
          >
            {point.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
