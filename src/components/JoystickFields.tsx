function JoystickFields(props: {
  label: string;
  x: string;
  y: string;
  leveledX: string;
  leveledY: string;
  distance: string;
  angle: string;
}) {
  return (
    <div>
      <div className="z-20 w-fit border border-accent/70 px-6 py-4 text-primary text-sm">
        <div>[ {props.label} ]</div>
        <div>x: {props.x}</div>
        <div>y: {props.y}</div>
        <div>leveled x: {props.leveledX}</div>
        <div>leveled y: {props.leveledY}</div>
        <div>distance: {props.distance}</div>
        <div>angle: {props.angle}</div>
      </div>
    </div>
  );
}

export default JoystickFields;
