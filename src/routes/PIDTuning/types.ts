export const MOTOR_KEYS = ['fl', 'fr', 'rl', 'rr'] as const;
export type MotorKey = (typeof MOTOR_KEYS)[number];

export type MotorData = { fl: number; fr: number; rl: number; rr: number };

export interface PIDData {
  m3508_rpms: MotorData;
  target_rpms: MotorData;
  output_currents: MotorData;
  p_terms: MotorData;
  i_terms: MotorData;
  d_terms: MotorData;
}

export type ChartDataPoint = { x: number; y: number };
