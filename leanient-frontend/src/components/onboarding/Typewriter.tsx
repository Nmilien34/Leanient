import React, { useEffect, useRef, useState } from "react";
import { Platform, Text, type StyleProp, type TextStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { ink } from "../../theme/inkTokens";

interface TypewriterProps {
  text: string;
  /**
   * Ms per character. 32ms tracks reading speed — noticeably quicker than a
   * human types, slow enough that the line is read as it appears.
   */
  speed?: number;
  /** The coach's thinking beat before the first character. */
  delay?: number;
  /** False renders the full line instantly (returning via back, dim recaps). */
  animate?: boolean;
  /** Gate for sequenced lines: typing holds until this flips true. */
  start?: boolean;
  /** Ticks per character; the dim recap line types silently. */
  haptic?: boolean;
  style?: StyleProp<TextStyle>;
  /** Show the emerald caret while typing (and briefly after). */
  caret?: boolean;
  onDone?: () => void;
}

const HAPTIC_EVERY = 3; // one tick per few characters keeps the buzz soft

/**
 * The coach's voice: text types itself at reading speed, each burst of
 * characters landing with a soft haptic tick, an emerald caret riding the
 * line. The building block of every conversation screen.
 */
export function Typewriter({
  text,
  speed = 32,
  delay = 350,
  animate = true,
  start = true,
  haptic = true,
  style,
  caret = true,
  onDone,
}: TypewriterProps) {
  const [count, setCount] = useState(animate ? 0 : text.length);
  const [done, setDone] = useState(!animate);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!animate) {
      doneRef.current?.();
      return;
    }
    if (!start) {
      return;
    }
    setCount(0);
    setDone(false);
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const kickoff = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (haptic && Platform.OS !== "web" && i % HAPTIC_EVERY === 0 && text[i - 1] !== " ") {
          void Haptics.selectionAsync();
        }
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
          doneRef.current?.();
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(kickoff);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, delay, animate, start, haptic]);

  return (
    <Text style={style}>
      {text.slice(0, count)}
      {caret && !done ? <Text style={{ color: ink.emeraldHi }}>▍</Text> : null}
    </Text>
  );
}

export default Typewriter;
