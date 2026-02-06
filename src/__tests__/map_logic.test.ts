import { describe, expect, it } from 'vitest';

// Logic from App.tsx handleMapClick
// We extract it for testing or mock the environment
// Since we didn't extract the function to a separate file, we will re-implement the math logic here to verify it.

function calculateTargetCoordinates(
  clickX: number,
  clickY: number,
  rect: { left: number; top: number; width: number; height: number },
) {
  const relX = clickX - rect.left;
  const relY = clickY - rect.top;

  // X (Short edge, 0-3500): displayed using 'right', so 0 is at right edge.
  // X = (distance from right / width) * 3500
  const pixelFromRight = rect.width - relX;
  const targetX = (pixelFromRight / rect.width) * 3500;

  // Y (Long edge, 0-7000): displayed using 'bottom', so 0 is at bottom edge.
  // Y = (distance from bottom / height) * 7000
  const pixelFromBottom = rect.height - relY;
  const targetY = (pixelFromBottom / rect.height) * 7000;

  return { x: Math.round(targetX), y: Math.round(targetY) };
}

describe('Map Coordinate Calculation', () => {
  const mockRect = { left: 0, top: 0, width: 350, height: 700 }; // 1px = 10mm scale

  it('calculates correct coordinates for Bottom-Right (Start)', () => {
    // Bottom-Right corresponds to x=0, y=0
    // Click at width, height
    const result = calculateTargetCoordinates(350, 700, mockRect);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('calculates correct coordinates for Top-Left (Diag)', () => {
    // Top-Left corresponds to x=3500, y=7000
    // Click at 0, 0
    const result = calculateTargetCoordinates(0, 0, mockRect);
    expect(result.x).toBe(3500);
    expect(result.y).toBe(7000);
  });

  it('calculates center point', () => {
    const result = calculateTargetCoordinates(175, 350, mockRect);
    expect(result.x).toBe(1750);
    expect(result.y).toBe(3500);
  });
});
