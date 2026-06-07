import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { Workout, WorkoutCategory } from "@leanient/shared";
import { deriveWorkoutDetail } from "../../screens/app/workoutDetailMetrics";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { UserAvatar } from "./UserAvatar";

const THUMB: Record<WorkoutCategory, readonly [string, string]> = {
  strength: ["#6FE0A6", "#23A869"],
  conditioning: ["#9AC8E0", "#5E93B6"],
  mobility: ["#F0C079", "#D08E45"],
  recovery: ["#C9D6BE", "#8AA07E"],
};

function DumbbellIcon({ color = "#fff" }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
    </Svg>
  );
}

function Spark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

interface WorkoutDetailSheetProps {
  visible: boolean;
  workout: Workout | null;
  onClose: () => void;
  onStartWorkout: (workout: Workout) => void;
}

export function WorkoutDetailSheet({
  visible,
  workout,
  onClose,
  onStartWorkout,
}: WorkoutDetailSheetProps) {
  const detail = useMemo(() => (workout ? deriveWorkoutDetail(workout) : null), [workout]);

  return (
    <Modal visible={visible && Boolean(workout && detail)} animationType="slide" onRequestClose={onClose} transparent={false}>
      {workout && detail ? (
        <View style={styles.root}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <View style={styles.head}>
              <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                  <Path d="M6 6l12 12M18 6L6 18" />
                </Svg>
              </Pressable>
              <Text style={styles.headTitle}>Workout</Text>
              <UserAvatar size={34} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                <LinearGradient colors={THUMB[workout.category]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.heroIcon}>
                  <DumbbellIcon />
                </LinearGradient>
                <View style={styles.heroText}>
                  <Text style={styles.eyebrow}>{detail.eyebrow}</Text>
                  <Text style={styles.h1}>{detail.title}</Text>
                  <Text style={styles.sub}>{detail.subtitle}</Text>
                </View>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.meta}>{detail.meta}</Text>
                {detail.tags.length ? (
                  <View style={styles.tags}>
                    {detail.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.coachCard}>
                <View style={styles.coachmark}>
                  <View style={styles.coachdot}>
                    <Spark />
                  </View>
                  <Text style={styles.coachLabel}>LEANIENT COACH</Text>
                </View>
                <Text style={styles.coachText}>{detail.coachLine}</Text>
              </LinearGradient>

              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Exercises</Text>
                  <Text style={styles.sectionMeta}>{detail.exercises.length}</Text>
                </View>
                {detail.exercises.length ? (
                  <View style={styles.exerciseList}>
                    {detail.exercises.map((exercise, index) => (
                      <View key={`${exercise.name}-${index}`} style={styles.exerciseRow}>
                        <View style={styles.exerciseIndex}>
                          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                        </View>
                        <View style={styles.exerciseBody}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseDetail}>{exercise.detail}</Text>
                          {exercise.note ? <Text style={styles.exerciseNote}>{exercise.note}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptySteps}>
                    <DumbbellIcon color={colors.faint} />
                    <Text style={styles.emptyTitle}>Guided steps are being prepared.</Text>
                    <Text style={styles.emptyCopy}>You can still use this card to understand the session focus.</Text>
                  </View>
                )}
              </View>

              {detail.safetyNotes.length ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Before you start</Text>
                  {detail.safetyNotes.map((note) => (
                    <Text key={note} style={styles.safety}>- {note}</Text>
                  ))}
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={detail.startLabel}
                accessibilityState={{ disabled: !detail.canStart }}
                disabled={!detail.canStart}
                onPress={() => onStartWorkout(workout)}
              >
                <LinearGradient
                  colors={detail.canStart ? ["#4ECF8B", "#2DB87A", "#1F9E63"] : ["#C9D6BE", "#AABAA1"]}
                  locations={[0, 0.56, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cta}
                >
                  <Text style={styles.ctaText}>{detail.startLabel}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Close workout detail" onPress={onClose} style={styles.dismiss}>
                <Text style={styles.dismissText}>Close</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hero: { flexDirection: "row", gap: 14, alignItems: "center", paddingTop: 12 },
  heroIcon: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroText: { flex: 1 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.84, color: colors.emeraldDeep },
  h1: { fontFamily: font.extrabold, fontSize: 26, color: colors.ink, marginTop: 5 },
  sub: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 18, color: colors.muted, marginTop: 5 },
  metaCard: { marginTop: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  meta: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: { backgroundColor: "rgba(47,184,122,0.10)", borderRadius: 9, paddingVertical: 5, paddingHorizontal: 10 },
  tagText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.emeraldDeep },
  coachCard: { marginTop: 14, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  section: { marginTop: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  sectionMeta: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  exerciseList: { gap: 14, marginTop: 14 },
  exerciseRow: { flexDirection: "row", gap: 12 },
  exerciseIndex: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  exerciseIndexText: { fontFamily: font.bold, fontSize: 12, color: colors.emeraldDeep },
  exerciseBody: { flex: 1 },
  exerciseName: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink },
  exerciseDetail: { fontFamily: font.semibold, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  exerciseNote: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 4 },
  emptySteps: { alignItems: "center", paddingVertical: 16 },
  emptyTitle: { fontFamily: font.bold, fontSize: 14, color: colors.ink, marginTop: 8 },
  emptyCopy: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 4, textAlign: "center" },
  safety: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 8 },
  cta: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 18 },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7" },
  dismiss: { alignItems: "center", paddingVertical: 14 },
  dismissText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
});

export default WorkoutDetailSheet;
