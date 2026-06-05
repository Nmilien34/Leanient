import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import type { SideEffectSymptom, WeeklyVerdict } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { Button } from "../../components/ui/Button";
import { CoachPill } from "../../components/ui/CoachPill";
import { useLeanientData } from "../../context/LeanientDataContext";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { SYMPTOMS } from "./sideEffectLogForm";
import { buildCheckinRequest, deriveCheckinPrefill, weekRange, type CheckinPrefill } from "./weeklyCheckin";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekLabel(now: Date): string {
  const { from } = weekRange(now);
  const start = new Date(from);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `WEEK OF ${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()} – ${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
}

function Stepper({ onDec, onInc, disabled }: { onDec: () => void; onInc: () => void; disabled?: boolean }) {
  const btn = (label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "−" ? "Decrease" : "Increase"}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
    >
      <Text style={styles.stepBtnText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn("−", onDec)}
      {btn("+", onInc)}
    </View>
  );
}

function CheckMark() {
  return (
    <Svg width={16} height={12} viewBox="0 0 12 9" fill="none">
      <Path d="M1 4.5L4.2 7.5L11 1" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Emerald-tint read-only row: a value derived from this week's logs. */
function DerivedRow({ value, note }: { value: string; note: string }) {
  return (
    <View style={styles.derived}>
      <View style={styles.derivedIcon}>
        <CheckMark />
      </View>
      <View style={styles.flex}>
        <Text style={styles.derivedValue}>{value}</Text>
        <Text style={styles.derivedNote}>{note}</Text>
      </View>
    </View>
  );
}

interface WeeklyCheckinScreenProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (verdict: WeeklyVerdict) => void;
}

/**
 * Weekly check-in (single scrolling form). Protein + resistance are pre-filled
 * from this week's logs when present (read-only confirm, since the backend uses
 * logs for the verdict); otherwise they fall back to editable steppers. On submit
 * the backend returns the freshly generated verdict, handed to `onComplete`.
 */
export function WeeklyCheckinScreen({ visible, onClose, onComplete }: WeeklyCheckinScreenProps) {
  const data = useLeanientData();
  const now = useRef(new Date()).current;

  const [prefill, setPrefill] = useState<CheckinPrefill | null>(null);
  const [weight, setWeight] = useState(0);
  const [protein, setProtein] = useState(0);
  const [resistance, setResistance] = useState(0);
  const [sideEffects, setSideEffects] = useState<Set<SideEffectSymptom>>(new Set());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load this week's logs and derive the pre-fill each time the sheet opens.
  useEffect(() => {
    if (!visible) {
      setPrefill(null);
      setError(null);
      setSubmitting(false);
      setSideEffects(new Set());
      setNotes("");
      return;
    }
    let cancelled = false;
    const fallbackUnit = data.profile?.goalWeightUnit ?? "lb";
    const fallbackProtein = data.profile?.dailyProteinTarget ?? 120;
    const { from, to } = weekRange(now);

    void Promise.all([
      apiService.getMealLogs({ from, to }).catch(() => []),
      apiService.getWorkoutLogs({ from, to }).catch(() => []),
    ]).then(([weekMeals, weekWorkouts]) => {
      if (cancelled) return;
      const p = deriveCheckinPrefill({
        weightLogs: data.weightLogs,
        weekMeals,
        weekWorkouts,
        fallbackUnit,
        fallbackProtein,
      });
      setPrefill(p);
      setWeight(p.weightValue ?? data.profile?.goalWeight ?? 0);
      setProtein(p.proteinGramsPerDay);
      setResistance(p.resistanceWorkoutsCompleted);
    });

    return () => {
      cancelled = true;
    };
  }, [visible, now, data.profile?.goalWeightUnit, data.profile?.dailyProteinTarget, data.profile?.goalWeight, data.weightLogs]);

  if (!visible) return null;

  const unit = prefill?.weightUnit ?? data.profile?.goalWeightUnit ?? "lb";
  const weightStep = unit === "kg" ? 0.1 : 0.2;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const toggleSymptom = (id: SideEffectSymptom) =>
    setSideEffects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canSubmit = !submitting && prefill !== null && weight > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const verdict = await apiService.submitWeeklyCheckin(
        buildCheckinRequest({
          now,
          weight: { value: round1(weight), unit },
          proteinGramsPerDay: Math.round(protein),
          resistanceWorkoutsCompleted: resistance,
          sideEffects: [...sideEffects],
          notes,
        }),
      );
      await data.refreshHomeData();
      onComplete(verdict);
    } catch (e) {
      setError(extractApiError(e).message);
      setSubmitting(false);
    }
  };

  const header = (
    <View style={styles.head}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} disabled={submitting} style={styles.closeBtn}>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      </Pressable>
      <Text style={styles.headTitle}>Weekly check-in</Text>
      <View style={styles.closeBtn} />
    </View>
  );

  if (!prefill) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          {header}
          <View style={styles.center}>
            <ActivityIndicator color={colors.emerald} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {header}
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>{weekLabel(now)}</Text>
          <Text style={styles.h1}>How was this week?</Text>
          <Text style={styles.sub}>A calm, honest look at the week. About two minutes.</Text>

          {/* Weight */}
          <Text style={styles.glabel}>THIS WEEK'S WEIGHT</Text>
          <View style={styles.weightRow}>
            <Text style={styles.bignum}>
              {round1(weight)}
              <Text style={styles.bigunit}> {unit}</Text>
            </Text>
            <Stepper onDec={() => setWeight((w) => round1(Math.max(0, w - weightStep)))} onInc={() => setWeight((w) => round1(w + weightStep))} />
          </View>
          <Text style={styles.hint}>
            {prefill.weightValue != null ? "Pre-filled from your last weigh-in. Adjust if you weighed in today." : "Enter your current weight."}
          </Text>

          {/* Protein */}
          <Text style={styles.glabel}>PROTEIN</Text>
          {prefill.proteinFromLogs ? (
            <DerivedRow
              value={`${protein} g/day average`}
              note={`From your ${prefill.mealCount} ${prefill.mealCount === 1 ? "meal" : "meals"} logged this week. We'll use this for your verdict.`}
            />
          ) : (
            <View style={styles.entryRow}>
              <View style={styles.flex}>
                <Text style={styles.entryLabel}>Average protein per day</Text>
                <Text style={styles.entrySub}>You didn't log meals. Enter your best estimate.</Text>
              </View>
              <View style={styles.entryValueWrap}>
                <Text style={styles.entryValue}>{protein}</Text>
                <Text style={styles.entryUnit}>g</Text>
                <Stepper onDec={() => setProtein((p) => Math.max(0, p - 5))} onInc={() => setProtein((p) => Math.min(400, p + 5))} />
              </View>
            </View>
          )}

          {/* Resistance training */}
          <Text style={styles.glabel}>RESISTANCE TRAINING</Text>
          {prefill.workoutsFromLogs ? (
            <DerivedRow
              value={`${resistance} ${resistance === 1 ? "session" : "sessions"}`}
              note="From your workout logs this week. We'll use this for your verdict."
            />
          ) : (
            <View style={styles.entryRow}>
              <View style={styles.flex}>
                <Text style={styles.entryLabel}>Sessions this week</Text>
                <Text style={styles.entrySub}>You didn't log workouts. Enter what you did.</Text>
              </View>
              <View style={styles.entryValueWrap}>
                <Text style={styles.entryValue}>{resistance}</Text>
                <Stepper onDec={() => setResistance((r) => Math.max(0, r - 1))} onInc={() => setResistance((r) => Math.min(14, r + 1))} />
              </View>
            </View>
          )}

          {/* Side effects */}
          <Text style={styles.glabel}>ANY SIDE EFFECTS THIS WEEK?</Text>
          <View style={styles.chipRow}>
            {SYMPTOMS.map((s) => {
              const on = sideEffects.has(s.id);
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={s.label}
                  onPress={() => toggleSymptom(s.id)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Notes */}
          <Text style={styles.glabel}>ANYTHING ELSE?</Text>
          <TextInput
            style={styles.notes}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note about your week (optional)"
            placeholderTextColor={colors.faint}
            multiline
            maxLength={2000}
            accessibilityLabel="Notes"
          />

          <View style={styles.coachWrap}>
            <CoachPill>No wrong answers here. This is a checkpoint, not a test, so just tell us how the week actually went.</CoachPill>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Submit check-in" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} style={styles.cta} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 80 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 24, paddingBottom: 36 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.0, color: colors.muted, marginTop: 6 },
  h1: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7, color: colors.ink, marginTop: 8 },
  sub: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.15, color: colors.muted, marginTop: 6 },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, marginTop: 24, marginBottom: 10 },
  // weight
  weightRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bignum: { fontFamily: font.extrabold, fontSize: 46, letterSpacing: -1.2, color: colors.ink },
  bigunit: { fontFamily: font.semibold, fontSize: 20, color: colors.muted },
  hint: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 8 },
  // stepper
  stepper: { flexDirection: "row", gap: 10 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontFamily: font.bold, fontSize: 22, color: colors.ink, marginTop: -2 },
  pressed: { opacity: 0.6 },
  // derived (from logs) card
  derived: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 16, backgroundColor: "rgba(47,184,122,0.08)", borderWidth: 1, borderColor: "rgba(47,184,122,0.22)" },
  derivedIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  derivedValue: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: colors.emeraldDeep },
  derivedNote: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 2 },
  // manual entry row
  entryRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  entryLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  entrySub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 16, color: colors.muted, marginTop: 2 },
  entryValueWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  entryValue: { fontFamily: font.extrabold, fontSize: 22, color: colors.ink, minWidth: 24, textAlign: "right" },
  entryUnit: { fontFamily: font.semibold, fontSize: 14, color: colors.muted, marginRight: 2 },
  flex: { flex: 1 },
  // chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line },
  chipOn: { backgroundColor: "rgba(47,184,122,0.10)", borderColor: colors.emeraldDeep },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.emeraldDeep },
  // notes
  notes: { minHeight: 64, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 14, fontFamily: font.regular, fontSize: 14, color: colors.ink, textAlignVertical: "top" },
  coachWrap: { marginTop: 16 },
  error: { fontFamily: font.medium, fontSize: 13, color: "#C2554E", textAlign: "center", marginTop: 14 },
  cta: { marginTop: 18 },
});

export default WeeklyCheckinScreen;
