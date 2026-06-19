import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import type { VerdictStatus, WeeklyVerdict } from "@leanient/shared";
import { Button } from "../ui/Button";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import type { HomeMetrics } from "../../screens/app/homeMetrics";

const TITLE: Record<VerdictStatus, string> = {
  on_track: "Why you're keeping muscle",
  drifting: "Why you're drifting",
  losing_muscle: "Why you're losing muscle",
  no_data: "Your verdict is still gathering",
};

function Spark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

function Factor({ label, pct, value, amber }: { label: string; pct: number; value: string; amber?: boolean }) {
  return (
    <View style={styles.factor}>
      <Text style={styles.fk}>{label}</Text>
      <View style={styles.fbar}>
        <View style={[styles.fbarFill, amber && styles.fbarAmber, { width: `${Math.max(4, Math.min(100, pct))}%` }]} />
      </View>
      <Text style={styles.fv}>{value}</Text>
    </View>
  );
}

interface VerdictExplainerProps {
  visible: boolean;
  verdict: WeeklyVerdict;
  metrics: HomeMetrics;
  weeklyDelta: number;
  onClose: () => void;
  /** Opens the coach chat (seeded with verdict context) for a deeper "why". */
  onAskCoach?: () => void;
}

/**
 * "Why this verdict" sheet. Slides up over a frosted Home and explains the
 * verdict — the coach's explanation plus the factors that drove it (protein,
 * training, loss pace), all derived from the verdict + metrics. Bars turn amber
 * when a factor is short, so the breakdown reflects every state.
 */
export function VerdictExplainer({ visible, verdict, metrics, weeklyDelta, onClose, onAskCoach }: VerdictExplainerProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 280 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, visible]);

  if (!visible) return null;

  const hasInputs = Boolean(verdict.inputsUsed);
  const proteinPct = Math.round(metrics.protein.ratio * 100);
  const trainingPct = Math.round(metrics.training.ratio * 100);
  const pacePct = Math.min(100, Math.round((Math.abs(weeklyDelta) / 1.5) * 100));
  const explanation = verdict.explanation ?? verdict.message;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.dim} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [560, 0] }) }] }]}
      >
        <View style={styles.grab} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.coachmark}>
            <View style={styles.coachdot}>
              <Spark />
            </View>
            <Text style={styles.coachLabel}>LEANIENT COACH</Text>
          </View>

          <Text style={styles.h3}>{TITLE[verdict.status]}</Text>
          <Text style={styles.prose}>{explanation}</Text>

          {hasInputs ? (
            <>
              <Text style={styles.eyebrow}>WHAT DROVE IT</Text>
              <View style={styles.factors}>
                <Factor label="Protein adherence" pct={proteinPct} value={`${proteinPct}%`} amber={proteinPct < 80} />
                <Factor
                  label="Resistance training"
                  pct={trainingPct}
                  value={`${metrics.training.done} / ${metrics.training.target}`}
                  amber={metrics.training.done < metrics.training.target}
                />
                <Factor
                  label="Loss pace"
                  pct={pacePct}
                  value={`${Math.abs(weeklyDelta).toFixed(1)}/wk`}
                />
              </View>
            </>
          ) : null}

          {onAskCoach ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask your coach about this verdict"
              onPress={onAskCoach}
              style={({ pressed }) => [styles.ask, pressed && styles.askPressed]}
            >
              <View style={styles.askDot}>
                <Spark />
              </View>
              <View style={styles.askText}>
                <Text style={styles.askTitle}>Still have questions?</Text>
                <Text style={styles.askSub}>Ask your coach about this verdict</Text>
              </View>
              <Text style={styles.askChev}>›</Text>
            </Pressable>
          ) : null}

          <Text style={styles.disc}>
            Score by Leanient's verdict engine ({verdict.engineVersion}) — deterministic and reproducible. The
            coach writes the explanation on top.
          </Text>

          <Button label="Got it" onPress={onClose} style={styles.cta} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 60 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(12,16,11,0.35)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    maxHeight: "82%",
    shadowColor: "rgba(12,16,11,1)",
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 24,
    shadowOpacity: 0.18,
    elevation: 16,
  },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.faintest, alignSelf: "center", marginBottom: 14 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  h3: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.42, color: colors.ink, marginTop: 11 },
  prose: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: colors.inkSoft, marginTop: 8 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted, marginTop: 18, marginBottom: 4 },
  factors: {},
  factor: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  fk: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  fbar: { width: 78, height: 7, borderRadius: 4, backgroundColor: "#E9EAE4", overflow: "hidden" },
  fbarFill: { height: 7, borderRadius: 4, backgroundColor: colors.emerald },
  fbarAmber: { backgroundColor: colors.honey },
  fv: { width: 50, textAlign: "right", fontFamily: font.bold, fontSize: 13, color: colors.ink },
  disc: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: colors.faint, marginTop: 14 },
  ask: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: "rgba(47,184,122,0.08)", borderWidth: 1, borderColor: "rgba(47,184,122,0.22)" },
  askPressed: { opacity: 0.7 },
  askDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  askText: { flex: 1 },
  askTitle: { fontFamily: font.bold, fontSize: 14, color: colors.ink, letterSpacing: -0.15 },
  askSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  askChev: { fontFamily: font.semibold, fontSize: 18, color: colors.emeraldDeep },
  cta: { marginTop: 18 },
});

export default VerdictExplainer;
