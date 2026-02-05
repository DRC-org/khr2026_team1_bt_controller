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

export default function PIDTuning() {
  const [lastProcessedIdx, setLastProcessedIdx] = useState(-1);
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [rpmValues, setRpmValues] = useState({ fl: 0, fr: 0, rl: 0, rr: 0 });

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

    const chart = chartRef.current;
    if (!chart) return;

    for (let i = lastProcessedIdx + 1; i < receivedMessages.length; i++) {
      const msg = receivedMessages[i];
      try {
        const data = JSON.parse(msg);
        if (data.m3508_rpms !== undefined) {
          const rpms = data.m3508_rpms as {
            fl: number;
            fr: number;
            rl: number;
            rr: number;
          };
          const now = Date.now();
          console.log(rpms);

          chart.data.datasets[0].data.push({ x: now, y: rpms.fl });
          chart.data.datasets[1].data.push({ x: now, y: -rpms.fr });
          chart.data.datasets[2].data.push({ x: now, y: rpms.rl });
          chart.data.datasets[3].data.push({ x: now, y: -rpms.rr });

          chart.update('quiet');
          setRpmValues(rpms);
        }
      } catch (_e) {
        console.error('Invalid JSON message:', msg);
      }
    }
    if (receivedMessages.length > 0) {
      setLastProcessedIdx(receivedMessages.length - 1);
    }
  }, [receivedMessages, lastProcessedIdx, isDeviceConnected]);

  const chartData = useMemo(
    () => ({
      datasets: [
        {
          label: 'FL (Front Left)',
          borderColor: COLORS.fl,
          backgroundColor: COLORS.fl,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
        {
          label: 'FR (Front Right)',
          borderColor: COLORS.fr,
          backgroundColor: COLORS.fr,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
        {
          label: 'RL (Rear Left)',
          borderColor: COLORS.rl,
          backgroundColor: COLORS.rl,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
        {
          label: 'RR (Rear Right)',
          borderColor: COLORS.rr,
          backgroundColor: COLORS.rr,
          data: [] as { x: number; y: number }[],
          tension: 0.3,
        },
      ],
    }),
    [],
  );

  const chartOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'realtime' as const,
          realtime: {
            duration: 10000,
            refresh: 50,
          },
          title: {
            display: true,
            text: 'Time',
          },
        },
        y: {
          title: {
            display: true,
            text: 'RPM',
          },
        },
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
      },
      animation: false as const,
    }),
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

      <p>
        fl: {rpmValues.fl}, fr: {rpmValues.fr}, rl: {rpmValues.rl}, rr:{' '}
        {rpmValues.rr}
      </p>

      <div className="h-100 w-full">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
