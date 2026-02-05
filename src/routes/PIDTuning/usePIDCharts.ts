import type { Chart as ChartJS } from 'chart.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createLargeChartOptions,
  createPIDTermsChartData,
  createRpmCompareChartData,
  createSingleLineChartData,
  createSmallChartOptions,
} from './chartConfig';
import type { MotorKey, PIDData } from './types';

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
  receivedMessages: string[],
  isDeviceConnected: boolean,
  selectedMotor: MotorKey,
) {
  const [lastProcessedIdx, setLastProcessedIdx] = useState(-1);

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

  useEffect(() => {
    if (!isDeviceConnected) {
      setLastProcessedIdx(-1);
      return;
    }

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

    for (let i = lastProcessedIdx + 1; i < receivedMessages.length; i++) {
      const msg = receivedMessages[i];
      try {
        const data = JSON.parse(msg) as PIDData;
        if (data.m3508_rpms === undefined) continue;

        const now = Date.now();
        const {
          m3508_rpms,
          target_rpms,
          output_currents,
          p_terms,
          i_terms,
          d_terms,
        } = data;

        const motor = selectedMotor;

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

        // Update all charts
        pidTerms.update('quiet');
        rpmCompare.update('quiet');
        pTerm.update('quiet');
        iTerm.update('quiet');
        dTerm.update('quiet');
        outputCurrent.update('quiet');
        targetRpm.update('quiet');
        rpmError.update('quiet');
      } catch (_e) {
        console.error('Invalid JSON message:', msg);
      }
    }
    if (receivedMessages.length > 0) {
      setLastProcessedIdx(receivedMessages.length - 1);
    }
  }, [receivedMessages, lastProcessedIdx, isDeviceConnected, selectedMotor]);

  return {
    chartRefs,
    chartData,
    chartOptions,
    clearAllCharts,
  };
}
