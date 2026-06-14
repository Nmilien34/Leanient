import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { GettingStartedKey, GettingStartedView } from "../../screens/app/gettingStarted";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface GettingStartedCardProps {
  view: GettingStartedView;
  onStep: (key: GettingStartedKey) => void;
}

function Check() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-11" />
    </Svg>
  );
}

/**
 * First-run guide shown in place of the muscle-retention score for new users.
 * Explains why there's no score yet and turns the empty state into a short,
 * tappable checklist that produces the data the engine needs.
 */
export function GettingStartedCard({ view, onStep }: GettingStartedCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>GETTING STARTED · {view.doneCount} / {view.totalCount}</Text>
        <Text style={styles.headline}>{view.headline}</Text>
        <Text style={styles.why}>{view.why}</Text>
      </View>

      <View style={styles.steps}>
        {view.steps.map((step) => (
          <Pressable
            key={step.key}
            accessibilityRole="button"
            accessibilityState={{ checked: step.done }}
            accessibilityLabel={step.label}
            disabled={step.done}
            onPress={() => onStep(step.key)}
            style={({ pressed }) => [styles.step, pressed && !step.done ? styles.stepPressed : null]}
          >
            <View style={[styles.box, step.done ? styles.boxDone : null]}>{step.done ? <Check /> : null}</View>
            <View style={styles.flex}>
              <Text style={[styles.label, step.done ? styles.labelDone : null]}>{step.label}</Text>
              <Text style={styles.hint}>{step.hint}</Text>
            </View>
            {step.done ? null : <Text style={styles.chev}>›</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  flex: { flex: 1 },
  head: { marginBottom: 6 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.emeraldDeep },
  headline: { fontFamily: font.extrabold, fontSize: 19, letterSpacing: -0.4, color: colors.ink, marginTop: 6 },
  why: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 7 },
  steps: { marginTop: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  stepPressed: { opacity: 0.6 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: colors.faintest, alignItems: "center", justifyContent: "center" },
  boxDone: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  label: { fontFamily: font.bold, fontSize: 15, letterSpacing: -0.15, color: colors.ink },
  labelDone: { color: colors.faint, textDecorationLine: "line-through" },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  chev: { fontFamily: font.semibold, fontSize: 19, color: colors.faint },
});

export default GettingStartedCard;
