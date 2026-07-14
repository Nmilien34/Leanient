import React, { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import type { TaskCardView, TaskChip } from "../../screens/app/homeTaskCards";
import type { DayMark } from "../../screens/app/consistency";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ICON_STROKE: Record<string, string> = { plain: colors.emeraldDeep, amber: colors.amberDeep };

function KindIcon({ kind, amber }: { kind: TaskCardView["kind"]; amber?: boolean }) {
  const stroke = amber ? ICON_STROKE.amber : ICON_STROKE.plain;
  const paths: Record<TaskCardView["kind"], string> = {
    protein: "M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8",
    session: "M7 5v12M15 5v12M3.5 8v6M18.5 8v6M7 11h8",
    shot: "M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4",
    water: "M12 3c3.5 4.5 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.5-6.5 6-11z",
    weighin: "M4 9h16l-1.5 11h-13zM9 9a3 3 0 0 1 6 0",
    walk: "M13.6 4.6a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0M12.5 8l-2.5 5 2 2.5 1 5M12.5 8l3 2.5 2.5 1M12.5 8L9 9.5 7.5 12.5M10 13l-2.5 6.5",
  };
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={paths[kind]} />
    </Svg>
  );
}

/** 40px progress ring with the percentage seated inside (mock .tring). */
function MiniRing({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={styles.ring}>
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Circle cx={20} cy={20} r={r} stroke="#E9EAE4" strokeWidth={5} fill="none" />
        <Circle
          cx={20}
          cy={20}
          r={r}
          stroke={colors.emerald}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          transform="rotate(-90 20 20)"
        />
      </Svg>
      <Text style={styles.ringText}>{Math.round(clamped)}%</Text>
    </View>
  );
}

function RightVisual({ view }: { view: TaskCardView }) {
  if (view.right === "ring") return <MiniRing pct={view.pct ?? 0} />;
  const primary = view.right === "playPrimary" || view.right === "goPrimary";
  const play = view.right === "play" || view.right === "playPrimary";
  const stroke = primary ? "#fff" : colors.emeraldDeep;
  return (
    <View style={[styles.go, primary && styles.goPrimary]}>
      {play ? (
        <Svg width={15} height={15} viewBox="0 0 24 24" fill={stroke}>
          <Path d="M8 5.5v13l11-6.5z" />
        </Svg>
      ) : (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <Path d={primary ? "M5 12h14M13 6l6 6-6 6" : "M9 6l6 6-6 6"} />
        </Svg>
      )}
    </View>
  );
}

