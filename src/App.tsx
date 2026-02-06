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
import { useEffect, useRef, useState } from 'react';
import FieldSvg from '@/assets/khr2026_field.svg';
import KumaSvg from '@/assets/kuma.svg';
import OpButton from '@/components/OpButton';
import { PathVisualizer } from '@/components/PathVisualizer';
// import JoystickFields from '@/components/JoystickFields';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';
import { useDisableContextMenu } from '@/hooks/useDisableContextMenu';
import { useJoystickFields } from '@/hooks/useJoystickFields';
import { useROSPath } from '@/hooks/useROSPath';
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
    // joystickLFields,
    setJoystickLFields,
    // joystickRFields,
    setJoystickRFields,
  } = useJoystickFields((joystickLFields, joystickRFields) => {
    if (bluetoothTxCharacteristic === undefined) return;

    const txData = {
      type: 'joystick',
      l_x: joystickLFields.x,
      l_y: joystickLFields.y,
      r: joystickRFields.x,
    };
    (async () => {
      await sendJsonData([txData], bluetoothTxCharacteristic);
    })();
  });

  // ROS path visualization
  const {
    pathData,
    currentPose,
    connected: rosConnected,
  } = useROSPath('ws://localhost:9090');
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

  useDisableContextMenu();

  // Update robot position from ROS simulation
  useEffect(() => {
    if (currentPose) {
      // Map ROS coordinates (meters) to UI coordinates (mm)
      // ROS X (0.3m) -> UI X (300)
      setRobotPosX(currentPose.position.x * 1000);
      setRobotPosY(currentPose.position.y * 1000);

      // Calculate angle from quaternion if needed, but for now fixed or 0
      // const q = currentPose.orientation;
      // const angle = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
      // setRobotAngle(angle * (180 / Math.PI));
    }
  }, [currentPose]);

  // Update map dimensions when map ref changes
  useEffect(() => {
    if (!mapRef.current) return;

    const updateDimensions = () => {
      if (mapRef.current) {
        setMapDimensions({
          width: mapRef.current.clientWidth,
          height: mapRef.current.clientHeight,
        });
      }
    };

    // Initial update
    updateDimensions();

    // Update on window resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const [showJoystick, setShowJoystick] = useState(true);

  useEffect(() => {
    if (!showJoystick) return;
    
    // Ensure DOM is ready
    const leftZone = document.getElementById('joystick-l-field');
    const rightZone = document.getElementById('joystick-r-field');
    
    if (!leftZone || !rightZone) return;

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
        dynamicPositionTarget: leftZone,
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
        dynamicPositionTarget: rightZone,
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
  }, [showJoystick]); // Re-run when toggled

  // Update map dimensions when map ref changes
  useEffect(() => {
    if (!mapRef.current) return;

    const updateDimensions = () => {
      if (mapRef.current) {
        setMapDimensions({
          width: mapRef.current.clientWidth,
          height: mapRef.current.clientHeight,
        });
      }
    };

    // Initial update
    updateDimensions();

    // Update on window resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const mapRef = useRef<HTMLImageElement>(null);

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
      } catch (_e) {
        console.error('Invalid JSON message:', msg);
      }
    }
    if (receivedMessages.length > 0) {
      setLastProcessedIdx(receivedMessages.length - 1);
    }
  }, [receivedMessages, lastProcessedIdx, isDeviceConnected]);

  const handleMapClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!mapRef.current || !bluetoothTxCharacteristic) return;

    if (!confirm('この場所に移動しますか？')) return;

    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate coordinates based on display logic
    // X (Short edge, 0-3500): displayed using 'right', so 0 is at right edge, 3500 at left edge.
    // X = (distance from right / width) * 3500
    const pixelFromRight = rect.width - clickX;
    const targetX = (pixelFromRight / rect.width) * 3500;

    // Y (Long edge, 0-7000): displayed using 'bottom', so 0 is at bottom edge, 7000 at top edge.
    // Y = (distance from bottom / height) * 7000
    const pixelFromBottom = rect.height - clickY;
    const targetY = (pixelFromBottom / rect.height) * 7000;

    console.log(
      `Navigating to: X=${Math.round(targetX)}, Y=${Math.round(targetY)}`,
    );

    const txData = {
      type: 'navigate',
      x: Math.round(targetX),
      y: Math.round(targetY),
    };

    (async () => {
      await sendJsonData([txData], bluetoothTxCharacteristic);
    })();
  };

  return (
    <div className="h-svh touch-none select-none">
      <div className="p-3 flex items-center gap-2">
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
            {bluetoothDevice
              ? bluetoothDevice.name || bluetoothDevice.id
              : 'N/A'}
            )
          </p>
        </Button>
        
        <Button 
          variant="outline" 
          className="relative z-10"
          onClick={() => setShowJoystick(!showJoystick)}
        >
          {showJoystick ? 'Hide Stick' : 'Show Stick'}
        </Button>
      </div>

      <div className="pointer-events-none absolute top-1/3 left-5 z-10 flex w-[calc(50%-20svh-2.5rem)] -translate-y-1/2 items-center gap-3">
        <div className="flex flex-1 flex-col gap-3">
          <OpButton target="yagura">
            <ArrowUp className="size-6" />
          </OpButton>
          <OpButton target="yagura" className="h-18">
            <Square className="size-5" />
          </OpButton>
          <OpButton target="yagura">
            <ArrowDown className="size-6" />
          </OpButton>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <OpButton target="yagura">
            <Maximize2 className="size-6" />
            Open
          </OpButton>
          <OpButton target="yagura">
            <Minimize2 className="size-6" />
            Close
          </OpButton>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <OpButton target="ring">
            <Maximize2 className="size-6" />
            Open
          </OpButton>
          <OpButton target="ring">
            <Minimize2 className="size-6" />
            Close
          </OpButton>
        </div>
      </div>

      <div className="pointer-events-none absolute top-1/3 right-5 z-10 flex w-[calc(50%-20svh-2.5rem)] -translate-y-1/2 items-center gap-3">
        <div className="flex flex-1 flex-col gap-3">
          <OpButton target="ring">
            <Dice1 className="size-6" />
            Grab
          </OpButton>
          <OpButton target="ring">
            <Dice2 className="size-6" />
            Rel. 25
          </OpButton>
          <OpButton target="ring">
            <Dice3 className="size-6" />
            Rel. 50
          </OpButton>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <OpButton target="yagura">
            <Maximize2 className="size-6" />
            Open
          </OpButton>
          <OpButton target="yagura">
            <Minimize2 className="size-6" />
            Close
          </OpButton>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <OpButton target="yagura">
            <ArrowUp className="size-6" />
          </OpButton>
          <OpButton target="yagura" className="h-18">
            <Square className="size-5" />
          </OpButton>
          <OpButton target="yagura">
            <ArrowDown className="size-6" />
          </OpButton>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 m-auto h-fit w-fit bg-white">
        <div className="relative">
          <img
            ref={mapRef}
            src={FieldSvg}
            alt="Field"
            className="pointer-events-auto h-[80svh] w-auto cursor-crosshair"
            onClick={handleMapClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleMapClick(
                  e as unknown as React.MouseEvent<HTMLImageElement>,
                );
              }
            }}
          />

          {/* Path visualization overlay */}
          {pathData && mapDimensions.width > 0 && (
            <div className="absolute inset-0">
              <PathVisualizer
                spots={pathData.spots}
                path={pathData.path}
                mapWidth={mapDimensions.width}
                mapHeight={mapDimensions.height}
              />
            </div>
          )}

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

          {/* ROS connection status indicator */}
          {rosConnected && (
            <div className="absolute top-2 right-2 rounded bg-green-500 px-2 py-1 text-white text-xs">
              ROS Connected
            </div>
          )}
        </div>
      </div>

      {showJoystick && (
        <>
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
        </>
      )}
    </div>
  );
}
