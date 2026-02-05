import type { MotorKey } from './types';

export const MOTOR_LABELS: Record<MotorKey, string> = {
  fl: 'FL (Front Left)',
  fr: 'FR (Front Right)',
  rl: 'RL (Rear Left)',
  rr: 'RR (Rear Right)',
};

export const MOTOR_COLORS: Record<MotorKey, string> = {
  fl: 'rgb(255, 99, 132)',
  fr: 'rgb(54, 162, 235)',
  rl: 'rgb(255, 206, 86)',
  rr: 'rgb(75, 192, 192)',
};

export const PID_COLORS = {
  p: 'rgb(255, 99, 132)',
  i: 'rgb(54, 162, 235)',
  d: 'rgb(75, 192, 192)',
} as const;

export const RPM_COLORS = {
  target: 'rgb(255, 99, 132)',
  current: 'rgb(54, 162, 235)',
} as const;

export const SINGLE_LINE_COLOR = 'rgb(59, 130, 246)';

export const CHART_CONFIG = {
  duration: 10000,
  refresh: 50,
  tension: 0.3,
} as const;
