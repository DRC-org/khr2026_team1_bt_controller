import 'chartjs-adapter-luxon';
import {
  RealTimeScale,
  StreamingPlugin,
} from '@nckrtl/chartjs-plugin-streaming';
import { Chart as ChartJS, registerables } from 'chart.js';
import { BluetoothConnected, BluetoothOff } from 'lucide-react';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';
import { MotorSelector } from './MotorSelector';
import { SmallChart } from './SmallChart';
import type { MotorKey } from './types';
import { usePIDCharts } from './usePIDCharts';

ChartJS.register(StreamingPlugin, RealTimeScale, ...registerables);

export default function PIDTuning() {
  const [selectedMotor, setSelectedMotor] = useState<MotorKey>('fl');

  const {
    bluetoothDevice,
    isDeviceConnected,
    receivedMessages,
    searchDevice,
    disconnect,
  } = useBluetoothConnect();

  const { chartRefs, chartData, chartOptions, clearAllCharts } = usePIDCharts(
    receivedMessages,
    isDeviceConnected,
    selectedMotor,
  );

  const handleMotorChange = (motor: MotorKey) => {
    clearAllCharts();
    setSelectedMotor(motor);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
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
          <p className="-mr-1 font-bold">
            {isDeviceConnected ? 'Connected' : 'Disconnected'}
          </p>
          <p>
            (
            {bluetoothDevice
              ? bluetoothDevice.name || bluetoothDevice.id
              : 'N/A'}
            )
          </p>
        </Button>

        <MotorSelector
          selectedMotor={selectedMotor}
          onMotorChange={handleMotorChange}
        />
      </div>

      {/* ① PID Terms chart (large) */}
      <div>
        <h3 className="mb-2 font-bold text-sm">P, I, D Terms</h3>
        <div className="h-60 w-full">
          <Line
            ref={chartRefs.pidTerms}
            data={chartData.pidTerms}
            options={chartOptions.pidTerms}
          />
        </div>
      </div>

      {/* ② RPM Compare chart (large) */}
      <div>
        <h3 className="mb-2 font-bold text-sm">Target vs Current RPM</h3>
        <div className="h-60 w-full">
          <Line
            ref={chartRefs.rpmCompare}
            data={chartData.rpmCompare}
            options={chartOptions.rpmCompare}
          />
        </div>
      </div>

      {/* ③～⑧ Small charts in a grid */}
      <div className="grid grid-cols-3 gap-4">
        <SmallChart
          title="P Term"
          chartRef={chartRefs.pTerm}
          data={chartData.pTerm}
          options={chartOptions.pTerm}
        />
        <SmallChart
          title="I Term"
          chartRef={chartRefs.iTerm}
          data={chartData.iTerm}
          options={chartOptions.iTerm}
        />
        <SmallChart
          title="D Term"
          chartRef={chartRefs.dTerm}
          data={chartData.dTerm}
          options={chartOptions.dTerm}
        />
        <SmallChart
          title="Output Current"
          chartRef={chartRefs.outputCurrent}
          data={chartData.outputCurrent}
          options={chartOptions.outputCurrent}
        />
        <SmallChart
          title="Target RPM"
          chartRef={chartRefs.targetRpm}
          data={chartData.targetRpm}
          options={chartOptions.targetRpm}
        />
        <SmallChart
          title="RPM Error (Target - Current)"
          chartRef={chartRefs.rpmError}
          data={chartData.rpmError}
          options={chartOptions.rpmError}
        />
      </div>
    </div>
  );
}
