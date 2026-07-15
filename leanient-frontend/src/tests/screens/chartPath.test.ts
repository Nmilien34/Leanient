import { describe, expect, it } from "vitest";
import { areaPath, smoothPath } from "../../screens/app/chartPath";

const finite = (d: string) => {
  const numbers = d.match(/-?\d+(\.\d+)?/g) ?? [];
  return numbers.every((n) => Number.isFinite(Number(n)));
};

describe("smoothPath", () => {
  it("draws a cubic through several points with finite coordinates", () => {
    const d = smoothPath([
      { x: 10, y: 22 },
      { x: 105, y: 42 },
      { x: 205, y: 66 },
      { x: 312, y: 84 },
    ]);
    expect(d.startsWith("M 10.0 22.0")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(3);
    expect(d.endsWith("312.0 84.0")).toBe(true);
    expect(finite(d)).toBe(true);
  });

  it("handles the degenerate sizes", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 5, y: 5 }])).toBe("M 5.0 5.0");
    const two = smoothPath([
      { x: 0, y: 10 },
      { x: 100, y: 40 },
    ]);
    expect(two.match(/C/g)).toHaveLength(1);
    expect(finite(two)).toBe(true);
  });

  it("stays finite when two points share an x (same-day logs)", () => {
    const d = smoothPath([
      { x: 50, y: 10 },
      { x: 50, y: 14 },
      { x: 120, y: 30 },
    ]);
    expect(finite(d)).toBe(true);
  });

  it("keeps a monotone run monotone (no overshoot beyond the data)", () => {
    const d = smoothPath([
      { x: 0, y: 100 },
      { x: 100, y: 60 },
      { x: 200, y: 58 },
      { x: 300, y: 20 },
    ]);
    const ys = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(20);
  });

  it("flattens control points across a flat segment", () => {
    const d = smoothPath([
      { x: 0, y: 50 },
      { x: 100, y: 50 },
      { x: 200, y: 50 },
    ]);
    const ys = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);
    expect(ys.every((y) => y === 50)).toBe(true);
  });
});

describe("areaPath", () => {
  it("closes the line down to the floor", () => {
    const d = areaPath(
      [
        { x: 10, y: 22 },
        { x: 312, y: 84 },
      ],
      116,
    );
    expect(d).toContain("L 312.0 116.0");
    expect(d).toContain("L 10.0 116.0");
    expect(d.endsWith("Z")).toBe(true);
  });

  it("needs two points", () => {
    expect(areaPath([{ x: 10, y: 22 }], 116)).toBe("");
  });
});
