import React, { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/tokens";

const TRACK_H = 10;
const HANDLE = 32;
const RING = 46;

interface SliderProps {
  min: number;
  max: number;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}

/**
 * Custom track/fill/handle slider (RN has no styleable native one). Maps drag
 * position → value, snapping to `step`, and fires a haptic on each step change.
 * While dragging, the handle grows and a soft ring fades in (the "subtle
 * animation"); the parent reads `onChange` to update its readout in real time.
 */
export function Slider({ min, max, value, step = 1, onChange }: SliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const pageXRef = useRef(0);
  const barRef = useRef<View>(null);
  const lastValue = useRef(value);

  const handleScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Keep the haptic dedup ref in sync when the value is changed externally
  // (e.g. tapping a persona on the Pace screen), so the next drag doesn't
  // double-fire.
  useEffect(() => {
    lastValue.current = value;
  }, [value]);

  const span = Math.max(1, max - min);
  const fraction = Math.min(1, Math.max(0, (value - min) / span));

  const emit = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const f = Math.min(1, Math.max(0, x / w));
    const raw = min + f * span;
    const next = Math.min(max, Math.max(min, Math.round(raw / step) * step));
    if (next !== lastValue.current) {
      lastValue.current = next;
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      onChange(next);
    }
  };

  const grab = () => {
    Animated.spring(handleScale, { toValue: 1.18, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
    Animated.timing(ringOpacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  };
  const release = () => {
    Animated.spring(handleScale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 4 }).start();
    Animated.timing(ringOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        grab();
        barRef.current?.measureInWindow((x) => {
          pageXRef.current = x;
        });
        emit(e.nativeEvent.locationX);
      },
      onPanResponderMove: (_e, g) => {
        emit(g.moveX - pageXRef.current);
      },
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    }),
  ).current;

  const handleLeft = fraction * width - HANDLE / 2;
  const ringLeft = fraction * width - RING / 2;

  return (
    <View
      ref={barRef}
      style={styles.bar}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      {...pan.panHandlers}
    >
      <LinearGradient
        colors={[colors.emerald, colors.emeraldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: Math.max(TRACK_H, fraction * width) }]}
      />

      {/* grow ring (behind handle) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { left: ringLeft, opacity: ringOpacity }]}
      />

      {/* handle */}
      <Animated.View
        pointerEvents="none"
        style={[styles.handle, { left: handleLeft, transform: [{ scale: handleScale }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: "rgba(222,231,212,0.9)",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
  },
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    top: (TRACK_H - RING) / 2,
    backgroundColor: "rgba(47,184,122,0.18)",
  },
  handle: {
    position: "absolute",
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    top: (TRACK_H - HANDLE) / 2,
    backgroundColor: colors.glassWhite,
    borderWidth: 3,
    borderColor: colors.emeraldDeep,
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 0.55,
    elevation: 6,
  },
});

export default Slider;
