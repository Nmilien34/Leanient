import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { SplashArt } from "../../components/brand/SplashArt";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface SplashScreenProps {
  /** Called after the intro settles (~2.2s); wires to Welcome once that screen exists. */
  onDone?: () => void;
}

const AURA_SIZE = 430;
const INOUT = Easing.inOut(Easing.ease);

export function SplashScreen({ onDone }: SplashScreenProps) {
  const { width, height } = useWindowDimensions();

  const rise = useRef(new Animated.Value(0)).current; // logo group entrance
  const floatV = useRef(new Animated.Value(0)).current; // hero float
  const pulse = useRef(new Animated.Value(0)).current; // aura pulse
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // rise: translateY 14 -> 0, opacity 0 -> 1, 900ms cubic-bezier(.2,.8,.2,1)
    Animated.timing(rise, {
      toValue: 1,
      duration: 900,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();

    // float: 0 -> -8 -> 0 over 4.5s ease-in-out, infinite
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatV, { toValue: 1, duration: 2250, easing: INOUT, useNativeDriver: true }),
        Animated.timing(floatV, { toValue: 0, duration: 2250, easing: INOUT, useNativeDriver: true }),
      ]),
    ).start();

    // pulse (aura): opacity .7->1, scale 1->1.06 over 5s ease-in-out, infinite
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2500, easing: INOUT, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2500, easing: INOUT, useNativeDriver: true }),
      ]),
    ).start();

    // blink dots: 1.2s loop, staggered 0 / 180 / 360ms
    const blink = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 600, easing: INOUT, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 600, easing: INOUT, useNativeDriver: true }),
        ]),
      );
    const b0 = blink(dot0, 0);
    const b1 = blink(dot1, 180);
    const b2 = blink(dot2, 360);
    b0.start();
    b1.start();
    b2.start();

    const timer = onDone ? setTimeout(onDone, 2200) : undefined;
    return () => {
      if (timer) clearTimeout(timer);
      b0.stop();
      b1.stop();
      b2.stop();
    };
  }, [rise, floatV, pulse, dot0, dot1, dot2, onDone]);

  const riseStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  const floatStyle = {
    transform: [{ translateY: floatV.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
  };
  const auraStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
  };
  const dotStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[colors.splashTop, colors.splashMid, colors.splashBottom]}
        locations={[0, 0.56, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* aura glow behind the hero */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.aura,
          { left: (width - AURA_SIZE) / 2, top: height / 2 - AURA_SIZE / 2 - 40 },
          auraStyle,
        ]}
      >
        <Svg width={AURA_SIZE} height={AURA_SIZE}>
          <Defs>
            <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.emerald} stopOpacity={0.26} />
              <Stop offset="0.5" stopColor={colors.emerald} stopOpacity={0.07} />
              <Stop offset="0.72" stopColor={colors.emerald} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={AURA_SIZE / 2} cy={AURA_SIZE / 2} r={AURA_SIZE / 2} fill="url(#aura)" />
        </Svg>
      </Animated.View>

      {/* centered logo group */}
      <Animated.View style={[styles.logo, riseStyle]}>
        <Animated.View style={[styles.hero, floatStyle]}>
          <SplashArt />
        </Animated.View>
        <Text style={styles.word}>Leanient</Text>
        <Text style={styles.tag}>Keep yourself intact.</Text>
      </Animated.View>

      {/* loader */}
      <View style={styles.loader} pointerEvents="none">
        <Animated.View style={[styles.dot, dotStyle(dot0)]} />
        <Animated.View style={[styles.dot, dotStyle(dot1)]} />
        <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  aura: {
    position: "absolute",
    width: AURA_SIZE,
    height: AURA_SIZE,
  },
  logo: {
    alignItems: "center",
    gap: 30,
  },
  hero: {
    // drop-shadow(0 22px 32px rgba(20,90,56,.2)) — iOS follows the SVG silhouette;
    // on web/Android a View shadow is a rectangle, so we let the aura carry the glow there.
    ...Platform.select({
      ios: {
        shadowColor: "#145A38",
        shadowOffset: { width: 0, height: 14 },
        shadowRadius: 16,
        shadowOpacity: 0.25,
      },
      default: {},
    }),
  },
  word: {
    fontFamily: font.bold,
    fontSize: 38,
    letterSpacing: -1.33, // -0.035em * 38
    color: colors.ink,
  },
  tag: {
    fontFamily: font.regular,
    fontSize: 16,
    letterSpacing: 0.08, // 0.005em * 16
    color: colors.muted,
    marginTop: -16,
  },
  loader: {
    position: "absolute",
    bottom: 62,
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
});

export default SplashScreen;