function Chips({ chips }: { chips: TaskChip[] }) {
  if (!chips.length) return null;
  return (
    <View style={styles.chips}>
      {chips.map((chip) => (
        <View key={chip.label} style={[styles.chip, chip.tone === "em" && styles.chipEm, chip.tone === "am" && styles.chipAm]}>
          <Text
            style={[styles.chipText, chip.tone === "em" && styles.chipTextEm, chip.tone === "am" && styles.chipTextAm]}
            numberOfLines={1}
          >
            {chip.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * One v2 plan card. Done cards compress into a sage strip with a struck title;
 * the false→true transition pops the check and lands a success haptic, so a
 * finished task is felt, not just repainted.
 */
export function TaskCard({ view, onPress }: { view: TaskCardView; onPress?: () => void }) {
  const pop = useRef(new Animated.Value(1)).current;
  const wasDone = useRef(view.done);
  useEffect(() => {
    if (view.done && !wasDone.current) {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      pop.setValue(0.92);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
    }
    wasDone.current = view.done;
  }, [view.done, pop]);

  if (view.done) {
    return (
      <Animated.View style={[styles.card, styles.cardDone, { transform: [{ scale: pop }] }]}>
        <View style={styles.doneTic}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12.5l5 5 9-11" />
          </Svg>
        </View>
        <Text style={styles.doneTitle} numberOfLines={1}>
          {view.title}
        </Text>
        {view.doneChip ? (
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {view.doneChip}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={view.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        view.focus && styles.cardFocus,
        pressed && onPress ? styles.cardPressed : null,
      ]}
    >
      <View style={[styles.tile, view.amber && styles.tileAmber]}>
        <KindIcon kind={view.kind} amber={view.amber} />
      </View>
      <View style={styles.body}>
        {view.focus && view.focusLabel ? <Text style={styles.focusLabel}>{view.focusLabel}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {view.title}
        </Text>
        <Chips chips={view.chips} />
      </View>
      <RightVisual view={view} />
    </Pressable>
  );
}

/** Plan header: eyebrow with the day personality + the rolling momentum chip. */
export function PlanHeader({ personalityLabel, amber, momentum }: { personalityLabel: string; amber?: boolean; momentum: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>
        TODAY'S PLAN · <Text style={amber ? styles.eyebrowAm : styles.eyebrowEm}>{personalityLabel}</Text>
      </Text>
      <View style={styles.momentum}>
        <Text style={styles.momentumText}>{momentum}</Text>
      </View>
    </View>
  );
}

/** Plan footer: N OF N, the animated progress bar, and the week dots. */
export function PlanFooter({ done, total, dots }: { done: number; total: number; dots: DayMark[] }) {
  const fill = useRef(new Animated.Value(0)).current;
  const target = total > 0 ? done / total : 0;
  useEffect(() => {
    Animated.timing(fill, { toValue: target, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [target, fill]);

  return (
    <View style={styles.footer}>
      <Text style={styles.footerLabel}>
        {done} OF {total}
      </Text>
      <View style={styles.bar}>
        <Animated.View
          style={[
            styles.barFill,
            { width: fill.interpolate({ inputRange: [0, 1], outputRange: ["4%", "100%"] }) },
          ]}
        />
      </View>
      <View style={styles.dots}>
        {dots.map((mark, i) => (
          <View key={i} style={[styles.dot, mark === "hit" && styles.dotHit, mark === "open" && styles.dotOpen]} />
        ))}
      </View>
    </View>
  );
}

export function TaskCardList({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

const styles = StyleSheet.create({
  // mock .task: mt10, r18, padding 13 14, gap 13, shadow 0 8 18 .06
  card: {
    marginHorizontal: 20,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  cardFocus: {
    borderWidth: 1.5,
    borderColor: colors.emerald,
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    shadowOpacity: 0.16,
    elevation: 3,
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardDone: {
    backgroundColor: colors.sageFill,
    paddingVertical: 10,
    shadowOpacity: 0,
    elevation: 0,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E7F4EC",
    alignItems: "center",
    justifyContent: "center",
  },
  tileAmber: { backgroundColor: "#F7ECDB" },
  doneTic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  focusLabel: { fontFamily: font.bold, fontSize: 9.5, letterSpacing: 0.76, color: colors.emeraldDeep, marginBottom: 3 },
  title: { fontFamily: font.extrabold, fontSize: 16.5, letterSpacing: -0.25, color: colors.ink },
  doneTitle: {
    flex: 1,
    fontFamily: font.bold,
    fontSize: 14.5,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: { backgroundColor: colors.sageFill, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  chipEm: { backgroundColor: "rgba(47,184,122,0.12)" },
  chipAm: { backgroundColor: "rgba(227,166,94,0.16)" },
  chipText: { fontFamily: font.bold, fontSize: 11, letterSpacing: -0.05, color: colors.muted },
  chipTextEm: { color: colors.emeraldDeep },
  chipTextAm: { color: colors.amberDeep },
  ring: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  ringText: { position: "absolute", fontFamily: font.extrabold, fontSize: 10.5, color: colors.emeraldDeep },
  go: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(47,184,122,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  goPrimary: {
    backgroundColor: colors.emeraldDeep,
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.4,
    elevation: 4,
  },
  header: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  eyebrowEm: { color: colors.emeraldDeep },
  eyebrowAm: { color: colors.amberDeep },
  momentum: { backgroundColor: "rgba(47,184,122,0.12)", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  momentumText: { fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.44, color: colors.emeraldDeep },
  footer: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerLabel: { fontFamily: font.extrabold, fontSize: 12, color: colors.emeraldDeep },
  bar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "#E4E5DF", overflow: "hidden" },
  barFill: { height: 7, borderRadius: 4, backgroundColor: colors.emerald },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.sageFill },
  dotHit: { backgroundColor: colors.emerald },
  dotOpen: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.emerald },
});

export default TaskCard;
