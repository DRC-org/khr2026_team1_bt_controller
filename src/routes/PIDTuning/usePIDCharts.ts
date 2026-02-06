import type { Chart as ChartJS } from 'chart.js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  createLargeChartOptions,
  createPIDTermsChartData,
  createRpmCompareChartData,
  createSingleLineChartData,
  createSmallChartOptions,
} from './chartConfig';
import { CHART_CONFIG } from './constants';
import type { MotorKey, PIDData, PIDGains } from './types';

// Max data points to keep (duration / ~100ms interval + buffer)
const MAX_DATA_POINTS = Math.ceil(CHART_CONFIG.duration / 100) + 20;

// Helper to trim old data points from a chart
function trimChartData(chart: ChartJS<'line'>) {
  for (const dataset of chart.data.datasets) {
    if (dataset.data.length > MAX_DATA_POINTS) {
      dataset.data.splice(0, dataset.data.length - MAX_DATA_POINTS);
    }
  }
}

interface ChartRefs {
  pidTerms: React.RefObject<ChartJS<'line'> | null>;
  rpmCompare: React.RefObject<ChartJS<'line'> | null>;
  pTerm: React.RefObject<ChartJS<'line'> | null>;
  iTerm: React.RefObject<ChartJS<'line'> | null>;
  dTerm: React.RefObject<ChartJS<'line'> | null>;
  outputCurrent: React.RefObject<ChartJS<'line'> | null>;
  targetRpm: React.RefObject<ChartJS<'line'> | null>;
  rpmError: React.RefObject<ChartJS<'line'> | null>;
}

