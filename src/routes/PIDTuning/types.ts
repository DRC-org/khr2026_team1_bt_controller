export const MOTOR_KEYS = ['fl', 'fr', 'rl', 'rr'] as const;
export type MotorKey = (typeof MOTOR_KEYS)[number];

export type MotorData = { fl: number; fr: number; rl: number; rr: number };

export interface PIDGains {
  kp: number;
  ki: number;
  kd: number;
}

export interface PIDData {
  m3508_rpms: MotorData;
  target_rpms: MotorData;
  output_currents: MotorData;
  p_terms: MotorData;
  i_terms: MotorData;
  d_terms: MotorData;
  pid_gains?: PIDGains;
}

export interface PIDGainConfig {
  label: string;
  key: keyof PIDGains;
  min: number;
  max: number;
  step: number;
  default: number;
}

export const PID_GAIN_CONFIGS: PIDGainConfig[] = [
  { label: 'Kp', key: 'kp', min: 0, max: 10, step: 0.1, default: 0.5 },
  { label: 'Ki', key: 'ki', min: 0, max: 1, step: 0.01, default: 0.05 },
  { label: 'Kd', key: 'kd', min: 0, max: 1, step: 0.01, default: 0.0 },
];

export type ChartDataPoint = { x: number; y: number };
