import JoystickController from 'joystick-controller';
import {
  ArrowDown,
  ArrowUp,
  BluetoothConnected,
  BluetoothOff,
  ChevronLeft,
  Dice1,
  Dice2,
  Dice3,
  Gamepad2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Square,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import FieldSvg from '@/assets/khr2026_field.svg';
import KumaSvg from '@/assets/kuma.svg';
import OpButton from '@/components/OpButton';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useDisableContextMenu } from '@/hooks/useDisableContextMenu';
import { useJoystickFields } from '@/hooks/useJoystickFields';

export default function Controller() {
  const [robotPosX, setRobotPosX] = useState(388);
  const [robotPosY, setRobotPosY] = useState(388);
  const [robotAngle, setRobotAngle] = useState(0);
  const [vgoalLed, setVgoalLed] = useState(false);
  const [errorLed, setErrorLed] = useState(false);
  const [joystickEnabled, setJoystickEnabled] = useState(true);

  const {
    connectionMode,
    bluetoothDevice,
    isConnected,
    sendJson,
    connect,
    disconnect,
    court,
    setCourt,
    addMessageListener,
  } = useAppContext();

  const {
    setJoystickLFields,
    setJoystickRFields,
  } = useJoystickFields((joystickLFields, joystickRFields) => {
    if (!isConnected || !joystickEnabled) return;
    const sign = court === 'blue' ? -1 : 1;
    sendJson({
      type: 'joystick',
      l_x: sign * joystickLFields.x,
      l_y: sign * joystickLFields.y,
      r: joystickRFields.x,
    });
  });

  // ページ表示時に manual モードへ切り替え
  const sentRef = useRef(false);
  useEffect(() => {
    if (isConnected && !sentRef.current) {
      sendJson({ type: 'nav_mode', mode: 'manual' });
      sentRef.current = true;
    }
    if (!isConnected) sentRef.current = false;
  }, [isConnected, sendJson]);

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
    if (isConnected) {
      return addMessageListener(handleMessage);
    }
  }, [isConnected, addMessageListener, handleMessage]);

  const handleCourtSelect = useCallback(
    (c: 'blue' | 'red') => {
      setCourt(c);
      sendJson({ type: 'set_court', court: c });
    },
    [setCourt, sendJson],
  );

  const ConnectedIcon =
    connectionMode === 'ws' ? Wifi : BluetoothConnected;
  const DisconnectedIcon =
    connectionMode === 'ws' ? WifiOff : BluetoothOff;

  return (
    <div className="h-[calc(100svh-2.5rem)] select-none">
      <div className="relative z-20 flex items-center gap-2 p-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <a href="#/">
            <ChevronLeft />
          </a>
        </Button>

        <Button
          variant="secondary"
          className="font-normal"
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
        <Button
          size="sm"
          variant={vgoalLed ? 'default' : 'outline'}
          className={vgoalLed ? 'bg-green-600 hover:bg-green-700' : ''}
          onClick={() => {
            const next = !vgoalLed;
            setVgoalLed(next);
            sendJson({
              type: 'hand_control',
              target: 'vgoal_led',
              control_type: 'state',
              action: next ? 'on' : 'off',
            });
          }}
        >
          VGoal
        </Button>
        <Button
          size="sm"
          variant={errorLed ? 'default' : 'outline'}
          className={errorLed ? 'bg-red-600 hover:bg-red-700' : ''}
          onClick={() => {
            const next = !errorLed;
            setErrorLed(next);
            sendJson({
              type: 'hand_control',
              target: 'error_led',
              control_type: 'state',
              action: next ? 'on' : 'off',
            });
          }}
        >
          Error
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-900"
          onClick={() => sendJson({ type: 'hand_reset' })}
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
        <Button
          size="sm"
          variant={joystickEnabled ? 'default' : 'outline'}
          className={joystickEnabled ? 'bg-sky-600 hover:bg-sky-700' : 'text-muted-foreground'}
          onClick={() => setJoystickEnabled((prev) => !prev)}
        >
          <Gamepad2 className="size-4" />
          足回り
        </Button>
      </div>

      {/* hid=1 パネル（左） */}
      <div className="pointer-events-none absolute top-2/5 left-3 z-10 w-[calc(50%-20svh-2rem)] -translate-y-1/2">
        <div className="flex flex-col gap-2">
          <p className="text-center font-bold text-primary/60 text-xs">― 1 ―</p>

          {/* 昇降 1 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center font-semibold text-green-700 text-xs">
              昇降
            </p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="pos" action="up" className="h-16" sendJson={sendJson}>
                  <ArrowUp className="size-5" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="pos" action="stopped" className="h-16" sendJson={sendJson}>
                  <Square className="size-4" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="pos" action="down" className="h-16" sendJson={sendJson}>
                  <ArrowDown className="size-5" />
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="state" action="open" className="h-16" sendJson={sendJson}>
                  <Maximize2 className="size-5" />
                  Open
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={1} control_type="state" action="close" className="h-16" sendJson={sendJson}>
                  <Minimize2 className="size-5" />
                  Close
                </OpButton>
              </div>
            </div>
          </div>

          {/* リング 1 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center font-semibold text-amber-700 text-xs">
              リング
            </p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="pos" action="pickup" className="h-16" sendJson={sendJson}>
                  <Dice1 className="size-5" />
                  拾取
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="pos" action="yagura" className="h-16" sendJson={sendJson}>
                  <Dice2 className="size-5" />櫓
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="pos" action="honmaru" className="h-16" sendJson={sendJson}>
                  <Dice3 className="size-5" />
                  本丸
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="state" action="open" className="h-16" sendJson={sendJson}>
                  <Maximize2 className="size-5" />
                  Grab
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={1} control_type="state" action="close" className="h-16" sendJson={sendJson}>
                  <Minimize2 className="size-5" />
                  Rel.
                </OpButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* hid=2 パネル（右） */}
      <div className="pointer-events-none absolute top-2/5 right-3 z-10 w-[calc(50%-20svh-2rem)] -translate-y-1/2">
        <div className="flex flex-col gap-2">
          <p className="text-center font-bold text-primary/60 text-xs">― 2 ―</p>

          {/* 昇降 2 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center font-semibold text-green-700 text-xs">
              昇降
            </p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="pos" action="up" className="h-16" sendJson={sendJson}>
                  <ArrowUp className="size-5" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="pos" action="stopped" className="h-16" sendJson={sendJson}>
                  <Square className="size-4" />
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="pos" action="down" className="h-16" sendJson={sendJson}>
                  <ArrowDown className="size-5" />
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="state" action="open" className="h-16" sendJson={sendJson}>
                  <Maximize2 className="size-5" />
                  Open
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="yagura" hid={2} control_type="state" action="close" className="h-16" sendJson={sendJson}>
                  <Minimize2 className="size-5" />
                  Close
                </OpButton>
              </div>
            </div>
          </div>

          {/* リング 2 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-center font-semibold text-amber-700 text-xs">
              リング
            </p>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="pos" action="pickup" className="h-16" sendJson={sendJson}>
                  <Dice1 className="size-5" />
                  拾取
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="pos" action="yagura" className="h-16" sendJson={sendJson}>
                  <Dice2 className="size-5" />櫓
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="pos" action="honmaru" className="h-16" sendJson={sendJson}>
                  <Dice3 className="size-5" />
                  本丸
                </OpButton>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="state" action="open" className="h-16" sendJson={sendJson}>
                  <Maximize2 className="size-5" />
                  Grab
                </OpButton>
              </div>
              <div className="flex-1">
                <OpButton target="ring" hid={2} control_type="state" action="close" className="h-16" sendJson={sendJson}>
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
        className="absolute bottom-0 left-0 top-12 w-1/2 cursor-grab touch-none"
      >
        <div className="absolute inset-x-0 bottom-4 text-center text-primary">
          Move
        </div>
      </div>
      <div className="absolute top-0 left-1/2 -z-10 h-svh w-0 border-primary border-r border-dashed" />
      <div
        id="joystick-r-field"
        className="absolute top-12 right-0 bottom-0 w-1/2 cursor-grab touch-none"
      >
        <div className="absolute inset-x-0 bottom-4 text-center text-primary">
          Turn
        </div>
      </div>
    </div>
  );
}
