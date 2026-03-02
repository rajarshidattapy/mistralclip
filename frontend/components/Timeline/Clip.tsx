type Props = {
  id: string;
  start: number;
  end: number;
  timelineStart: number;
};

const PIXELS_PER_SECOND = 44;

export function Clip({ id, start, end, timelineStart }: Props) {
  const duration = Math.max(end - start, 0.1);
  const width = Math.max(duration * PIXELS_PER_SECOND, 60);
  const left = Math.max(timelineStart * PIXELS_PER_SECOND, 0);

  return (
    <div className="clip" style={{ width, left }} title={`${id}: ${duration.toFixed(2)}s`}>
      {id}
    </div>
  );
}

