import React, { useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { Switch } from "../../components/ui/Switch";
import { useLeanientData } from "../../context/LeanientDataContext";
import {
  DURATION_OPTIONS,
  EFFORT_OPTIONS,
  WORKOUT_TYPES,
  buildRecentWorkoutPicks,
  buildWorkoutLogDraft,
  defaultCountsAsResistance,
  initialWorkoutLogForm,
  type WorkoutLogDraft,
  type WorkoutType,
} from "./workoutLogForm";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={[styles.chip, selected && styles.chipSel]}>
      <Text style={[styles.chipText, selected && styles.chipTextSel]}>{label}</Text>
    </Pressable>
  );
}

interface LogWorkoutScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: WorkoutLogDraft) => Promise<void>;
  onStartGuided?: () => void;
}

/**
 * Log · Workout (screen 35). Manual workout entry: type / duration / effort and
 * whether it counts as a resistance session (auto-set from the type, overridable
 * — it's the verdict's training signal). Saves a `WorkoutLog` draft.
 */
export function LogWorkoutScreen({ visible, onClose, onSave, onStartGuided }: LogWorkoutScreenProps) {
  const data = useLeanientData();
  const now = useRef(new Date()).current;
  const [form, setForm] = useState(initialWorkoutLogForm);

  const recent = useMemo(() => buildRecentWorkoutPicks(data.workoutHistory, now), [data.workoutHistory, now]);

  const selectType = (type: WorkoutType) =>
    setForm((f) => ({ ...f, type, countsAsResistance: defaultCountsAsResistance(type) }));

  const save = () => {
    void onSave?.(buildWorkoutLogDraft(form, new Date().toISOString()));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Log workout</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {recent.length > 0 ? (
              <>
                <Text style={styles.glabel}>RECENT · TAP TO FILL</Text>
                <View style={styles.recentList}>
                  {recent.map((p) => (
                    <Pressable
                      key={p.key}
                      accessibilityRole="button"
                      accessibilityLabel={`Re-log ${p.label}, ${p.detail}`}
                      onPress={() => setForm(p.form)}
                      style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
                    >
                      <View style={styles.recentIcon}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
                        </Svg>
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.recentLabel} numberOfLines={1}>{p.label}</Text>
                        <Text style={styles.recentDetail}>{p.detail}</Text>
                      </View>
                      <Text style={styles.recentWhen}>{p.when}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.glabel}>TYPE</Text>
            <View style={styles.chiprow}>
              {WORKOUT_TYPES.map((t) => (
                <Chip key={t.id} label={t.label} selected={form.type === t.id} onPress={() => selectType(t.id)} />
              ))}
            </View>

            <Text style={styles.glabel}>HOW LONG?</Text>
            <View style={styles.chiprow}>
              {DURATION_OPTIONS.map((min) => (
                <Chip key={min} label={`${min} min`} selected={form.durationMinutes === min} onPress={() => setForm((f) => ({ ...f, durationMinutes: min }))} />
              ))}
            </View>

            <Text style={styles.glabel}>EFFORT</Text>
            <View style={styles.seg}>
              {EFFORT_OPTIONS.map((e) => {
                const on = form.effort === e.id;
                return (
                  <Pressable key={e.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={e.label} onPress={() => setForm((f) => ({ ...f, effort: e.id }))} style={[styles.segItem, on && styles.segItemOn]}>
                    <Text style={[styles.segText, on && styles.segTextOn]}>{e.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round">
                    <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
                  </Svg>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.rowLabel}>Counts as a resistance session</Text>
                  <Text style={styles.rowSub}>This is what protects muscle on a GLP-1.</Text>
                </View>
                <Switch value={form.countsAsResistance} onValueChange={(v) => setForm((f) => ({ ...f, countsAsResistance: v }))} accessibilityLabel="Counts as a resistance session" />
              </View>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Save workout" onPress={save}>
              <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Save workout</Text>
              </LinearGradient>
            </Pressable>
            {onStartGuided ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Start a guided session instead" onPress={onStartGuided} style={styles.guided}>
                <Text style={styles.guidedText}>Start a guided session instead ›</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  chiprow: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingHorizontal: 20 },
  recentList: { marginHorizontal: 20, gap: 8 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13 },
  recentRowPressed: { opacity: 0.6 },
  recentIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  recentLabel: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  recentDetail: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  recentWhen: { fontFamily: font.medium, fontSize: 12, color: colors.faint },
  chip: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 15 },
  chipSel: { backgroundColor: "rgba(47,184,122,0.10)", borderColor: "rgba(47,184,122,0.45)" },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  chipTextSel: { color: colors.emeraldDeep },
  seg: { flexDirection: "row", marginHorizontal: 20, backgroundColor: "#EBECE6", borderRadius: 14, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 11 },
  segItemOn: { backgroundColor: "#fff", shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, shadowOpacity: 0.18, elevation: 2 },
  segText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  segTextOn: { color: colors.ink },
  group: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14, paddingHorizontal: 15 },
  icon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  flex: { flex: 1 },
  rowLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  cta: { marginHorizontal: 20, marginTop: 22, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
  guided: { alignItems: "center", paddingVertical: 16 },
  guidedText: { fontFamily: font.bold, fontSize: 14, color: colors.emeraldDeep },
});

export default LogWorkoutScreen;
