/**
 * Pure SVG path geometry for the Progress charts, kept out of the component
 * so the math is testable. Points arrive already scaled to pixel space.
 */

export interface PathPoint {
  x: number;
  y: number;
}

/**
 * Monotone cubic path through the points (Fritsch–Carlson tangents), so the
 * curve is smooth like the design mock but never overshoots the data.
 */
export function smoothPath(points: PathPoint[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(xs[i + 1] - xs[i]);
    m.push(dx[i] === 0 ? 0 : (ys[i + 1] - ys[i]) / dx[i]);
  }
  const tangents: number[] = [m[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangents.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  }
  tangents.push(m[n - 2]);
  // Clamp tangents so the curve stays monotone between points.
  for (let i = 0; i < n - 1; i += 1) {
    if (m[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / m[i];
      const b = tangents[i + 1] / m[i];
      const h = Math.hypot(a, b);
      if (h > 3) {
        tangents[i] = (3 * m[i] * a) / h;
        tangents[i + 1] = (3 * m[i] * b) / h;
      }
    }
  }

  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C ${(xs[i] + h).toFixed(1)} ${(ys[i] + tangents[i] * h).toFixed(1)}, ${(xs[i + 1] - h).toFixed(1)} ${(
      ys[i + 1] - tangents[i + 1] * h
    ).toFixed(1)}, ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return d;
}

/** The smooth line closed down to the chart floor, for the gradient fill. */
export function areaPath(points: PathPoint[], floorY: number): string {
  if (points.length < 2) return "";
  const line = smoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x.toFixed(1)} ${floorY.toFixed(1)} L ${first.x.toFixed(1)} ${floorY.toFixed(1)} Z`;
}
