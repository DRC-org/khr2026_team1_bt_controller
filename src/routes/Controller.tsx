import JoystickController from 'joystick-controller';
import {
  ArrowDown,
  ArrowUp,
  BluetoothConnected,
  BluetoothOff,
  Dice1,
  Dice2,
  Dice3,
  Maximize2,
  Minimize2,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import FieldSvg from '@/assets/khr2026_field.svg';
import KumaSvg from '@/assets/kuma.svg';
import OpButton from '@/components/OpButton';
// import JoystickFields from '@/components/JoystickFields';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';
import { useDisableContextMenu } from '@/hooks/useDisableContextMenu';
import { useJoystickFields } from '@/hooks/useJoystickFields';
import { sendJsonData } from '@/logics/bluetooth';

export default function Controller() {
  const [robotPosX, setRobotPosX] = useState(388);
  const [robotPosY, setRobotPosY] = useState(388);
  const [robotAngle, setRobotAngle] = useState(0);
  const [court, setCourt] = useState<'blue' | 'red'>('blue');

  const {
    bluetoothDevice,
    isDeviceConnected,
    bluetoothTxCharacteristic,
    onMessage,
    searchDevice,
    disconnect,
  } = useBluetoothConnect();

  const btCharRef = useRef(bluetoothTxCharacteristic);
  useEffect(() => {
    btCharRef.current = bluetoothTxCharacteristic;
  }, [bluetoothTxCharacteristic]);

  const handleCourtSelect = useCallback((c: 'blue' | 'red') => {
    setCourt(c);
    if (btCharRef.current) {
      sendJsonData({ type: 'set_court', court: c }, btCharRef.current);
    }
  }, []);

  const {
    // joystickLFields,
    setJoystickLFields,
    // joystickRFields,
    setJoystickRFields,
  } = useJoystickFields((joystickLFields, joystickRFields) => {
    if (bluetoothTxCharacteristic === undefined) return;

    // 青コートはロボットが南向きのため、北を前にするために l_x・l_y を反転
    const sign = court === 'blue' ? -1 : 1;
    const txData = {
      type: 'joystick',
      l_x: sign * joystickLFields.x,
      l_y: sign * joystickLFields.y,
      r: joystickRFields.x,
    };
    sendJsonData(txData, bluetoothTxCharacteristic);
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
          x: data.leveledX,
          y: data.leveledY,
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
          x: data.leveledX,
        });
      },
    );
    return () => {
      joystickL.destroy();
      joystickR.destroy();
    };
  }, []);

  const handleMessage = useCallback((msg: string) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'robot_pos') {
        setRobotPosX(data.x);
        setRobotPosY(data.y);
        setRobotAngle(data.angle);
      }
    } catch (_e) {
      console.error('Invalid JSON message:', msg);
    }
  }, []);

  useEffect(() => {
    if (isDeviceConnected) {
      onMessage(handleMessage);
    }
  }, [isDeviceConnected, onMessage, handleMessage]);

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

      <div className="relative z-10 flex items-center gap-2 p-3">
        <Button
          variant="secondary"
          className="font-normal"
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
        <Button
          size="sm"
          variant={court === 'blue' ? 'default' : 'outline'}
          className={court === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          onClick={() => handleCourtSelect('blue')}
        >
          青
        </Button>
        <Button
          size="sm"
          variant={court === 'red' ? 'default' : 'outline'}
          className={court === 'red' ? 'bg-red-600 hover:bg-red-700' : ''}
          onClick={() => handleCourtSelect('red')}
        >
          赤
        </Button>
      </div>

      {/* hid=1 パネル（左） */}
      <div className="pointer-events-none absolute top-1/2 left-3 z-10 w-[calc(50%-20svh-1rem)] -translate-y-1/2">
        <div className="flex flex-col gap-2">
          <p className="text-center text-xs font-bold text-primary/60">― 1 ―</p>

          {/* 昇降 1 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center text-xs font-semibold text-green-700">昇降</p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="pos" action="up" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <ArrowUp className="size-5" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="pos" action="stopped" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Square className="size-4" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="pos" action="down" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <ArrowDown className="size-5" />
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="state" action="open" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Maximize2 className="size-5" />
                  Open
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="state" action="close" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Minimize2 className="size-5" />
                  Close
                </OpButton>
              </div>
            </div>
          </div>

          {/* リング 1 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center text-xs font-semibold text-amber-700">リング</p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="pos" action="pickup" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Dice1 className="size-5" />
                  拾取
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="pos" action="yagura" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Dice2 className="size-5" />
                  櫓
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="pos" action="honmaru" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Dice3 className="size-5" />
                  本丸
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="state" action="open" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Maximize2 className="size-5" />
                  Grab
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="state" action="close" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Minimize2 className="size-5" />
                  Rel.
                </OpButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* hid=2 パネル（右） */}
      <div className="pointer-events-none absolute top-1/2 right-3 z-10 w-[calc(50%-20svh-1rem)] -translate-y-1/2">
        <div className="flex flex-col gap-2">
          <p className="text-center text-xs font-bold text-primary/60">― 2 ―</p>

          {/* 昇降 2 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center text-xs font-semibold text-green-700">昇降</p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="pos" action="up" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <ArrowUp className="size-5" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="pos" action="stopped" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Square className="size-4" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="pos" action="down" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <ArrowDown className="size-5" />
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="state" action="open" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Maximize2 className="size-5" />
                  Open
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="state" action="close" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Minimize2 className="size-5" />
                  Close
                </OpButton>
              </div>
            </div>
          </div>

          {/* リング 2 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center text-xs font-semibold text-amber-700">リング</p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="pos" action="pickup" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Dice1 className="size-5" />
                  拾取
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="pos" action="yagura" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Dice2 className="size-5" />
                  櫓
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="pos" action="honmaru" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Dice3 className="size-5" />
                  本丸
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="state" action="open" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Maximize2 className="size-5" />
                  Grab
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="state" action="close" className="h-16" characteristic={bluetoothTxCharacteristic}>
                  <Minimize2 className="size-5" />
                  Rel.
                </OpButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 m-auto h-fit w-fit bg-white">
        <img src={FieldSvg} alt="Field" className="h-[80svh] w-auto" />
        <img
          src={KumaSvg}
          alt="RoboKuma"
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
      <div className="absolute top-0 left-1/2 -z-10 h-svh w-0 border-primary border-r border-dashed" />
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
