import React, { useMemo } from "react";
import { Wheel, type WheelItem } from "./Wheel";

interface AgeWheelProps {
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
}

/**
 * Age picker — a thin wrapper over the reusable {@link Wheel} (the click + sound +
 * band-pulse behavior lives there). Kept as its own component so the Basics screen
 * reads clearly and the age range/format stays in one place.
 */
export function AgeWheel({ min = 18, max = 99, value, onChange }: AgeWheelProps) {
  const items = useMemo<WheelItem[]>(
    () => Array.from({ length: max - min + 1 }, (_, i) => ({ value: min + i, label: String(min + i) })),
    [min, max],
  );

  return <Wheel items={items} value={value} onChange={onChange} height={200} fontSize={22} centerScale={1.32} />;
}

export default AgeWheel;
