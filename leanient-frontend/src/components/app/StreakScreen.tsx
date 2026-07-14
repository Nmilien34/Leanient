import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenGround } from "../layout/ScreenGround";
import type { MedalView } from "../../screens/app/medals";
import type { StreakRead } from "../../screens/app/streak";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const Sprout = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 21v-8" />
    <Path d="M12 13c0-4 3-6.5 8-6.5-.8 4.5-3.5 6.5-8 6.5z" />
    <Path d="M12 13c0-3-2-4.5-5.5-4.5.7 3.5 2.7 4.5 5.5 4.5z" />
  </Svg>
);

const Shield = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
  </Svg>
);

const Lock = (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 11h14v9H5zM8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

const Trophy = (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
  </Svg>
);

interface StreakScreenProps {
  visible: boolean;
  streak: StreakRead;
  medals: MedalView[];
  onClose: () => void;
}

/**
 * Frame 10: Your streak. The number, the passes, and the medal cabinet —
 * dignified recognition, no confetti. Grid cells are fixed-height with
 * two-line title blocks so the cabinet sits even on every phone width.
 */
export function StreakScreen({ visible, streak, medals, onClose }: StreakScreenProps) {
  if (!visible) return null;
  const earnedCount = medals.filter((m) => m.earned).length;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
            <View style={styles.headCenter}>
              <View style={styles.coachdot}>
                <Sprout size={14} color="#fff" />
              </View>
              <Text style={styles.headTitle}>Your streak</Text>
            </View>
            <View style={styles.closeBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.heroRow}>
                <Text style={styles.heroNum}>{streak.days}</Text>
                <Text style={styles.heroUnit}>{streak.days === 1 ? "day steady" : "days steady"}</Text>
              </View>
              <View style={styles.heroChips}>
                {streak.days > 0 && streak.days >= streak.longest ? (
                  <View style={[styles.chip, styles.chipEm]}>
                    <Text style={[styles.chipText, styles.chipTextEm]}>longest yet</Text>
                  </View>
                ) : streak.longest > 0 ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>longest · {streak.longest} days</Text>
                  </View>
                ) : null}
                <View style={styles.chip}>
                  <Shield size={12} />
                  <Text style={styles.chipText}>
                    {streak.passAvailable ? "1 pass left this week" : "pass used this week"}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.eyebrow}>
              EARNED · <Text style={{ color: colors.emeraldDeep }}>{earnedCount} {earnedCount === 1 ? "MEDAL" : "MEDALS"}</Text>
            </Text>

            <View style={styles.grid}>
              {medals.map((medal) => (
                <View key={medal.key} style={styles.medal}>
                  {medal.earned ? (
                    <LinearGradient
                      colors={medal.amber ? ["#ECC084", "#C8843A"] : ["#4ECF8B", "#1F9E63"]}
                      start={{ x: 0.2, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={styles.medalIcon}
                    >
                      {medal.amber ? Trophy : <Sprout size={18} color="#fff" />}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.medalIcon, styles.medalIconLocked]}>{Lock}</View>
                  )}
                  <View style={styles.medalNameWrap}>
                    <Text style={[styles.medalName, !medal.earned && styles.medalNameLocked]} numberOfLines={2}>
                      {medal.name}
                    </Text>
                  </View>
                  {!medal.earned && medal.pct != null ? (
                    <View style={styles.medalBar}>
                      <View style={[styles.medalFill, { width: `${Math.round(Math.max(0.04, medal.pct) * 100)}%` }]} />
                    </View>
                  ) : null}
                  <Text style={styles.medalSub} numberOfLines={1}>
                    {medal.sub}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.pass}>
              <View style={styles.passIcon}>
                <Shield size={16} />
              </View>
              <View style={styles.passBody}>
                <Text style={styles.passTitle}>Your steady pass</Text>
                <Text style={styles.passSub}>
                  Covers one missed day a week, automatically. Streaks bend, they don't break.
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  coachdot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  hero: { alignItems: "center", paddingVertical: 14 },
  heroRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  heroNum: { fontFamily: font.extrabold, fontSize: 48, letterSpacing: -1.44, color: colors.ink },
  heroUnit: { fontFamily: font.semibold, fontSize: 15, color: colors.muted },
  heroChips: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.sageFill,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  chipEm: { backgroundColor: "rgba(47,184,122,0.12)" },
  chipText: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted },
  chipTextEm: { color: colors.emeraldDeep },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted, paddingHorizontal: 2, paddingTop: 14, paddingBottom: 4 },
  // Even three-up grid: fixed cell height + two-line title block keeps every
  // row aligned regardless of name length or phone width.
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  medal: {
    width: "31.5%",
    minHeight: 128,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  medalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  medalIconLocked: { backgroundColor: colors.sageFill },
  medalNameWrap: { height: 32, justifyContent: "center", marginTop: 8 },
  medalName: { fontFamily: font.extrabold, fontSize: 12, lineHeight: 15, letterSpacing: -0.12, color: colors.ink, textAlign: "center" },
  medalNameLocked: { color: colors.muted },
  medalBar: { alignSelf: "stretch", height: 5, borderRadius: 3, backgroundColor: colors.sageFill, overflow: "hidden", marginTop: 5 },
  medalFill: { height: 5, borderRadius: 3, backgroundColor: colors.emerald },
  medalSub: { fontFamily: font.medium, fontSize: 10, color: colors.faint, marginTop: 5 },
  pass: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  passIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(47,184,122,0.12)", alignItems: "center", justifyContent: "center" },
  passBody: { flex: 1 },
  passTitle: { fontFamily: font.bold, fontSize: 13, letterSpacing: -0.13, color: colors.ink },
  passSub: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 16, color: colors.muted, marginTop: 1 },
});

export default StreakScreen;
