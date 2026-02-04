import {
  RealTimeScale,
  StreamingPlugin,
} from '@nckrtl/chartjs-plugin-streaming';
import {
  type ChartData,
  Chart as ChartJS,
  type ChartOptions,
  registerables,
} from 'chart.js';
import { BluetoothConnected, BluetoothOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';

ChartJS.register(StreamingPlugin, RealTimeScale, ...registerables);

export default function PIDTuning() {
  const [lastProcessedIdx, setLastProcessedIdx] = useState(-1);

  const {
    bluetoothDevice,
    isDeviceConnected,
    bluetoothTxCharacteristic,
    receivedMessages,
    searchDevice,
    disconnect,
  } = useBluetoothConnect();

  useEffect(() => {
    if (!isDeviceConnected) {
      setLastProcessedIdx(-1);
      return;
    }

    for (let i = lastProcessedIdx + 1; i < receivedMessages.length; i++) {
      const msg = receivedMessages[i];
      try {
        const data = JSON.parse(msg);
        if (data.m3508_rpms !== undefined) {
          console.log('Received m3508_rpms data:', data.m3508_rpms);
        }
      } catch (_e) {
        console.error('Invalid JSON message:', msg);
      }
    }
    if (receivedMessages.length > 0) {
      setLastProcessedIdx(receivedMessages.length - 1);
    }
  }, [receivedMessages, lastProcessedIdx, isDeviceConnected]);

  return (
    <div>
      <Button
        variant="secondary"
        className="relative z-10 font-normal"
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

      {/* <Line
        data={{} as ChartData<'line'>}
        options={{} as ChartOptions<'line'>}
      /> */}
    </div>
  );
}
