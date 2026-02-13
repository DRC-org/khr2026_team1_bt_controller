import JoystickController from 'joystick-controller';
import {
  ArrowDown,
  ArrowUp,
  Dice1,
  Dice2,
  Dice3,
  Maximize2,
  Minimize2,
  Square,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import FieldSvg from '@/assets/khr2026_field.svg';
import KumaSvg from '@/assets/kuma.svg';
import OpButton from '@/components/OpButton';
import { PathVisualizer } from '@/components/PathVisualizer';
import { Button } from '@/components/ui/button';
import { useDisableContextMenu } from '@/hooks/useDisableContextMenu';
import { useJoystickFields } from '@/hooks/useJoystickFields';
import { useROS } from '@/hooks/useROS';

// Robot control constants
const MAX_LINEAR_SPEED = 0.5; // m/s
const MAX_ANGULAR_SPEED = 1.5; // rad/s
const JOYSTICK_MAX_RANGE = 70; // Joystick output range

export default function App() {
  const [robotPosX, setRobotPosX] = useState(388);
  const [robotPosY, setRobotPosY] = useState(388);
  const [robotAngle, setRobotAngle] = useState(0);

  // ROS connection
  const {
    pathData,
    currentPose,
    scoreDetail,
    controlStatus,
    connected: rosConnected,
    publishCmdVel,
  } = useROS('ws://localhost:9090');

  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

  useDisableContextMenu();

  // Joystick state
  const joystickState = useRef({
    linearX: 0,
    linearY: 0,
    angularZ: 0,
  });

  const { setJoystickLFields, setJoystickRFields } = useJoystickFields(
    (joystickLFields, joystickRFields) => {
      // Normalize joystick inputs (-1.0 to 1.0)
      // Note: Joystick Y is inverted (up is negative in screen coords usually, but let's check lib)
      // Usually joystick libraries give Y negative for up.
      // Robot coordinate: X is forward, Y is left.
      // Joystick L: Move
      //   Up/Down -> Robot X (Forward/Back)
      //   Left/Right -> Robot Y (Left/Right)
      // Joystick R: Turn
      //   Left/Right -> Robot Angular Z

      // joystick-controller returns 'leveledX' and 'leveledY'.
      // assuming Up is negative Y in screen coords -> Forward is +X in robot
      // Left is negative X in screen coords -> Left is +Y in robot

      const normLX = joystickLFields.x / JOYSTICK_MAX_RANGE; // -1 to 1
      const normLY = -joystickLFields.y / JOYSTICK_MAX_RANGE; // -1 to 1 (Invert Y for Forward being Up)
      const normRX = joystickRFields.x / JOYSTICK_MAX_RANGE; // -1 to 1

      // Map to robot velocities
      const linearX = normLY * MAX_LINEAR_SPEED;
      // For mecanum, Left/Right on stick maps to Y (Left/Right)
      // Screen Left (-x) -> Robot Left (+y)
      const linearY = -normLX * MAX_LINEAR_SPEED;

      // Turn: Left (-x) should differ to +AngularZ (CCW) often
      const angularZ = -normRX * MAX_ANGULAR_SPEED;

      joystickState.current = { linearX, linearY, angularZ };

      // Publish immediately or rely on interval?
      // For smooth control, interval is better, but here we trigger on callback
      publishCmdVel(linearX, linearY, angularZ);
    },
  );

  // Interval-based publishing for safety (optional, but keep alive)
  // Currently disabled to avoid flooding, relying on callback.

  // Update robot position from ROS simulation
  useEffect(() => {
    if (currentPose) {
      // Map ROS coordinates (meters) to UI coordinates (mm)
      // ROS X (0.3m) -> UI X (300)
      setRobotPosX(currentPose.position.x * 1000);
      setRobotPosY(currentPose.position.y * 1000);

      // Calculate angle from quaternion
       const q = currentPose.orientation;
       // Yaw (z-axis rotation) from quaternion
       const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
       const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
       const angle = Math.atan2(siny_cosp, cosy_cosp);
       setRobotAngle(angle * (180 / Math.PI));
    }
  }, [currentPose]);

  const mapRef = useRef<HTMLImageElement>(null);

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
        maxRange: JOYSTICK_MAX_RANGE * 2, // *2 for physical range visual
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
        maxRange: JOYSTICK_MAX_RANGE * 2,
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

  const handleMapClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!mapRef.current) return;

    if (!confirm('この場所に移動しますか？ (Goal Publish not implemented yet)'))
      return;

    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate coordinates based on display logic
    // X (Short edge, 0-3500)
    const pixelFromRight = rect.width - clickX;
    const targetX = (pixelFromRight / rect.width) * 3500;

    // Y (Long edge, 0-7000)
    const pixelFromBottom = rect.height - clickY;
    const targetY = (pixelFromBottom / rect.height) * 7000;

    console.log(
      `Clicked: UI X=${Math.round(targetX)}, Y=${Math.round(targetY)}`,
    );
    console.log(
      `ROS Target: X=${(targetX / 1000).toFixed(2)}, Y=${(targetY / 1000).toFixed(2)}`,
    );
    
    // TODO: Publish to /goal_pose or similar
  };

  return (
    <div className="h-svh touch-none select-none">
      <div className="p-3 flex items-center gap-2">
        <Button
          variant="secondary"
          className="relative z-10 font-normal"
          disabled
        >
          {rosConnected ? (
            <Wifi className="text-green-600" />
          ) : (
            <WifiOff className="size-5 text-destructive" />
          )}
          <p className="-mr-1 font-medium">
            {rosConnected ? 'ROS Online' : 'ROS Offline'}
          </p>
        </Button>

        {scoreDetail && (
          <div className="flex gap-2 ml-4 relative z-10">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-md font-bold">
              Score: {scoreDetail.total_score}
            </div>
            {scoreDetail.ote && (
              <div className="bg-orange-500 text-white px-3 py-1 rounded-md font-bold animate-pulse">
                王手!
              </div>
            )}
            {scoreDetail.v_goal && (
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-md font-bold">
                攻略達成!
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          className="relative z-10 ml-auto"
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
