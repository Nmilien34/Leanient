import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const Sprout = (
  <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 21v-8" />
    <Path d="M12 13c0-4 3-6.5 8-6.5-.8 4.5-3.5 6.5-8 6.5z" />
    <Path d="M12 13c0-3-2-4.5-5.5-4.5.7 3.5 2.7 4.5 5.5 4.5z" />
  </Svg>
);

const Trophy = (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
  </Svg>
);

interface DayWonSheetProps {
  visible: boolean;
  streakDays: number;
  /** Last-7 won marks, oldest → today. */
  weekDots: Array<"won" | "open" | "miss">;
  /** Next milestone, null past the ladder. */
  badge: { name: string; remaining: number } | null;
  /** True when finishing the next badge sets a personal record. */
  isLongestYet: boolean;
  /** The coach naming the hard part, personality-aware. */
  coachLine: string;
  onClose: () => void;
}

/**
 * Frame 09: the last card ticks and the streak grows. Sprout medal springs
 * in, the number counts, the next badge dangles, and the coach names the
 * hard part. One button out.
 */
export function DayWonSheet({ visible, streakDays, weekDots, badge, isLongestYet, coachLine, onClose }: DayWonSheetProps) {
  const slide = useRef(new Animated.Value(0)).current;
  const medal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    medal.setValue(0);
    Animated.sequence([
      Animated.timing(slide, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(medal, { toValue: 1, friction: 4, tension: 130, useNativeDriver: true }),
    ]).start();
  }, [visible, slide, medal]);

  if (!visible) return null;

  const close = () => {
    Animated.timing(slide, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(onClose);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: slide }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={close} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) }] }]}
        >
          <View style={styles.grab} />

          <Animated.View
            style={[
              styles.medalWrap,
              {
                opacity: medal,
                transform: [{ scale: medal.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              },
            ]}
          >
            <LinearGradient colors={["#4ECF8B", "#1F9E63"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.medal}>
              {Sprout}
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>Day won.</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakNum}>{streakDays}</Text>
            <Text style={styles.streakUnit}>{streakDays === 1 ? "day steady" : "days steady"}</Text>
          </View>

          <View style={styles.dots}>
            {weekDots.map((mark, i) => (
              <View key={i} style={[styles.dot, mark === "won" && styles.dotWon, mark === "open" && styles.dotOpen]} />
            ))}
          </View>

          {badge ? (
            <View style={styles.badge}>
              <View style={styles.badgeIcon}>{Trophy}</View>
              <View style={styles.badgeBody}>
                <Text style={styles.badgeTitle}>{badge.name}</Text>
                <Text style={styles.badgeSub}>
                  {badge.remaining === 1 ? "1 more day." : `${badge.remaining} more days.`}
                  {isLongestYet ? " Your longest yet." : ""}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.coach}>{coachLine}</Text>

          <Pressable accessibilityRole="button" accessibilityLabel="Keep going" onPress={close} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaText}>Keep going</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(12,16,11,0.55)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 34,
    alignItems: "center",
  },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: colors.faintest, marginTop: 6, marginBottom: 16 },
  medalWrap: { marginBottom: 14 },
  medal: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 30,
    shadowOpacity: 0.4,
    elevation: 8,
  },
  title: { fontFamily: font.extrabold, fontSize: 23, letterSpacing: -0.46, color: colors.ink },
  streakRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 6 },
  streakNum: { fontFamily: font.extrabold, fontSize: 44, letterSpacing: -1.32, color: colors.ink },
  streakUnit: { fontFamily: font.semibold, fontSize: 15, color: colors.muted },
  dots: { flexDirection: "row", gap: 7, marginTop: 14 },
  dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.sageFill },
  dotWon: { backgroundColor: colors.emerald },
  dotOpen: { backgroundColor: "#fff", borderWidth: 2.5, borderColor: colors.emerald },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
    marginTop: 18,
    backgroundColor: "rgba(227,166,94,0.10)",
    borderWidth: 1,
    borderColor: "rgba(227,166,94,0.30)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  badgeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.amber, alignItems: "center", justifyContent: "center" },
  badgeBody: { flex: 1 },
  badgeTitle: { fontFamily: font.extrabold, fontSize: 14, letterSpacing: -0.21, color: colors.ink },
  badgeSub: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
  coach: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: colors.muted, textAlign: "center", marginTop: 14, maxWidth: 300 },
  cta: {
    alignSelf: "stretch",
    marginTop: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.emeraldDeep,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    shadowOpacity: 0.35,
    elevation: 4,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: "#F4FBF7" },
});

export default DayWonSheet;
