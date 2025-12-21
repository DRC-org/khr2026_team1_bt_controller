import JoystickController from 'joystick-controller';
import { useEffect } from 'react';
import JoystickFields from '@/components/JoystickFields';
import { useJoystickFields } from '@/hooks/useJoystickFields';

export default function App() {
  const {
    joystickLFields,
    setJoystickLFields,
    joystickRFields,
    setJoystickRFields,
  } = useJoystickFields((joystickLFields, joystickRFields) => {
    // TODO: Bluetooth 送信部分 ↓
    // if (bluetoothTxCharacteristic === undefined) return;

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
    /* (async () => {
      await sendJsonData(txDataL, bluetoothTxCharacteristic);
      await sendJsonData(txDataR, bluetoothTxCharacteristic);
    })(); */

    console.log('sent data: ');
    console.log(txDataL);
    console.log(txDataR);
  });

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

  return (
    <div className="select-none">
      <JoystickFields
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
      />

      <div
        id="joystick-l-field"
        className="absolute top-0 left-0 z-20 h-svh w-1/2 cursor-grab border-blue-800 border-r border-dashed"
      >
        <div className="absolute inset-x-0 bottom-4 text-center text-blue-800">
          移動
        </div>
      </div>
      <div
        id="joystick-r-field"
        className="absolute top-0 right-0 z-20 h-svh w-1/2 cursor-grab"
      >
        <div className="absolute inset-x-0 bottom-4 text-center text-blue-800">
          旋回
        </div>
      </div>
    </div>
  );
}
