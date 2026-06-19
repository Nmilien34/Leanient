import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { VerdictStatus, WeeklyVerdict } from "@leanient/shared";
import { RadialGlow } from "../layout/RadialGlow";
import { shouldShowVerdictCardAction } from "./verdictCardBehavior";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface StatusStyle {
  pill: string;
  pillBg: string;
  pillText: string;
  dot: string;
  halo?: string;
  btn: readonly [string, string, string];
  headColor: string;
}

const STATUS: Record<VerdictStatus, StatusStyle> = {
  on_track: {
    pill: "ON TRACK",
    pillBg: "rgba(47,184,122,0.13)",
    pillText: colors.emeraldDeep,
    dot: colors.emerald,
    halo: "rgba(47,184,122,0.40)",
    btn: ["#4ECF8B", "#2DB87A", "#1F9E63"],
    headColor: colors.ink,
  },
  drifting: {
    pill: "DRIFTING",
    pillBg: "rgba(227,166,94,0.16)",
    pillText: colors.amberDeep,
    dot: colors.amber,
    halo: "rgba(227,166,94,0.40)",
    btn: ["#EBB873", "#E3A65E", "#C8843A"],
    headColor: colors.ink,
  },
  losing_muscle: {
    pill: "NEEDS A RESET",
    pillBg: "rgba(86,97,89,0.16)",
    pillText: colors.slate,
    dot: colors.slate,
    halo: "rgba(86,97,89,0.34)",
    btn: ["#63705F", "#566159", "#46503F"],
    headColor: colors.ink,
  },
  no_data: {
    pill: "STILL GATHERING",
    pillBg: "#EDEEE8",
    pillText: colors.muted,
    dot: colors.faint,
    btn: ["#2A2E2B", "#1E221F", "#191D1A"],
    headColor: colors.inkSoft,
  },
};

const ACTION_LABELS: Record<string, string> = {
  see_plan: "See this week's plan",
  fix_protein_lunch: "Fix it today — 30g protein at lunch",
  start_upper_body: "Start a 20-min upper body workout",
  log_checkin: "Log check-in",
};

/**
 * Replaces the status-derived copy/styling without changing the card itself —
 * used by the Home "Today" scope, where the hero is shot-cycle driven rather
 * than verdict driven. `tone` picks one of the calm status palettes.
 */
export interface VerdictCardOverride {
  tone: VerdictStatus;
  pill: string;
  headline: string;
  message: string;
  actionLabel: string;
}

interface VerdictCardProps {
  verdict: WeeklyVerdict;
  contextLabel?: string;
  onAction?: () => void;
  /** Compact variant (no context line, no action button) for the states grid. */
  mini?: boolean;
  /**
   * Slim full-width variant: smaller headline, lighter shadow, no action button.
   * Used on Home's Today scope where it frames the day and the plan lives in its
   * own card below, so the hero shouldn't compete with the data cards.
   */
  compact?: boolean;
  /**
   * Strips the card's own chrome (border, shadow, background, margins) so it can
   * sit inside a shared container — used to fuse the worded verdict with the
   * breakdown into one block on the week tab. Keeps inner padding.
   */
  bare?: boolean;
  /** Drives the card from non-verdict data (e.g. the daily shot-cycle hero). */
  override?: VerdictCardOverride;
}

export function VerdictCard({ verdict, contextLabel, onAction, mini, compact, bare, override }: VerdictCardProps) {
  const s = STATUS[override?.tone ?? verdict.status];
  const press = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });
  const pillText = override?.pill ?? s.pill;
  const headline = override?.headline ?? verdict.headline;
  const message = override?.message ?? verdict.message;
  const actionLabel = override?.actionLabel ?? ACTION_LABELS[verdict.nextActionCode] ?? "See this week's plan";
  const showAction = !compact && shouldShowVerdictCardAction({ mini, onAction });

  return (
    <View style={[styles.card, mini && styles.cardMini, compact && styles.cardCompact, bare && styles.cardBare]}>
      {s.halo ? (
        <RadialGlow
          size={mini || compact ? 160 : 220}
          position={{ top: -50, right: -40 }}
          stops={[
            { offset: 0, color: s.halo, opacity: 1 },
            { offset: 0.7, color: s.halo, opacity: 0 },
          ]}
        />
      ) : null}

      {!mini && contextLabel ? <Text style={[styles.ctx, compact && styles.ctxCompact]}>{contextLabel}</Text> : null}

      <View style={[styles.pill, mini && styles.pillMini, compact && styles.pillCompact, { backgroundColor: s.pillBg }]}>
        <View style={[styles.dot, { backgroundColor: s.dot }]} />
        <Text style={[styles.pillText, { color: s.pillText }]}>{pillText}</Text>
      </View>

      <Text style={[styles.head, mini && styles.headMini, compact && styles.headCompact, { color: s.headColor }]}>{headline}</Text>
      <Text style={[styles.reason, mini && styles.reasonMini, compact && styles.reasonCompact]} numberOfLines={mini ? 3 : undefined}>
        {message}
      </Text>

      {showAction ? (
        <Animated.View style={{ transform: [{ scale }], marginTop: 20 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            onPressIn={() => Animated.timing(press, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
            onPressOut={() => Animated.timing(press, { toValue: 0, duration: 110, useNativeDriver: true }).start()}
          >
            <LinearGradient colors={s.btn} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.btn}>
              <Text style={styles.btnText}>{actionLabel}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 26,
    padding: 22,
    paddingTop: 24,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 28,
    shadowOpacity: 0.16,
    elevation: 6,
  },
  cardMini: { marginHorizontal: 0, marginTop: 0, flex: 1, padding: 15, paddingBottom: 16, borderRadius: 18 },
  cardCompact: { padding: 18, paddingTop: 18, borderRadius: 20, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  cardBare: { marginHorizontal: 0, marginTop: 0, borderRadius: 0, borderWidth: 0, backgroundColor: "transparent", shadowOpacity: 0, elevation: 0, paddingBottom: 18 },
  ctx: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  ctxCompact: { fontSize: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  pillMini: { marginTop: 0 },
  pillCompact: { marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.8 },
  head: {
    fontFamily: font.extrabold,
    fontSize: 31,
    lineHeight: 35,
    letterSpacing: -0.93,
    marginTop: 14,
  },
  headMini: { fontSize: 19, lineHeight: 22, letterSpacing: -0.57, marginTop: 10 },
  headCompact: { fontSize: 23, lineHeight: 27, letterSpacing: -0.6, marginTop: 10 },
  reason: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 11,
  },
  reasonMini: { fontSize: 12, lineHeight: 16, marginTop: 8 },
  reasonCompact: { fontSize: 13.5, lineHeight: 19, marginTop: 7 },
  btn: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
});

export default VerdictCard;
