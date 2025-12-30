import JoystickController from 'joystick-controller';
import { BluetoothConnected, BluetoothOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import FieldSvg from '@/assets/khr2026_field.svg';
import KumaSvg from '@/assets/kuma.svg';
import JoystickFields from '@/components/JoystickFields';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';
import { useDisableContextMenu } from '@/hooks/useDisableContextMenu';
import { useJoystickFields } from '@/hooks/useJoystickFields';
import { sendJsonData } from '@/logics/bluetooth';

export default function App() {
  const [robotPosX, setRobotPosX] = useState(388);
  const [robotPosY, setRobotPosY] = useState(388);
  const [robotAngle, setRobotAngle] = useState(0);
  const [lastProcessedIdx, setLastProcessedIdx] = useState(-1);

  const {
    bluetoothDevice,
    isDeviceConnected,
    bluetoothTxCharacteristic,
    receivedMessages,
    searchDevice,
    disconnect,
  } = useBluetoothConnect();

  const {
    joystickLFields,
    setJoystickLFields,
    joystickRFields,
    setJoystickRFields,
  } = useJoystickFields((joystickLFields, joystickRFields) => {
    if (bluetoothTxCharacteristic === undefined) return;

    const txDataL = {
      type: 'joystick',
      side: 'l',
      ...joystickLFields,
    };
    const txDataR = {
      type: 'joystick',
      side: 'r',
      ...joystickRFields,
    };
    (async () => {
      await sendJsonData(txDataL, bluetoothTxCharacteristic);
      await sendJsonData(txDataR, bluetoothTxCharacteristic);
    })();
  });

  useDisableContextMenu();

  useEffect(() => {
    const joystickL = new JoystickController(
      {
        maxRange: 140,
        radius: 70,
        joystickRadius: 40,
        hideContextMenu: true,
        distortion: true,
        controllerClass: 'border-2 border-blue-500 !bg-none',
        joystickClass: '!bg-blue-500 !bg-none',
        dynamicPosition: true,
        dynamicPositionTarget: document.getElementById('joystick-l-field'),
      },
      (data) => {
        setJoystickLFields({
          x: data.x,
          y: data.y,
          leveledX: data.leveledX,
          leveledY: data.leveledY,
          distance: data.distance,
          angle: data.angle,
        });
      },
    );
    const joystickR = new JoystickController(
      {
        maxRange: 140,
        radius: 70,
        joystickRadius: 40,
        hideContextMenu: true,
        distortion: true,
        controllerClass: 'border-2 border-blue-500 !bg-none',
        joystickClass: '!bg-blue-500 !bg-none',
        dynamicPosition: true,
        dynamicPositionTarget: document.getElementById('joystick-r-field'),
      },
      (data) => {
        setJoystickRFields({
          x: data.x,
          y: data.y,
          leveledX: data.leveledX,
          leveledY: data.leveledY,
          distance: data.distance,
          angle: data.angle,
        });
      },
    );
    return () => {
      joystickL.destroy();
      joystickR.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isDeviceConnected) {
      setLastProcessedIdx(-1);
      return;
    }

    for (let i = lastProcessedIdx + 1; i < receivedMessages.length; i++) {
      const msg = receivedMessages[i];
      try {
        const data = JSON.parse(msg);
        if (data.type === 'robot_pos') {
          setRobotPosX(data.x);
          setRobotPosY(data.y);
          setRobotAngle(data.angle);
        }
      } catch (e) {
        console.error('Invalid JSON message:', msg);
      }
    }
    if (receivedMessages.length > 0) {
      setLastProcessedIdx(receivedMessages.length - 1);
    }
  }, [receivedMessages, lastProcessedIdx, isDeviceConnected]);

  return (
    <div className="h-svh touch-none select-none">
      {/* <JoystickFields
        label="left"
        x={joystickLFields.x.toString()}
        y={joystickLFields.y.toString()}
        leveledX={joystickLFields.leveledX.toString()}
        leveledY={joystickLFields.leveledY.toString()}
        distance={joystickLFields.distance.toString()}
        angle={joystickLFields.angle.toString()}
      />
      <JoystickFields
        label="right"
        x={joystickRFields.x.toString()}
        y={joystickRFields.y.toString()}
        leveledX={joystickRFields.leveledX.toString()}
        leveledY={joystickRFields.leveledY.toString()}
        distance={joystickRFields.distance.toString()}
        angle={joystickRFields.angle.toString()}
      /> */}

      <div className="p-3">
        <Button
          variant="secondary"
          className="relative z-10 flex w-fit items-center gap-0 font-normal"
          onClick={isDeviceConnected ? disconnect : searchDevice}
        >
          {isDeviceConnected ? (
            <BluetoothConnected className="text-green-600" />
          ) : (
            <BluetoothOff className="size-5 text-destructive" />
          )}
          <p className="mr-1 ml-2 font-medium">
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
      </div>

      <div className="pointer-events-none absolute inset-0 m-auto h-fit w-fit bg-white">
        <img src={FieldSvg} alt="Field" className="h-[80svh] w-auto" />
        <img
          src={KumaSvg}
          alt="Kuma"
          className="translate-1/2 absolute size-[6svh]"
          style={{
            bottom: `calc(${robotPosY} / 7000 * 80svh)`,
            right: `calc(${robotPosX} / 3500 * 40svh)`,
            transform: `rotate(${robotAngle}deg)`,
          }}
        />
      </div>

      <div
        id="joystick-l-field"
        className="absolute top-0 left-0 h-svh w-1/2 cursor-grab"
      >
        <div className="absolute inset-x-0 bottom-4 text-center text-primary">
          Move
        </div>
      </div>
      <div className="-z-10 absolute top-0 left-1/2 h-svh w-0 border-primary border-r border-dashed" />
      <div
        id="joystick-r-field"
        className="absolute top-0 right-0 h-svh w-1/2 cursor-grab"
      >
        <div className="absolute inset-x-0 bottom-4 text-center text-primary">
          Turn
        </div>
      </div>
    </div>
  );
}
