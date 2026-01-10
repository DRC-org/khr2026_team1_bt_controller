import { useEffect, useRef, useState } from 'react';

const SEND_INTERVAL = 1000 / 10;

export function useJoystickFields(
  onEveryInterval: (
    joystickLFields: {
      x: number;
      y: number;
    },
    joystickRFields: {
      x: number;
    },
  ) => void,
) {
  const [joystickLFields, setJoystickLFields] = useState({
    x: 0,
    y: 0,
  });
  const [joystickRFields, setJoystickRFields] = useState({
    x: 0,
  });
  const joystickLFieldsRef = useRef(joystickLFields);
  const joystickRFieldsRef = useRef(joystickRFields);
  useEffect(() => {
    joystickLFieldsRef.current = joystickLFields;
  }, [joystickLFields]);
  useEffect(() => {
    joystickRFieldsRef.current = joystickRFields;
  }, [joystickRFields]);

  const onEveryIntervalRef = useRef(onEveryInterval);
  useEffect(() => {
    onEveryIntervalRef.current = onEveryInterval;
  }, [onEveryInterval]);

  useEffect(() => {
    const interval = setInterval(() => {
      onEveryIntervalRef.current(
        joystickLFieldsRef.current,
        joystickRFieldsRef.current,
      );
    }, SEND_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return {
    joystickLFields,
    setJoystickLFields,
    joystickRFields,
    setJoystickRFields,
  };
}