export function usePIDCharts(
  onMessage: (callback: (message: string) => void) => void,
  isDeviceConnected: boolean,
  selectedMotor: MotorKey,
  onGainsUpdate?: (gains: PIDGains) => void,
) {
  const onGainsUpdateRef = useRef(onGainsUpdate);
  useEffect(() => {
    onGainsUpdateRef.current = onGainsUpdate;
  }, [onGainsUpdate]);
  const selectedMotorRef = useRef(selectedMotor);

  useEffect(() => {
    selectedMotorRef.current = selectedMotor;
  }, [selectedMotor]);

  const chartRefs: ChartRefs = {
    pidTerms: useRef<ChartJS<'line'>>(null),
    rpmCompare: useRef<ChartJS<'line'>>(null),
    pTerm: useRef<ChartJS<'line'>>(null),
    iTerm: useRef<ChartJS<'line'>>(null),
    dTerm: useRef<ChartJS<'line'>>(null),
    outputCurrent: useRef<ChartJS<'line'>>(null),
    targetRpm: useRef<ChartJS<'line'>>(null),
    rpmError: useRef<ChartJS<'line'>>(null),
  };

  // Chart data
  const chartData = {
    pidTerms: useMemo(createPIDTermsChartData, []),
    rpmCompare: useMemo(createRpmCompareChartData, []),
    pTerm: useMemo(() => createSingleLineChartData('P Term'), []),
    iTerm: useMemo(() => createSingleLineChartData('I Term'), []),
    dTerm: useMemo(() => createSingleLineChartData('D Term'), []),
    outputCurrent: useMemo(
      () => createSingleLineChartData('Output Current'),
      [],
    ),
    targetRpm: useMemo(() => createSingleLineChartData('Target RPM'), []),
    rpmError: useMemo(() => createSingleLineChartData('RPM Error'), []),
  };

  // Chart options
  const chartOptions = {
    pidTerms: useMemo(() => createLargeChartOptions('Value'), []),
    rpmCompare: useMemo(() => createLargeChartOptions('RPM'), []),
    pTerm: useMemo(() => createSmallChartOptions('P'), []),
    iTerm: useMemo(() => createSmallChartOptions('I'), []),
    dTerm: useMemo(() => createSmallChartOptions('D'), []),
    outputCurrent: useMemo(() => createSmallChartOptions('mA'), []),
    targetRpm: useMemo(() => createSmallChartOptions('RPM'), []),
    rpmError: useMemo(() => createSmallChartOptions('Error'), []),
  };

  const clearAllCharts = () => {
    const refs = Object.values(chartRefs);
    for (const ref of refs) {
      const chart = ref.current;
      if (chart) {
        for (const dataset of chart.data.datasets) {
          dataset.data = [];
        }
        chart.update('quiet');
      }
    }
  };

  const processMessage = useCallback((msg: string) => {
    const {
      pidTerms,
      rpmCompare,
      pTerm,
      iTerm,
      dTerm,
      outputCurrent,
      targetRpm,
      rpmError,
    } = {
      pidTerms: chartRefs.pidTerms.current,
      rpmCompare: chartRefs.rpmCompare.current,
      pTerm: chartRefs.pTerm.current,
      iTerm: chartRefs.iTerm.current,
      dTerm: chartRefs.dTerm.current,
      outputCurrent: chartRefs.outputCurrent.current,
      targetRpm: chartRefs.targetRpm.current,
      rpmError: chartRefs.rpmError.current,
    };

    if (
      !pidTerms ||
      !rpmCompare ||
      !pTerm ||
      !iTerm ||
      !dTerm ||
      !outputCurrent ||
      !targetRpm ||
      !rpmError
    )
      return;

    try {
      const data = JSON.parse(msg) as PIDData;
      if (data.m3508_rpms === undefined) return;

      // PIDゲインをフィードバックから抽出
      if (data.pid_gains && onGainsUpdateRef.current) {
        onGainsUpdateRef.current(data.pid_gains);
      }

      const now = Date.now();
      const {
        m3508_rpms,
        target_rpms,
        output_currents,
        p_terms,
        i_terms,
        d_terms,
      } = data;

      const motor = selectedMotorRef.current;

      // ① PID Terms chart
      pidTerms.data.datasets[0].data.push({ x: now, y: p_terms[motor] });
      pidTerms.data.datasets[1].data.push({ x: now, y: i_terms[motor] });
      pidTerms.data.datasets[2].data.push({ x: now, y: d_terms[motor] });

      // ② RPM Compare chart
      rpmCompare.data.datasets[0].data.push({
        x: now,
        y: target_rpms[motor],
      });
      rpmCompare.data.datasets[1].data.push({ x: now, y: m3508_rpms[motor] });

      // ③～⑧ Single line charts
      pTerm.data.datasets[0].data.push({ x: now, y: p_terms[motor] });
      iTerm.data.datasets[0].data.push({ x: now, y: i_terms[motor] });
      dTerm.data.datasets[0].data.push({ x: now, y: d_terms[motor] });
      outputCurrent.data.datasets[0].data.push({
        x: now,
        y: output_currents[motor],
      });
      targetRpm.data.datasets[0].data.push({ x: now, y: target_rpms[motor] });
      rpmError.data.datasets[0].data.push({
        x: now,
        y: target_rpms[motor] - m3508_rpms[motor],
      });

      // Trim old data points to prevent memory growth
      trimChartData(pidTerms);
      trimChartData(rpmCompare);
      trimChartData(pTerm);
      trimChartData(iTerm);
      trimChartData(dTerm);
      trimChartData(outputCurrent);
      trimChartData(targetRpm);
      trimChartData(rpmError);

      // Note: chartjs-plugin-streaming automatically updates charts
      // at the configured refresh interval, so no manual update() needed
    } catch (_e) {
      console.error('Invalid JSON message:', msg);
    }
  }, []);

  useEffect(() => {
    if (isDeviceConnected) {
      onMessage(processMessage);
    }
  }, [isDeviceConnected, onMessage, processMessage]);

  return {
    chartRefs,
    chartData,
    chartOptions,
    clearAllCharts,
  };
}
