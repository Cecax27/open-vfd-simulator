import { SpeedSample } from "../types";

export function MotorSpeedChart({ samples, emptyLabel }: { samples: SpeedSample[]; emptyLabel: string }) {
  const width = 840;
  const height = 220;
  const padding = 24;

  if (samples.length < 2) {
    return <p className="caption">{emptyLabel}</p>;
  }

  const minSpeed = Math.min(...samples.map((sample) => sample.speedRpm));
  const maxSpeed = Math.max(...samples.map((sample) => sample.speedRpm));
  const range = Math.max(maxSpeed - minSpeed, 1);

  const points = samples
    .map((sample, index) => {
      const x = padding + (index / (samples.length - 1)) * (width - padding * 2);
      const y = height - padding - ((sample.speedRpm - minSpeed) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="speed-chart"
      role="img"
      aria-label="Motor speed trend chart"
    >
      <rect x={0} y={0} width={width} height={height} rx={12} className="speed-chart-bg" />
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        className="speed-chart-axis"
      />
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        className="speed-chart-axis"
      />
      <polyline fill="none" points={points} className="speed-chart-line" />
      <text x={padding} y={padding - 6} className="speed-chart-label">
        Max {maxSpeed.toFixed(1)} rpm
      </text>
      <text x={padding} y={height - 6} className="speed-chart-label">
        Min {minSpeed.toFixed(1)} rpm
      </text>
    </svg>
  );
}
