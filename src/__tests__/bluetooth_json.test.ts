import { describe, expect, it } from 'vitest';

// Logic from App.tsx - sendJsonData function
// Simulating the data formatting logic
interface JoystickData {
  type: 'joystick';
  l_x: number;
  l_y: number;
  r: number;
}

interface NavigateData {
  type: 'navigate';
  x: number;
  y: number;
}

type TxData = JoystickData | NavigateData;

function formatJsonForBluetooth(data: TxData[]): string {
  return JSON.stringify(data);
}

function parseBluetoothJson(jsonStr: string): TxData[] {
  return JSON.parse(jsonStr);
}

describe('Bluetooth JSON Formatting', () => {
  it('formats joystick data correctly', () => {
    const data: JoystickData[] = [
      {
        type: 'joystick',
        l_x: 50,
        l_y: -30,
        r: 20,
      },
    ];

    const jsonStr = formatJsonForBluetooth(data);
    const parsed = JSON.parse(jsonStr);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe('joystick');
    expect(parsed[0].l_x).toBe(50);
    expect(parsed[0].l_y).toBe(-30);
    expect(parsed[0].r).toBe(20);
  });

  it('formats navigation data correctly', () => {
    const data: NavigateData[] = [
      {
        type: 'navigate',
        x: 1750,
        y: 3500,
      },
    ];

    const jsonStr = formatJsonForBluetooth(data);
    const parsed = JSON.parse(jsonStr);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe('navigate');
    expect(parsed[0].x).toBe(1750);
    expect(parsed[0].y).toBe(3500);
  });

  it('handles zero values', () => {
    const data: JoystickData[] = [
      {
        type: 'joystick',
        l_x: 0,
        l_y: 0,
        r: 0,
      },
    ];

    const jsonStr = formatJsonForBluetooth(data);
    const parsed = parseBluetoothJson(jsonStr);

    expect(parsed[0]).toEqual(data[0]);
  });

  it('handles extreme joystick values', () => {
    const data: JoystickData[] = [
      {
        type: 'joystick',
        l_x: -70, // Max left
        l_y: -70, // Max up
        r: 70, // Max right rotate
      },
    ];

    const jsonStr = formatJsonForBluetooth(data);
    const parsed = parseBluetoothJson(jsonStr);

    const joystickData = parsed[0] as JoystickData;
    expect(joystickData.l_x).toBe(-70);
    expect(joystickData.l_y).toBe(-70);
    expect(joystickData.r).toBe(70);
  });

  it('round-trips data correctly', () => {
    const original: TxData[] = [
      { type: 'joystick', l_x: 35, l_y: -50, r: 10 },
      { type: 'navigate', x: 2500, y: 5000 },
    ];

    const jsonStr = formatJsonForBluetooth(original);
    const parsed = parseBluetoothJson(jsonStr);

    expect(parsed).toEqual(original);
  });
});
