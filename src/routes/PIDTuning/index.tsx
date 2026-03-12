import 'chartjs-adapter-luxon';
import {
  RealTimeScale,
  StreamingPlugin,
} from '@nckrtl/chartjs-plugin-streaming';
import { Chart as ChartJS, registerables } from 'chart.js';
import { BluetoothConnected, BluetoothOff, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { MotorSelector } from './MotorSelector';
import { PIDGainControls } from './PIDGainControls';
import { SmallChart } from './SmallChart';
import type { MotorKey, PIDGains } from './types';
import { usePIDCharts } from './usePIDCharts';

ChartJS.register(StreamingPlugin, RealTimeScale, ...registerables);

export default function PIDTuning() {
  const [selectedMotor, setSelectedMotor] = useState<MotorKey>('fl');
  const [currentGains, setCurrentGains] = useState<PIDGains | undefined>();

  const {
    connectionMode,
    bluetoothDevice,
    isConnected,
    sendJson,
    connect,
    disconnect,
    addMessageListener,
  } = useAppContext();

  const { chartRefs, chartData, chartOptions, clearAllCharts, debugStats } =
    usePIDCharts(addMessageListener, isConnected, selectedMotor, setCurrentGains);

  const handleMotorChange = (motor: MotorKey) => {
    clearAllCharts();
    setSelectedMotor(motor);
  };

  const handleGainsChange = useCallback(
    async (gains: PIDGains) => {
      if (!isConnected) {
        console.error('Not connected');
        return;
      }
      const command = {
        type: 'pid_gains',
        kp: gains.kp,
        ki: gains.ki,
        kd: gains.kd,
      };
      sendJson(command);
      console.log('PID gains sent:', command);
    },
    [isConnected, sendJson],
  );

  useEffect(() => {
    if (!isConnected) return;
    sendJson({
      type: 'set_telemetry',
      enable_pid: true,
      target_motor: selectedMotor,
    });
    return () => {
      sendJson({ type: 'set_telemetry', enable_pid: false });
    };
  }, [selectedMotor, isConnected, sendJson]);

  const ConnectedIcon = connectionMode === 'ws' ? Wifi : BluetoothConnected;
  const DisconnectedIcon = connectionMode === 'ws' ? WifiOff : BluetoothOff;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          className="relative z-10 w-fit font-normal"
          onClick={isConnected ? disconnect : connect}
        >
          {isConnected ? (
            <ConnectedIcon className="text-green-600" />
          ) : (
            <DisconnectedIcon className="size-5 text-destructive" />
          )}
          <p className="-mr-1 font-bold">
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
          {connectionMode === 'ble' && (
            <p>
              (
              {bluetoothDevice
                ? bluetoothDevice.name || bluetoothDevice.id
                : 'N/A'}
              )
            </p>
          )}
        </Button>

        <MotorSelector
          selectedMotor={selectedMotor}
          onMotorChange={handleMotorChange}
        />
      </div>

      {/* PID Gain Controls */}
      <PIDGainControls
        onGainsChange={handleGainsChange}
        currentGains={currentGains}
        disabled={!isConnected}
      />

      {/* Debug Stats */}
      {debugStats && (
        <div className="grid grid-cols-6 gap-2 rounded bg-gray-100 p-2 font-mono text-xs">
          <div>
            Rate: <b>{debugStats.msgRate}</b>/s
          </div>
          <div>
            Proc avg: <b>{debugStats.avgProcessTime}</b>ms
          </div>
          <div>
            Proc max: <b>{debugStats.maxProcessTime}</b>ms
          </div>
          <div>
            MaxGap:{' '}
            <b
              className={
                Number(debugStats.maxInterval) > 200 ? 'text-red-600' : ''
              }
            >
              {debugStats.maxInterval}
            </b>
            ms
          </div>
          <div>
            Points: <b>{debugStats.datasetSize}</b>
          </div>
          <div>
            Errors:{' '}
            <b className={debugStats.parseErrors > 0 ? 'text-red-600' : ''}>
              {debugStats.parseErrors}
            </b>
          </div>
        </div>
      )}

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
