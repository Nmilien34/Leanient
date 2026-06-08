import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import type { Workout, WorkoutLog } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { EmptyState } from "../../components/app/EmptyState";
import { ErrorState } from "../../components/app/ErrorState";
import { ExerciseIcon } from "../../components/app/ExerciseIcon";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { formatWorkoutDay, sortRecentWorkouts, workoutSummaryLine, workoutTitle } from "./workoutHistory";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

// Pull the full history (the backend caps the limit); recent-first.
const HISTORY_FROM = "2020-01-01T00:00:00.000Z";

interface WorkoutHistoryScreenProps {
  visible: boolean;
  workouts: Workout[];
  onClose: () => void;
  onSelectLog: (log: WorkoutLog) => void;
}

/** Full, scrollable list of every logged workout. Each row opens its detail. */
export function WorkoutHistoryScreen({ visible, workouts, onClose, onSelectLog }: WorkoutHistoryScreenProps) {
  const now = useRef(new Date()).current;
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getWorkoutLogs({ from: HISTORY_FROM, limit: 200 });
      setLogs(sortRecentWorkouts(result));
    } catch (e) {
      setError(extractApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

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
            <Text style={styles.headTitle}>Workout history</Text>
            <View style={styles.headSpacer} />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.emerald} />
            </View>
          ) : error ? (
            <ErrorState onRetry={() => void load()} />
          ) : logs.length === 0 ? (
            <EmptyState
              title="No workouts yet"
              message="Finish a workout and it'll show up here."
            />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                {logs.map((log) => {
                  const lead = log.exercises[0];
                  return (
                    <Pressable
                      key={log.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Workout ${formatWorkoutDay(log.recordedAt, now)}`}
                      onPress={() => onSelectLog(log)}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={styles.rowIcon}>
                        <ExerciseIcon
                          name={lead?.name ?? ""}
                          muscleGroups={lead?.muscleGroups ?? []}
                          size={20}
                          color={colors.emeraldDeep}
                        />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{workoutTitle(log, workouts)}</Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {formatWorkoutDay(log.recordedAt, now)} · {workoutSummaryLine(log)}
                        </Text>
                      </View>
                      <Text style={styles.chev}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28, paddingTop: 4 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.line },
  rowPressed: { opacity: 0.6 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowMeta: { fontFamily: font.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  chev: { fontFamily: font.semibold, fontSize: 20, color: colors.faint },
});

export default WorkoutHistoryScreen;
