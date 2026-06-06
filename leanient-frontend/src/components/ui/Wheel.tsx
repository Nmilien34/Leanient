import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ITEM_H = 50;

// eslint-disable-next-line @typescript-eslint/no-require-imports -- static asset must be bundled via require
const tickSound = require("../../../assets/tick.wav");

export interface WheelItem {
  /** What the user reads (e.g. "5' 9\"", "198 lb", "34"). */
  label: string;
  /** The stored numeric value this item represents. */
  value: number;
}

interface WheelProps {
  items: WheelItem[];
  value: number;
  onChange: (value: number) => void;
  /** Visible height of the wheel (default 200). */
  height?: number;
  /** Base font size of the off-center items (default 22). */
  fontSize?: number;
  /** Scale applied to the centered item (centered size = fontSize * centerScale). */
  centerScale?: number;
}

/**
 * Reusable chronometer wheel: snaps to each item, the centered item sits on a
 * highlight band that pulses, neighbors fade by distance, and every change fires
 * a haptic + sound "tick". Powers the age, height and weight pickers.
 *
 * To re-center after the item set changes (e.g. a unit toggle), give the Wheel a
 * `key` that changes with the unit — it remounts and parks on the new value.
 */
export function Wheel({
  items,
  value,
  onChange,
  height = 200,
  fontSize = 22,
  centerScale = 1.32,
}: WheelProps) {
  const pad = (height - ITEM_H) / 2;
  const startIndex = useMemo(() => {
    const i = items.findIndex((item) => item.value === value);
    return i < 0 ? 0 : i;
  }, [items, value]);

  const scrollY = useRef(new Animated.Value(startIndex * ITEM_H)).current;
  const lastIdx = useRef(startIndex);
  const player = useAudioPlayer(tickSound);
  const scrollRef = useRef<ScrollView>(null);
  // Pulses on every change so the band visibly reacts to the active value.
  const pulse = useRef(new Animated.Value(0)).current;

  // Park the wheel on the initial value (contentOffset prop is unreliable on web).
  useEffect(() => {
    const y = startIndex * ITEM_H;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(id);
    // mount only — re-scrolling mid-fling would interrupt the user
  }, []);

  // iOS silences app audio when the physical ring/silent switch is on, and
  // expo-audio respects it by default. The tick is a deliberate UI cue, so allow
  // it to play even in silent mode (haptics already ignore the switch).
  useEffect(() => {
    if (Platform.OS === "web") return;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const tick = (idx: number) => {
    if (idx === lastIdx.current || idx < 0 || idx >= items.length) return;
    lastIdx.current = idx;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // audio not ready yet — ignore
    }
    pulse.setValue(0);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(pulse, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    onChange(items[idx].value);
  };

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      tick(Math.round(e.nativeEvent.contentOffset.y / ITEM_H));
    },
  });

  const numStyle = {
    fontFamily: font.semibold,
    fontSize,
    letterSpacing: -0.02 * fontSize,
    color: colors.ink,
  };

  return (
    <View style={[styles.wheel, { height }]}>
      {/* center highlight band (behind items) — pulses when an item lands on it */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.band,
          { top: pad, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] },
        ]}
      >
        <LinearGradient
          colors={["rgba(47,184,122,0.16)", "rgba(255,255,255,0.85)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
          <LinearGradient
            colors={["rgba(47,184,122,0.42)", "rgba(111,224,166,0.22)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        // NOTE: do NOT set a controlled `contentOffset` here. It's derived from
        // `value`, which updates on every onChange, so iOS would force the scroll
        // back to the grid mid-momentum — a feedback loop that makes the wheel
        // scroll on its own and rate-limits the haptic ticks. Initial position is
        // set imperatively in the mount effect; re-center via a changing `key`.
        contentContainerStyle={{ paddingVertical: pad }}
        onScroll={onScroll}
      >
        {items.map((item, i) => {
          const center = i * ITEM_H;
          const inputRange = [
            (i - 2) * ITEM_H,
            (i - 1) * ITEM_H,
            center,
            (i + 1) * ITEM_H,
            (i + 2) * ITEM_H,
          ];
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.8, 0.92, centerScale, 0.92, 0.8],
            extrapolate: "clamp",
          });
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.28, 0.5, 1, 0.5, 0.28],
            extrapolate: "clamp",
          });
          return (
            <View key={`${item.value}-${item.label}`} style={styles.item}>
              <Animated.Text style={[numStyle, { opacity, transform: [{ scale }] }]}>
                {item.label}
              </Animated.Text>
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  band: {
    position: "absolute",
    height: ITEM_H,
    left: 12,
    right: 12,
    borderRadius: 15,
    overflow: "hidden",
  },
  item: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Wheel;
