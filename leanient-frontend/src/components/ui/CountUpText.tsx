import React, { useEffect, useRef, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

interface CountUpTextProps {
  value: number;
  /** Animation length in ms. */
  durationMs?: number;
  /** Decimal places to show (default 0). */
  decimals?: number;
  /**
   * Where the count starts on first mount, as a fraction of the target (0-1).
   * Starting partway up means it sweeps a shorter range in the same time, so the
   * digits change slower and it reads as a calm settle instead of a fast blur.
   */
  startFraction?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

// Ease-in-out: a steady climb through the middle with a soft start and landing,
// rather than racing up front then crawling at the end.
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Counts a number up to `value` on mount (and re-animates from the previous
 * value when it changes), so data feels like it builds in as the app loads. The
 * first mount begins at `startFraction` of the target so the climb reads calm;
 * the final accessibility label is the resolved value, not the in-flight tween.
 */
export function CountUpText({
  value,
  durationMs = 2200,
  decimals = 0,
  startFraction = 0.6,
  prefix = "",
  suffix = "",
  style,
  accessibilityLabel,
}: CountUpTextProps) {
  const [display, setDisplay] = useState(() => value * startFraction);
  const fromRef = useRef(value * startFraction);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    let start: number | undefined;
    const tick = (now: number) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (to - from) * easeInOutSine(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Land on the target so a value change tweens from here, not from 0.
      fromRef.current = to;
    };
  }, [value, durationMs]);

  return (
    <Text style={style} accessibilityLabel={accessibilityLabel ?? `${prefix}${value.toFixed(decimals)}${suffix}`}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </Text>
  );
}

export default CountUpText;
