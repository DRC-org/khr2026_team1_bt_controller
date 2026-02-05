import 'chartjs-adapter-luxon';
import {
  RealTimeScale,
  StreamingPlugin,
} from '@nckrtl/chartjs-plugin-streaming';
import { Chart as ChartJS, type ChartOptions, registerables } from 'chart.js';
import { BluetoothConnected, BluetoothOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';

ChartJS.register(StreamingPlugin, RealTimeScale, ...registerables);

const COLORS = {
  fl: 'rgb(255, 99, 132)',
  fr: 'rgb(54, 162, 235)',
  rl: 'rgb(255, 206, 86)',
  rr: 'rgb(75, 192, 192)',
};

const PID_COLORS = {
  p: 'rgb(255, 99, 132)',
  i: 'rgb(54, 162, 235)',
  d: 'rgb(75, 192, 192)',
};

const RPM_COLORS = {
  target: 'rgb(255, 99, 132)',
  current: 'rgb(54, 162, 235)',
};

type MotorData = { fl: number; fr: number; rl: number; rr: number };

interface PIDData {
  m3508_rpms: MotorData;
  target_rpms: MotorData;
  output_currents: MotorData;
  p_terms: MotorData;
  i_terms: MotorData;
  d_terms: MotorData;
}

function createLargeChartOptions(yLabel: string): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'realtime' as const,
        realtime: {
          duration: 10000,
          refresh: 50,
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

function createSmallChartOptions(yLabel: string): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'realtime' as const,
        realtime: {
          duration: 10000,
          refresh: 50,
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

export default function PIDTuning() {
  const [lastProcessedIdx, setLastProcessedIdx] = useState(-1);

  // Chart refs
  const pidTermsChartRef = useRef<ChartJS<'line'>>(null);
  const rpmCompareChartRef = useRef<ChartJS<'line'>>(null);
  const pTermChartRef = useRef<ChartJS<'line'>>(null);
  const iTermChartRef = useRef<ChartJS<'line'>>(null);
  const dTermChartRef = useRef<ChartJS<'line'>>(null);
  const outputCurrentChartRef = useRef<ChartJS<'line'>>(null);
  const targetRpmChartRef = useRef<ChartJS<'line'>>(null);
  const rpmErrorChartRef = useRef<ChartJS<'line'>>(null);

  const {
    bluetoothDevice,
    isDeviceConnected,
    receivedMessages,
    searchDevice,
    disconnect,
  } = useBluetoothConnect();

  useEffect(() => {
    if (!isDeviceConnected) {
      setLastProcessedIdx(-1);
      return;
    }

    const charts = {
      pidTerms: pidTermsChartRef.current,
      rpmCompare: rpmCompareChartRef.current,
      pTerm: pTermChartRef.current,
      iTerm: iTermChartRef.current,
      dTerm: dTermChartRef.current,
      outputCurrent: outputCurrentChartRef.current,
      targetRpm: targetRpmChartRef.current,
      rpmError: rpmErrorChartRef.current,
    };

    const {
      pidTerms,
      rpmCompare,
      pTerm,
      iTerm,
      dTerm,
      outputCurrent,
      targetRpm,
      rpmError,
    } = charts;
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

        // Calculate averages for large charts
        const avgP = (p_terms.fl + p_terms.fr + p_terms.rl + p_terms.rr) / 4;
        const avgI = (i_terms.fl + i_terms.fr + i_terms.rl + i_terms.rr) / 4;
        const avgD = (d_terms.fl + d_terms.fr + d_terms.rl + d_terms.rr) / 4;
        const avgTarget =
          (target_rpms.fl + target_rpms.fr + target_rpms.rl + target_rpms.rr) /
          4;
        const avgCurrent =
          (m3508_rpms.fl + m3508_rpms.fr + m3508_rpms.rl + m3508_rpms.rr) / 4;

        // ① PID Terms chart (P, I, D averages)
        pidTerms.data.datasets[0].data.push({ x: now, y: avgP });
        pidTerms.data.datasets[1].data.push({ x: now, y: avgI });
        pidTerms.data.datasets[2].data.push({ x: now, y: avgD });

        // ② RPM Compare chart (target vs current averages)
        rpmCompare.data.datasets[0].data.push({ x: now, y: avgTarget });
        rpmCompare.data.datasets[1].data.push({ x: now, y: avgCurrent });

        // ③ P Term chart (4 motors)
        pTerm.data.datasets[0].data.push({ x: now, y: p_terms.fl });
        pTerm.data.datasets[1].data.push({ x: now, y: p_terms.fr });
        pTerm.data.datasets[2].data.push({ x: now, y: p_terms.rl });
        pTerm.data.datasets[3].data.push({ x: now, y: p_terms.rr });

        // ④ I Term chart (4 motors)
        iTerm.data.datasets[0].data.push({ x: now, y: i_terms.fl });
        iTerm.data.datasets[1].data.push({ x: now, y: i_terms.fr });
        iTerm.data.datasets[2].data.push({ x: now, y: i_terms.rl });
        iTerm.data.datasets[3].data.push({ x: now, y: i_terms.rr });

        // ⑤ D Term chart (4 motors)
        dTerm.data.datasets[0].data.push({ x: now, y: d_terms.fl });
        dTerm.data.datasets[1].data.push({ x: now, y: d_terms.fr });
        dTerm.data.datasets[2].data.push({ x: now, y: d_terms.rl });
        dTerm.data.datasets[3].data.push({ x: now, y: d_terms.rr });

        // ⑥ Output Current chart (4 motors)
        outputCurrent.data.datasets[0].data.push({
          x: now,
          y: output_currents.fl,
        });
        outputCurrent.data.datasets[1].data.push({
          x: now,
          y: output_currents.fr,
        });
        outputCurrent.data.datasets[2].data.push({
          x: now,
          y: output_currents.rl,
        });
        outputCurrent.data.datasets[3].data.push({
          x: now,
          y: output_currents.rr,
        });

        // ⑦ Target RPM chart (4 motors)
        targetRpm.data.datasets[0].data.push({ x: now, y: target_rpms.fl });
        targetRpm.data.datasets[1].data.push({ x: now, y: target_rpms.fr });
        targetRpm.data.datasets[2].data.push({ x: now, y: target_rpms.rl });
        targetRpm.data.datasets[3].data.push({ x: now, y: target_rpms.rr });

        // ⑧ RPM Error chart (target - current for 4 motors)
        rpmError.data.datasets[0].data.push({
          x: now,
          y: target_rpms.fl - m3508_rpms.fl,
        });
        rpmError.data.datasets[1].data.push({
          x: now,
          y: target_rpms.fr - m3508_rpms.fr,
        });
        rpmError.data.datasets[2].data.push({
          x: now,
          y: target_rpms.rl - m3508_rpms.rl,
        });
        rpmError.data.datasets[3].data.push({
          x: now,
          y: target_rpms.rr - m3508_rpms.rr,
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
  }, [receivedMessages, lastProcessedIdx, isDeviceConnected]);

  // ① PID Terms chart data (P, I, D averages)
  const pidTermsChartData = useMemo(
    () => ({
      datasets: [
        {
          label: 'P Term',
          borderColor: PID_COLORS.p,
          backgroundColor: PID_COLORS.p,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
        {
          label: 'I Term',
          borderColor: PID_COLORS.i,
          backgroundColor: PID_COLORS.i,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
        {
          label: 'D Term',
          borderColor: PID_COLORS.d,
          backgroundColor: PID_COLORS.d,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
      ],
    }),
    [],
  );

  // ② RPM Compare chart data (target vs current)
  const rpmCompareChartData = useMemo(
    () => ({
      datasets: [
        {
          label: 'Target RPM',
          borderColor: RPM_COLORS.target,
          backgroundColor: RPM_COLORS.target,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
        {
          label: 'Current RPM',
          borderColor: RPM_COLORS.current,
          backgroundColor: RPM_COLORS.current,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
      ],
    }),
    [],
  );

  // Motor-based chart data (4 motors)
  const createMotorChartData = () => ({
    datasets: [
      {
        label: 'FL',
        borderColor: COLORS.fl,
        backgroundColor: COLORS.fl,
        data: [] as { x: number; y: number }[],
        tension: 0.3,
      },
      {
        label: 'FR',
        borderColor: COLORS.fr,
        backgroundColor: COLORS.fr,
        data: [] as { x: number; y: number }[],
        tension: 0.3,
      },
      {
        label: 'RL',
        borderColor: COLORS.rl,
        backgroundColor: COLORS.rl,
        data: [] as { x: number; y: number }[],
        tension: 0.3,
      },
      {
        label: 'RR',
        borderColor: COLORS.rr,
        backgroundColor: COLORS.rr,
        data: [] as { x: number; y: number }[],
        tension: 0.3,
      },
    ],
  });

  const pTermChartData = useMemo(createMotorChartData, []);
  const iTermChartData = useMemo(createMotorChartData, []);
  const dTermChartData = useMemo(createMotorChartData, []);
  const outputCurrentChartData = useMemo(createMotorChartData, []);
  const targetRpmChartData = useMemo(createMotorChartData, []);
  const rpmErrorChartData = useMemo(createMotorChartData, []);

  // Chart options
  const pidTermsChartOptions = useMemo(
    () => createLargeChartOptions('Value'),
    [],
  );
  const rpmCompareChartOptions = useMemo(
    () => createLargeChartOptions('RPM'),
    [],
  );
  const pTermChartOptions = useMemo(() => createSmallChartOptions('P'), []);
  const iTermChartOptions = useMemo(() => createSmallChartOptions('I'), []);
  const dTermChartOptions = useMemo(() => createSmallChartOptions('D'), []);
  const outputCurrentChartOptions = useMemo(
    () => createSmallChartOptions('mA'),
    [],
  );
  const targetRpmChartOptions = useMemo(
    () => createSmallChartOptions('RPM'),
    [],
  );
  const rpmErrorChartOptions = useMemo(
    () => createSmallChartOptions('Error'),
    [],
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button
        variant="secondary"
        className="relative z-10 w-fit font-normal"
        onClick={isDeviceConnected ? disconnect : searchDevice}
      >
        {isDeviceConnected ? (
          <BluetoothConnected className="text-green-600" />
        ) : (
          <BluetoothOff className="size-5 text-destructive" />
        )}
        <p className="-mr-1 font-medium">
          {isDeviceConnected ? 'Connected' : 'Disconnected'}
        </p>
        <p>
          (
          {bluetoothDevice ? bluetoothDevice.name || bluetoothDevice.id : 'N/A'}
          )
        </p>
      </Button>

      {/* ① PID Terms chart (large) */}
      <div>
        <h3 className="mb-2 font-medium text-sm">P, I, D Terms (Average)</h3>
        <div className="h-60 w-full">
          <Line
            ref={pidTermsChartRef}
            data={pidTermsChartData}
            options={pidTermsChartOptions}
          />
        </div>
      </div>

      {/* ② RPM Compare chart (large) */}
      <div>
        <h3 className="mb-2 font-medium text-sm">
          Target vs Current RPM (Average)
        </h3>
        <div className="h-60 w-full">
          <Line
            ref={rpmCompareChartRef}
            data={rpmCompareChartData}
            options={rpmCompareChartOptions}
          />
        </div>
      </div>

      {/* ③～⑧ Small charts in a grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* ③ P Term */}
        <div>
          <h3 className="mb-1 font-medium text-xs">P Term</h3>
          <div className="h-32">
            <Line
              ref={pTermChartRef}
              data={pTermChartData}
              options={pTermChartOptions}
            />
          </div>
        </div>

        {/* ④ I Term */}
        <div>
          <h3 className="mb-1 font-medium text-xs">I Term</h3>
          <div className="h-32">
            <Line
              ref={iTermChartRef}
              data={iTermChartData}
              options={iTermChartOptions}
            />
          </div>
        </div>

        {/* ⑤ D Term */}
        <div>
          <h3 className="mb-1 font-medium text-xs">D Term</h3>
          <div className="h-32">
            <Line
              ref={dTermChartRef}
              data={dTermChartData}
              options={dTermChartOptions}
            />
          </div>
        </div>

        {/* ⑥ Output Current */}
        <div>
          <h3 className="mb-1 font-medium text-xs">Output Current</h3>
          <div className="h-32">
            <Line
              ref={outputCurrentChartRef}
              data={outputCurrentChartData}
              options={outputCurrentChartOptions}
            />
          </div>
        </div>

        {/* ⑦ Target RPM */}
        <div>
          <h3 className="mb-1 font-medium text-xs">Target RPM</h3>
          <div className="h-32">
            <Line
              ref={targetRpmChartRef}
              data={targetRpmChartData}
              options={targetRpmChartOptions}
            />
          </div>
        </div>

        {/* ⑧ RPM Error (target - current) */}
        <div>
          <h3 className="mb-1 font-medium text-xs">
            RPM Error (Target - Current)
          </h3>
          <div className="h-32">
            <Line
              ref={rpmErrorChartRef}
              data={rpmErrorChartData}
              options={rpmErrorChartOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
