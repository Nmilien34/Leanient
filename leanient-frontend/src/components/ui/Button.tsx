import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface VariantSpec {
  gradient?: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  solid?: string;
  border?: string;
  textColor: string;
  shadowColor?: string;
  sheen: boolean;
}

/** Variant table — add new button styles here, not in screens. */
const VARIANTS: Record<ButtonVariant, VariantSpec> = {
  // .cta — glossy emerald gradient with a sweeping sheen
  primary: {
    gradient: ["#4ECF8B", "#2DB87A", "#1F9E63"],
    locations: [0, 0.56, 1],
    textColor: "#F4F8EF",
    shadowColor: colors.emeraldDeep,
    sheen: true,
  },
  // light emerald-tinted secondary (used later, e.g. "Log this meal")
  secondary: {
    solid: "rgba(47,184,122,0.10)",
    border: "rgba(47,184,122,0.35)",
    textColor: colors.emeraldDeep,
    sheen: false,
  },
  ghost: {
    solid: "transparent",
    textColor: colors.muted,
    sheen: false,
  },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to parent width (default true). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const spec = VARIANTS[variant];
  const isInteractive = !disabled && !loading;

  const press = useRef(new Animated.Value(0)).current; // 0 idle -> 1 pressed
  const sheen = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  // sheen sweep (mirrors @keyframes sheen: hold, sweep, hold over 4.5s)
  useEffect(() => {
    if (!spec.sheen || width === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sheen, { toValue: 0, duration: 990, useNativeDriver: true }),
        Animated.timing(sheen, {
          toValue: 1,
          duration: 1485,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheen, { toValue: 1, duration: 2025, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [spec.sheen, sheen, width]);

  const pressTo = (to: number) =>
    Animated.timing(press, { toValue: to, duration: 120, useNativeDriver: true }).start();

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
  const sheenTranslate = sheen.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.6, width * 1.3],
  });

  const shadowStyle: ViewStyle =
    variant === "primary"
      ? {
          shadowColor: spec.shadowColor,
          shadowOffset: { width: 0, height: 12 },
          shadowRadius: 16,
          shadowOpacity: disabled ? 0 : 0.45,
          elevation: disabled ? 0 : 8,
        }
      : {};

  return (
    <Animated.View
      style={[
        styles.wrap,
        fullWidth && styles.full,
        { transform: [{ scale }], opacity: disabled ? 0.5 : 1 },
        shadowStyle,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !isInteractive }}
        disabled={!isInteractive}
        onPress={onPress}
        onPressIn={() => pressTo(1)}
        onPressOut={() => pressTo(0)}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.base,
          spec.solid ? { backgroundColor: spec.solid } : null,
          spec.border ? { borderWidth: 1.5, borderColor: spec.border } : null,
        ]}
      >
        {spec.gradient ? (
          <LinearGradient
            colors={spec.gradient}
            locations={spec.locations}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* top inner highlight (box-shadow inset in CSS) */}
        {variant === "primary" ? <View style={styles.innerHighlight} pointerEvents="none" /> : null}

        {spec.sheen && width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.sheen, { transform: [{ translateX: sheenTranslate }, { skewX: "-18deg" }] }]}
          >
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.18)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={spec.textColor} />
        ) : (
          <Text style={[styles.label, { color: spec.textColor }, textStyle]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // border-radius on the shadow wrapper so the (web) box-shadow follows the pill, not a rectangle
  wrap: { borderRadius: 31 },
  full: { alignSelf: "stretch" },
  base: {
    height: 62,
    borderRadius: 31,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  sheen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 17,
    letterSpacing: -0.17, // -0.01em * 17
  },
});

export default Button;
