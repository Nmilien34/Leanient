import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { WorkoutEffort } from "@leanient/shared";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { ModalSafeArea } from "../layout/ModalSafeArea";
import { MetricRing } from "./MetricRing";
import { EFFORT_OPTIONS } from "../../screens/app/workoutLogForm";
import type { WorkoutCompleteView } from "../../screens/app/workoutCompleteMetrics";

function Spark() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

export interface WorkoutFeel {
  effort: WorkoutEffort;
  note?: string;
}

interface WorkoutCompleteSheetProps {
  visible: boolean;
  view: WorkoutCompleteView;
  onClose: () => void;
  /** Saves the session. Carries the feel when the user logged one. */
  onBackHome: (feel?: WorkoutFeel) => void;
  isSaving?: boolean;
  errorMessage?: string | null;
}

/**
 * "Workout complete" (screen 21) — celebrates the finished session and shows
 * what it does to the week: exercises, actual time, sessions/week, and the
 * verdict it's shaping. All values come from `WorkoutCompleteView`.
 *
 * "Log how it felt" expands an inline effort picker (+ optional note) instead
 * of opening another screen; whatever is selected rides along with Done.
 */
export function WorkoutCompleteSheet({
  visible,
  view,
  onClose,
  onBackHome,
  isSaving = false,
  errorMessage = null,
}: WorkoutCompleteSheetProps) {
  const [feelOpen, setFeelOpen] = useState(false);
  const [effort, setEffort] = useState<WorkoutEffort | null>(null);
  const [note, setNote] = useState("");

  // The sheet stays mounted between sessions; start each one with a clean slate.
  useEffect(() => {
    if (visible) {
      setFeelOpen(false);
      setEffort(null);
      setNote("");
    }
  }, [visible]);

  const confirm = () => {
    const trimmed = note.trim();
    onBackHome(effort ? { effort, note: trimmed.length > 0 ? trimmed : undefined } : undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <View style={styles.closeBtn} />
            <Text style={styles.headTitle}>Workout complete</Text>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <LinearGradient colors={["#6FE0A6", "#1F9E63"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.check}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M4 12.5l5 5 11-11" />
                </Svg>
              </LinearGradient>
              <Text style={styles.h1}>{view.headline}</Text>
              <Text style={styles.sub}>{view.subtitle}</Text>
            </View>

            <View style={styles.rings}>
              <MetricRing ratio={view.exercisesRatio} value={view.exercisesLabel} label="Exercises" />
              <MetricRing ratio={1} value={view.timeLabel} label="Time" />
              <MetricRing ratio={view.sessions.ratio} value={view.sessions.label} label="Sessions / wk" />
            </View>

            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.coachText}>{view.coachLine}</Text>
            </LinearGradient>

            <View style={styles.focus}>
              <View style={styles.eyebrowRow}>
                <Text style={styles.eyebrow}>THIS WEEK · TRAINING</Text>
                <Text style={styles.eyebrowVal}>{view.weeklyTrainingLabel}</Text>
              </View>
              <View style={styles.bar}>
                <LinearGradient colors={["#2FB87A", "#1F9E63"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.barFill, { width: `${Math.max(3, Math.round(view.weeklyTrainingRatio * 100))}%` }]} />
              </View>
            </View>

            {feelOpen ? (
              <View style={styles.feel}>
                <Text style={styles.feelLabel}>HOW DID IT FEEL?</Text>
                <View style={styles.seg}>
                  {EFFORT_OPTIONS.map((e) => {
                    const on = effort === e.id;
                    return (
                      <Pressable
                        key={e.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={e.label}
                        onPress={() => setEffort(on ? null : e.id)}
                        style={[styles.segItem, on && styles.segItemOn]}
                      >
                        <Text style={[styles.segText, on && styles.segTextOn]}>{e.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Anything to remember? (optional)"
                  placeholderTextColor={colors.faint}
                  style={styles.noteInput}
                  maxLength={500}
                  multiline
                  accessibilityLabel="Workout note"
                />
              </View>
            ) : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              accessibilityState={{ disabled: isSaving }}
              disabled={isSaving}
              onPress={confirm}
            >
              <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                {isSaving ? <ActivityIndicator color="#F4FBF7" /> : <Text style={styles.ctaText}>Done</Text>}
              </LinearGradient>
            </Pressable>
            {feelOpen ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log how it felt"
                disabled={isSaving}
                onPress={() => setFeelOpen(true)}
                style={styles.dismiss}
              >
                <Text style={styles.dismissText}>Log how it felt</Text>
              </Pressable>
            )}
          </ScrollView>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hero: { alignItems: "center", paddingTop: 18 },
  check: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", shadowColor: "rgba(31,158,99,1)", shadowOffset: { width: 0, height: 18 }, shadowRadius: 36, shadowOpacity: 0.45, elevation: 8 },
  h1: { fontFamily: font.extrabold, fontSize: 26, letterSpacing: -0.78, color: colors.ink, marginTop: 18, textAlign: "center" },
  sub: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, marginTop: 8, textAlign: "center" },
  rings: { flexDirection: "row", gap: 10, paddingTop: 20 },
  aicard: { marginTop: 18, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  focus: { marginTop: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.84, color: colors.muted },
  eyebrowVal: { fontFamily: font.bold, fontSize: 12, color: colors.emeraldDeep },
  bar: { height: 10, borderRadius: 5, backgroundColor: "rgba(222,231,212,0.9)", marginTop: 13, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  feel: { marginTop: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  feelLabel: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.84, color: colors.muted },
  seg: { flexDirection: "row", backgroundColor: "#EBECE6", borderRadius: 14, padding: 4, gap: 4, marginTop: 12 },
  segItem: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 11 },
  segItemOn: { backgroundColor: "#fff", shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, shadowOpacity: 0.18, elevation: 2 },
  segText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  segTextOn: { color: colors.ink },
  noteInput: { marginTop: 12, minHeight: 44, maxHeight: 96, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, fontFamily: font.regular, fontSize: 14, color: colors.ink, backgroundColor: colors.paper, textAlignVertical: "top" },
  errorText: { fontFamily: font.semibold, fontSize: 13, color: "#A94B4B", marginTop: 16, textAlign: "center" },
  cta: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 18 },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
  dismiss: { alignItems: "center", paddingVertical: 14 },
  dismissText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
});

export default WorkoutCompleteSheet;
