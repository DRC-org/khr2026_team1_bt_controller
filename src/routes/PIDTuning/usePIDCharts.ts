import type { Chart as ChartJS } from 'chart.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createLargeChartOptions,
  createPIDTermsChartData,
  createRpmCompareChartData,
  createSingleLineChartData,
  createSmallChartOptions,
} from './chartConfig';
import type { MotorKey, PIDData, PIDGains } from './types';

export interface DebugStats {
  msgRate: string;
  avgProcessTime: string;
  maxProcessTime: string;
  maxInterval: string;
  datasetSize: number;
  parseErrors: number;
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

  // Dedup gains updates to avoid unnecessary React re-renders
  const lastGainsRef = useRef<PIDGains | null>(null);

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
    for (const ref of Object.values(chartRefs)) {
      const chart = ref.current;
      if (chart) {
        for (const dataset of chart.data.datasets) {
          dataset.data = [];
        }
        chart.update('quiet');
      }
    }
  };

  // === DEBUG ===
  const [debugStats, setDebugStats] = useState<DebugStats | null>(null);
  const debugRef = useRef({
    msgCount: 0,
    lastLogTime: performance.now(),
    lastMsgTime: 0,
    maxInterval: 0,
    totalProcessTime: 0,
    maxProcessTime: 0,
    parseErrors: 0,
  });

  // BLE message handler: push data only (streaming plugin handles rendering)
  const processMessage = useCallback((msg: string) => {
    const t0 = performance.now();
    const dbg = debugRef.current;
    if (dbg.lastMsgTime > 0) {
      const interval = t0 - dbg.lastMsgTime;
      if (interval > dbg.maxInterval) dbg.maxInterval = interval;
    }
    dbg.lastMsgTime = t0;
    dbg.msgCount++;

    const pidTerms = chartRefs.pidTerms.current;
    const rpmCompare = chartRefs.rpmCompare.current;
    const pTermChart = chartRefs.pTerm.current;
    const iTermChart = chartRefs.iTerm.current;
    const dTermChart = chartRefs.dTerm.current;
    const outputCurrent = chartRefs.outputCurrent.current;
    const targetRpmChart = chartRefs.targetRpm.current;
    const rpmError = chartRefs.rpmError.current;

    if (
      !pidTerms ||
      !rpmCompare ||
      !pTermChart ||
      !iTermChart ||
      !dTermChart ||
      !outputCurrent ||
      !targetRpmChart ||
      !rpmError
    )
      return;

    try {
      const data = JSON.parse(msg) as PIDData;
      if (data.m3508_rpms === undefined) return;

      // Only trigger React re-render when gains actually change
      if (data.pid_gains && onGainsUpdateRef.current) {
        const g = data.pid_gains;
        const prev = lastGainsRef.current;
        if (!prev || prev.kp !== g.kp || prev.ki !== g.ki || prev.kd !== g.kd) {
          lastGainsRef.current = g;
          onGainsUpdateRef.current(g);
        }
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

      // Data push only - no chart.update(), no trimming
      // Streaming plugin renders at frameRate and auto-trims via ttl
      pidTerms.data.datasets[0].data.push({ x: now, y: p_terms[motor] });
      pidTerms.data.datasets[1].data.push({ x: now, y: i_terms[motor] });
      pidTerms.data.datasets[2].data.push({ x: now, y: d_terms[motor] });

      rpmCompare.data.datasets[0].data.push({ x: now, y: target_rpms[motor] });
      rpmCompare.data.datasets[1].data.push({ x: now, y: m3508_rpms[motor] });

      pTermChart.data.datasets[0].data.push({ x: now, y: p_terms[motor] });
      iTermChart.data.datasets[0].data.push({ x: now, y: i_terms[motor] });
      dTermChart.data.datasets[0].data.push({ x: now, y: d_terms[motor] });
      outputCurrent.data.datasets[0].data.push({
        x: now,
        y: output_currents[motor],
      });
      targetRpmChart.data.datasets[0].data.push({
        x: now,
        y: target_rpms[motor],
      });
      rpmError.data.datasets[0].data.push({
        x: now,
        y: target_rpms[motor] - m3508_rpms[motor],
      });
    } catch (_e) {
      dbg.parseErrors++;
      console.error('Invalid JSON message:', msg.slice(0, 100), `(${msg.length}B)`);
    }

    // === DEBUG: measure processMessage time ===
    const elapsed = performance.now() - t0;
    dbg.totalProcessTime += elapsed;
    if (elapsed > dbg.maxProcessTime) dbg.maxProcessTime = elapsed;

    // Log & update UI every 3 seconds
    if (t0 - dbg.lastLogTime > 3000) {
      const datasetSize = chartRefs.pidTerms.current?.data.datasets[0].data.length ?? 0;
      const stats: DebugStats = {
        msgRate: (dbg.msgCount / 3).toFixed(1),
        avgProcessTime: (dbg.totalProcessTime / dbg.msgCount).toFixed(2),
        maxProcessTime: dbg.maxProcessTime.toFixed(2),
        maxInterval: dbg.maxInterval.toFixed(0),
        datasetSize,
        parseErrors: dbg.parseErrors,
      };
      console.log(
        `[PID DEBUG] ${dbg.msgCount} msgs in 3s (${stats.msgRate}/s) | ` +
        `processMsg: avg=${stats.avgProcessTime}ms, max=${stats.maxProcessTime}ms | ` +
        `maxInterval: ${stats.maxInterval}ms | ` +
        `datasetSize: ${datasetSize} | ` +
        `parseErrors: ${dbg.parseErrors}`
      );
      setDebugStats(stats);
      dbg.msgCount = 0;
      dbg.lastLogTime = t0;
      dbg.maxInterval = 0;
      dbg.totalProcessTime = 0;
      dbg.maxProcessTime = 0;
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
    debugStats,
  };
}
