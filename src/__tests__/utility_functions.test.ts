import { describe, it, expect } from 'vitest';

// ==== COORDINATE CLAMPING TESTS ====
function clampValue(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

describe('Value Clamping', () => {
    it('clamps above maximum', () => {
        expect(clampValue(100, 0, 70)).toBe(70);
    });

    it('clamps below minimum', () => {
        expect(clampValue(-100, -70, 70)).toBe(-70);
    });

    it('preserves value within range', () => {
        expect(clampValue(35, -70, 70)).toBe(35);
    });

    it('handles boundary values', () => {
        expect(clampValue(70, -70, 70)).toBe(70);
        expect(clampValue(-70, -70, 70)).toBe(-70);
    });
});

// ==== JOYSTICK VALUE NORMALIZATION TESTS ====
function normalizeJoystickValue(rawValue: number, maxRange: number): number {
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, rawValue / maxRange));
}

describe('Joystick Normalization', () => {
    it('normalizes maximum positive', () => {
        expect(normalizeJoystickValue(70, 70)).toBe(1);
    });

    it('normalizes maximum negative', () => {
        expect(normalizeJoystickValue(-70, 70)).toBe(-1);
    });

    it('normalizes zero', () => {
        expect(normalizeJoystickValue(0, 70)).toBe(0);
    });

    it('normalizes half value', () => {
        expect(normalizeJoystickValue(35, 70)).toBeCloseTo(0.5, 2);
    });

    it('clamps overrange values', () => {
        expect(normalizeJoystickValue(100, 70)).toBe(1);
        expect(normalizeJoystickValue(-100, 70)).toBe(-1);
    });
});

// ==== DISTANCE CALCULATION TESTS ====
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

describe('Distance Calculation', () => {
    it('calculates zero distance', () => {
        expect(calculateDistance(0, 0, 0, 0)).toBe(0);
    });

    it('calculates horizontal distance', () => {
        expect(calculateDistance(0, 0, 100, 0)).toBe(100);
    });

    it('calculates vertical distance', () => {
        expect(calculateDistance(0, 0, 0, 100)).toBe(100);
    });

    it('calculates diagonal distance', () => {
        const dist = calculateDistance(0, 0, 3, 4);
        expect(dist).toBeCloseTo(5, 1); // 3-4-5 triangle
    });

    it('calculates distance in field coordinates', () => {
        const dist = calculateDistance(0, 0, 3500, 7000);
        expect(dist).toBeCloseTo(7826.2, 1); // sqrt(3500^2 + 7000^2)
    });
});

// ==== ANGLE CALCULATION TESTS ====
function calculateAngle(x: number, y: number): number {
    return Math.atan2(y, x) * (180 / Math.PI);
}

describe('Angle Calculation', () => {
    it('calculates 0 degrees (right)', () => {
        expect(calculateAngle(1, 0)).toBeCloseTo(0, 1);
    });

    it('calculates 90 degrees (up)', () => {
        expect(calculateAngle(0, 1)).toBeCloseTo(90, 1);
    });

    it('calculates 180 degrees (left)', () => {
        expect(Math.abs(calculateAngle(-1, 0))).toBeCloseTo(180, 1);
    });

    it('calculates -90 degrees (down)', () => {
        expect(calculateAngle(0, -1)).toBeCloseTo(-90, 1);
    });

    it('calculates 45 degrees', () => {
        expect(calculateAngle(1, 1)).toBeCloseTo(45, 1);
    });
});

// ==== PERCENTAGE CALCULATION TESTS ====
function calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
}

describe('Percentage Calculation', () => {
    it('calculates 100%', () => {
        expect(calculatePercentage(100, 100)).toBe(100);
    });

    it('calculates 50%', () => {
        expect(calculatePercentage(50, 100)).toBe(50);
    });

    it('calculates 0%', () => {
        expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('handles zero total', () => {
        expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('calculates over 100%', () => {
        expect(calculatePercentage(150, 100)).toBe(150);
    });
});

// ==== ROUNDING TESTS ====
function roundToDecimalPlaces(value: number, places: number): number {
    const multiplier = Math.pow(10, places);
    return Math.round(value * multiplier) / multiplier;
}

describe('Rounding', () => {
    it('rounds to integer', () => {
        expect(roundToDecimalPlaces(1.5, 0)).toBe(2);
        expect(roundToDecimalPlaces(1.4, 0)).toBe(1);
    });

    it('rounds to 1 decimal place', () => {
        expect(roundToDecimalPlaces(1.56, 1)).toBe(1.6);
        expect(roundToDecimalPlaces(1.54, 1)).toBe(1.5);
    });

    it('rounds to 2 decimal places', () => {
        expect(roundToDecimalPlaces(1.567, 2)).toBe(1.57);
        expect(roundToDecimalPlaces(1.563, 2)).toBe(1.56);
    });
});

// ==== INTERPOLATION TESTS ====
function linearInterpolate(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

describe('Linear Interpolation', () => {
    it('interpolates at start (t=0)', () => {
        expect(linearInterpolate(0, 100, 0)).toBe(0);
    });

    it('interpolates at end (t=1)', () => {
        expect(linearInterpolate(0, 100, 1)).toBe(100);
    });

    it('interpolates at midpoint (t=0.5)', () => {
        expect(linearInterpolate(0, 100, 0.5)).toBe(50);
    });

    it('interpolates at arbitrary point', () => {
        expect(linearInterpolate(0, 100, 0.75)).toBe(75);
    });

    it('extrapolates beyond range', () => {
        expect(linearInterpolate(0, 100, 1.5)).toBe(150);
    });
});
