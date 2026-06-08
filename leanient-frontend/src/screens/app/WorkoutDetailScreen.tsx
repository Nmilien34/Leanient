import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { Workout, WorkoutLog } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { ExerciseIcon } from "../../components/app/ExerciseIcon";
import {
  effortLabel,
  exerciseSetsLine,
  formatWorkoutFull,
  workoutSummaryLine,
  workoutTitle,
} from "./workoutHistory";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface WorkoutDetailScreenProps {
  visible: boolean;
  log: WorkoutLog | null;
  workouts: Workout[];
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** Read-only detail for a single logged workout. */
export function WorkoutDetailScreen({ visible, log, workouts, onClose }: WorkoutDetailScreenProps) {
  const title = log ? workoutTitle(log, workouts) : "";
  const effort = log ? effortLabel(log.perceivedEffort) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <ModalSafeArea style={styles.safe}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Back" onPress={onClose} style={styles.backBtn}>
              <Svg width={10} height={17} viewBox="0 0 10 17" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M8.5 1.5L1.5 8.5l7 7" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Workout details</Text>
            <View style={styles.headSpacer} />
          </View>

          {log ? (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                <LinearGradient colors={["#6FE0A6", "#1F9E63"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.heroIcon}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
                    <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
                  </Svg>
                </LinearGradient>
                <Text style={styles.heroTitle}>{title}</Text>
                <Text style={styles.heroSub}>{workoutSummaryLine(log)}</Text>
              </View>

              <View style={styles.card}>
                <Row label="Logged" value={formatWorkoutFull(log.recordedAt)} />
                <Row label="Duration" value={`${log.durationMinutes} min`} />
                {effort ? <Row label="Effort" value={effort} /> : null}
                <Row label="Counts as resistance" value={log.countsAsResistance ? "Yes" : "No"} />
                {log.notes ? <Row label="Notes" value={log.notes} /> : null}
              </View>

              {log.exercises.length > 0 ? (
                <>
                  <Text style={styles.glabel}>EXERCISES</Text>
                  <View style={styles.card}>
                    {log.exercises.map((ex, i) => (
                      <View key={`${ex.name}-${i}`} style={styles.exRow}>
                        <View style={styles.exIcon}>
                          <ExerciseIcon name={ex.name} muscleGroups={ex.muscleGroups} size={20} color={colors.emeraldDeep} />
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.exName}>{ex.name}</Text>
                          {exerciseSetsLine(ex) ? <Text style={styles.exSets}>{exerciseSetsLine(ex)}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
          ) : null}
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hero: { alignItems: "center", paddingTop: 12, paddingBottom: 18, gap: 4 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: font.extrabold, fontSize: 22, letterSpacing: -0.44, color: colors.ink, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
  heroSub: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 6 },
  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 16, borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  rowValue: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: "right" },
  exRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.line },
  exIcon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  flex: { flex: 1 },
  exName: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  exSets: { fontFamily: font.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
});

export default WorkoutDetailScreen;
