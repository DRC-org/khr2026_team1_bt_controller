import type { ChartOptions } from 'chart.js';
import {
  CHART_CONFIG,
  PID_COLORS,
  RPM_COLORS,
  SINGLE_LINE_COLOR,
} from './constants';
import type { ChartDataPoint } from './types';

export function createLargeChartOptions(yLabel: string): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'realtime' as const,
        realtime: {
          duration: CHART_CONFIG.duration,
          refresh: CHART_CONFIG.refresh,
        },
        title: { display: true, text: 'Time' },
      },
      y: {
        title: { display: true, text: yLabel },
      },
    },
    plugins: {
      legend: { position: 'top' as const },
    },
    animation: false as const,
  };
}

export function createSmallChartOptions(yLabel: string): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'realtime' as const,
        realtime: {
          duration: CHART_CONFIG.duration,
          refresh: CHART_CONFIG.refresh,
        },
        title: { display: false },
        ticks: { display: false },
      },
      y: {
        title: { display: true, text: yLabel },
      },
    },
    plugins: {
      legend: { display: false },
    },
    animation: false as const,
  };
}

export function createPIDTermsChartData() {
  return {
    datasets: [
      {
        label: 'P Term',
        borderColor: PID_COLORS.p,
        backgroundColor: PID_COLORS.p,
        data: [] as ChartDataPoint[],
        tension: CHART_CONFIG.tension,
      },
      {
        label: 'I Term',
        borderColor: PID_COLORS.i,
        backgroundColor: PID_COLORS.i,
        data: [] as ChartDataPoint[],
        tension: CHART_CONFIG.tension,
      },
      {
        label: 'D Term',
        borderColor: PID_COLORS.d,
        backgroundColor: PID_COLORS.d,
        data: [] as ChartDataPoint[],
        tension: CHART_CONFIG.tension,
      },
    ],
  };
}

export function createRpmCompareChartData() {
  return {
    datasets: [
      {
        label: 'Target RPM',
        borderColor: RPM_COLORS.target,
        backgroundColor: RPM_COLORS.target,
        data: [] as ChartDataPoint[],
        tension: CHART_CONFIG.tension,
      },
      {
        label: 'Current RPM',
        borderColor: RPM_COLORS.current,
        backgroundColor: RPM_COLORS.current,
        data: [] as ChartDataPoint[],
        tension: CHART_CONFIG.tension,
      },
    ],
  };
}

export function createSingleLineChartData(label: string) {
  return {
    datasets: [
      {
        label,
        borderColor: SINGLE_LINE_COLOR,
        backgroundColor: SINGLE_LINE_COLOR,
        data: [] as ChartDataPoint[],
        tension: CHART_CONFIG.tension,
      },
    ],
  };
}
