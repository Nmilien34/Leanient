import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";
import { QUICK_LOG_BACKDROP_BLUR_INTENSITY, QUICK_LOG_BACKDROP_DIM_COLOR } from "./quickLogBackdrop";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

type IconProps = { children: React.ReactNode };
const Glyph = ({ children }: IconProps) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

const ROWS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "scan_meal", label: "Scan meal", icon: <Glyph><Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><Circle cx={12} cy={13} r={3.2} /></Glyph> },
  { key: "meal", label: "Manual meal", icon: <Glyph><Path d="M6 3v7a3 3 0 0 0 6 0V3M9 10v11M17 3c-2 1-3 3-3 6s1 4 3 4v8" /></Glyph> },
  { key: "workout", label: "Workout", icon: <Glyph><Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" /></Glyph> },
  { key: "dose", label: "Dose", icon: <Glyph><Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" /></Glyph> },
  { key: "weight", label: "Weight", icon: <Glyph><Path d="M4 9h16l-1.5 11h-13zM9 9a3 3 0 0 1 6 0" /></Glyph> },
  { key: "measurement", label: "Measurement", icon: <Glyph><Rect x={3} y={8} width={18} height={8} rx={1} /><Path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></Glyph> },
  { key: "photo", label: "Progress photo", icon: <Glyph><Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><Circle cx={12} cy={13} r={3.2} /></Glyph> },
  { key: "side", label: "Side effect", icon: <Glyph><Polyline points="12,3 21,19 3,19 12,3" /><Path d="M12 9v5M12 17v.5" /></Glyph> },
];

interface QuickLogSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (key: string) => void;
}

/** Frosted "Log something" bottom sheet (rows are scaffolds for now). */
export function QuickLogSheet({ visible, onClose, onSelect }: QuickLogSheetProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <BlurView intensity={QUICK_LOG_BACKDROP_BLUR_INTENSITY} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] },
        ]}
      >
        <View style={styles.grabber} />
        <Text style={styles.title}>Log something</Text>
        {ROWS.map((row) => (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            onPress={() => (onSelect ? onSelect(row.key) : onClose())}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.icon}>{row.icon}</View>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 50 },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: QUICK_LOG_BACKDROP_DIM_COLOR },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: "rgba(12,16,11,1)",
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 24,
    shadowOpacity: 0.18,
    elevation: 16,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.faintest, alignSelf: "center", marginBottom: 14 },
  title: {
    fontFamily: font.extrabold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.ink,
    marginLeft: 6,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  rowPressed: { backgroundColor: colors.sageFill },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(47,184,122,0.10)",
  },
  label: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  chev: { fontFamily: font.regular, fontSize: 22, color: colors.faint },
});

export default QuickLogSheet;
