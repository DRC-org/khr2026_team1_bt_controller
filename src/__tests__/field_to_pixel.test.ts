import { describe, it, expect } from 'vitest';

// Reverse transformation: Field coordinates (mm) -> Screen pixel position
// This is used to display the robot's position on the map
function fieldToPixel(
    fieldX: number,  // mm, 0-3500
    fieldY: number,  // mm, 0-7000
    mapWidth: number,
    mapHeight: number
): { pixelX: number, pixelY: number } {
    // X: 0mm is at right edge (right: 0%), 3500mm is at left edge (right: 100%)
    // So pixel from right = (fieldX / 3500) * width
    const pixelFromRight = (fieldX / 3500) * mapWidth;
    const pixelX = mapWidth - pixelFromRight;
    
    // Y: 0mm is at bottom edge (bottom: 0%), 7000mm is at top edge (bottom: 100%)
    // So pixel from bottom = (fieldY / 7000) * height
    const pixelFromBottom = (fieldY / 7000) * mapHeight;
    const pixelY = mapHeight - pixelFromBottom;
    
    return { pixelX, pixelY };
}

describe('Field to Pixel Conversion', () => {
    const mapWidth = 350;  // 1px = 10mm scale
    const mapHeight = 700;

    it('converts origin (0, 0) to bottom-right pixel', () => {
        const result = fieldToPixel(0, 0, mapWidth, mapHeight);
        
        expect(result.pixelX).toBe(350); // Right edge
        expect(result.pixelY).toBe(700); // Bottom edge
    });

    it('converts max point (3500, 7000) to top-left pixel', () => {
        const result = fieldToPixel(3500, 7000, mapWidth, mapHeight);
        
        expect(result.pixelX).toBe(0);   // Left edge
        expect(result.pixelY).toBe(0);   // Top edge
    });

    it('converts center point (1750, 3500) to center pixel', () => {
        const result = fieldToPixel(1750, 3500, mapWidth, mapHeight);
        
        expect(result.pixelX).toBe(175); // Center X
        expect(result.pixelY).toBe(350); // Center Y
    });

    it('converts arbitrary point correctly', () => {
        // Robot at (1000, 2000)
        const result = fieldToPixel(1000, 2000, mapWidth, mapHeight);
        
        // pixelFromRight = (1000/3500) * 350 = 100
        // pixelX = 350 - 100 = 250
        expect(result.pixelX).toBe(250);
        
        // pixelFromBottom = (2000/7000) * 700 = 200
        // pixelY = 700 - 200 = 500
        expect(result.pixelY).toBe(500);
    });

    it('handles floating point coordinates', () => {
        const result = fieldToPixel(1234.5, 5678.9, mapWidth, mapHeight);
        
        // Should handle decimal values
        expect(result.pixelX).toBeCloseTo(350 - (1234.5/3500)*350, 1);
        expect(result.pixelY).toBeCloseTo(700 - (5678.9/7000)*700, 1);
    });
});
