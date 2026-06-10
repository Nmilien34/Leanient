import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { GoalPace, PatchUserProfileRequest } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { SegButton } from "../../components/ui/SegButton";
import { useLeanientData } from "../../context/LeanientDataContext";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const PACES: Array<{ value: GoalPace; label: string }> = [
  { value: "gentle", label: "Gentle" },
  { value: "steady", label: "Steady" },
  { value: "aggressive", label: "Aggressive" },
];

function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${ft}'${rest}"`;
}

interface StepperProps {
  label: string;
  display: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
}

function Stepper({ label, display, onDec, onInc, decDisabled, incDisabled }: StepperProps) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={decDisabled}
          onPress={onDec}
          style={[styles.stepBtn, decDisabled && styles.stepBtnOff]}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{display}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={incDisabled}
          onPress={onInc}
          style={[styles.stepBtn, incDisabled && styles.stepBtnOff]}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface TargetsScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Home · Adjust today's targets. Protein and calorie targets are computed
 * server-side (Mifflin-St Jeor) from the user's body inputs, current weight,
 * and pace, so this editor adjusts the inputs and lets the engine recompute:
 * goal pace, weekly sessions, age, and height. Saving patches the profile and
 * refreshes home data, which carries the recomputed targets back.
 */
export function TargetsScreen({ visible, onClose }: TargetsScreenProps) {
  const data = useLeanientData();
  const profile = data.profile;

  const [pace, setPace] = useState<GoalPace>("steady");
  const [sessions, setSessions] = useState(3);
  const [age, setAge] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the editor from the profile each time it opens.
  useEffect(() => {
    if (!visible || !profile) return;
    setPace(profile.goalPace);
    setSessions(profile.weeklyWorkoutTarget);
    setAge(profile.ageYears ?? null);
    setHeight(profile.heightInches != null ? Math.round(profile.heightInches) : null);
    setError(null);
  }, [visible, profile]);

  if (!visible) return null;

  if (!profile) {
    return (
      <View style={[styles.root, styles.center]}>
        <ScreenGround />
        <ActivityIndicator color={colors.emerald} />
      </View>
    );
  }

  const dirty =
    pace !== profile.goalPace ||
    sessions !== profile.weeklyWorkoutTarget ||
    (age != null && age !== profile.ageYears) ||
    (height != null && height !== Math.round(profile.heightInches ?? -1));

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    const patch: PatchUserProfileRequest = {};
    if (pace !== profile.goalPace) patch.goalPace = pace;
    if (sessions !== profile.weeklyWorkoutTarget) patch.weeklyWorkoutTarget = sessions;
    if (age != null && age !== profile.ageYears) patch.ageYears = age;
    if (height != null && height !== Math.round(profile.heightInches ?? -1)) {
      patch.heightInches = height;
    }
    try {
      await apiService.patchProfile(patch);
      await data.refreshHomeData();
      onClose();
    } catch (e) {
      setError(extractApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.head}>
          <Pressable accessibilityLabel="Back" onPress={onClose} style={styles.backBtn}>
            <Svg width={10} height={17} viewBox="0 0 10 17" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M8.5 1.5L1.5 8.5l7 7" />
            </Svg>
          </Pressable>
          <Text style={styles.headTitle}>Today's targets</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* current computed targets */}
          <View style={styles.targetsCard}>
            <Text style={styles.eyebrow}>COMPUTED FOR YOU</Text>
            <View style={styles.targetsRow}>
              <View style={styles.target}>
                <Text style={styles.targetValue}>{profile.dailyProteinTarget}g</Text>
                <Text style={styles.targetLabel}>Protein / day</Text>
              </View>
              <View style={styles.target}>
                <Text style={styles.targetValue}>{profile.dailyCalorieTarget}</Text>
                <Text style={styles.targetLabel}>Calories / day</Text>
              </View>
              <View style={styles.target}>
                <Text style={styles.targetValue}>{profile.weeklyWorkoutTarget}</Text>
                <Text style={styles.targetLabel}>Sessions / wk</Text>
              </View>
            </View>
            <Text style={styles.targetsNote}>
              Protein and calories are computed from your sex, age, height, current weight, and
              pace. Adjust the inputs below and the targets follow.
            </Text>
          </View>

          <Text style={styles.glabel}>PACE</Text>
          <View style={styles.paceRow}>
            {PACES.map((p) => (
              <SegButton
                key={p.value}
                label={p.label}
                selected={pace === p.value}
                onPress={() => setPace(p.value)}
                style={styles.paceBtn}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            Gentle keeps the deficit small. Aggressive loses faster and the verdict scores muscle
            protection tighter.
          </Text>

          <Text style={styles.glabel}>INPUTS</Text>
          <View style={styles.card}>
            <Stepper
              label="Weekly sessions"
              display={String(sessions)}
              onDec={() => setSessions((v) => Math.max(1, v - 1))}
              onInc={() => setSessions((v) => Math.min(7, v + 1))}
              decDisabled={sessions <= 1}
              incDisabled={sessions >= 7}
            />
            {age != null ? (
              <Stepper
                label="Age"
                display={String(age)}
                onDec={() => setAge((v) => Math.max(18, (v ?? 30) - 1))}
                onInc={() => setAge((v) => Math.min(90, (v ?? 30) + 1))}
                decDisabled={age <= 18}
                incDisabled={age >= 90}
              />
            ) : null}
            {height != null ? (
              <Stepper
                label="Height"
                display={formatHeight(height)}
                onDec={() => setHeight((v) => Math.max(48, (v ?? 66) - 1))}
                onInc={() => setHeight((v) => Math.min(84, (v ?? 66) + 1))}
                decDisabled={height <= 48}
                incDisabled={height >= 84}
              />
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save targets"
            disabled={!dirty || saving}
            onPress={() => void save()}
            style={[styles.saveWrap, (!dirty || saving) && styles.saveOff]}
          >
            <LinearGradient
              colors={["#4ECF8B", "#2DB87A", "#1F9E63"]}
              locations={[0, 0.56, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.saveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#F4FBF7" />
              ) : (
                <Text style={styles.saveText}>Save and recompute</Text>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 70 },
  center: { alignItems: "center", justifyContent: "center" },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },

  targetsCard: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16 },
  eyebrow: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.99, color: colors.muted },
  targetsRow: { flexDirection: "row", marginTop: 12 },
  target: { flex: 1, alignItems: "center" },
  targetValue: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.42, color: colors.ink },
  targetLabel: { fontFamily: font.semibold, fontSize: 11.5, color: colors.muted, marginTop: 3 },
  targetsNote: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 12 },

  glabel: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  paceRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
  paceBtn: { flex: 1 },
  hint: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, paddingHorizontal: 20, paddingTop: 10 },

  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  stepLabel: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  stepControls: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.sageFill },
  stepBtnOff: { opacity: 0.4 },
  stepBtnText: { fontFamily: font.bold, fontSize: 17, color: colors.emeraldDeep, marginTop: -1 },
  stepValue: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink, minWidth: 44, textAlign: "center" },

  error: { fontFamily: font.medium, fontSize: 13, color: colors.amberDeep, paddingHorizontal: 20, paddingTop: 12 },
  saveWrap: { marginHorizontal: 20, marginTop: 18 },
  saveOff: { opacity: 0.5 },
  saveBtn: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: font.semibold, fontSize: 15, color: "#F4FBF7" },
});

export default TargetsScreen;
