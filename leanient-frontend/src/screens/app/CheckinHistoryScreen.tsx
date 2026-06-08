import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { EmptyState } from "../../components/app/EmptyState";
import { ErrorState } from "../../components/app/ErrorState";
import apiService, { type CheckinHistoryItem } from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { VERDICT_STATUS_COLOR, VERDICT_STATUS_TEXT, checkinWeekLabel, formatWeight } from "./checkinHistory";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface CheckinHistoryScreenProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: CheckinHistoryItem) => void;
}

/** Full list of past weekly check-ins. Each row opens its detail + verdict. */
export function CheckinHistoryScreen({ visible, onClose, onSelect }: CheckinHistoryScreenProps) {
  const [items, setItems] = useState<CheckinHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiService.getCheckinHistory());
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
            <Text style={styles.headTitle}>Weekly check-ins</Text>
            <View style={styles.headSpacer} />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.emerald} />
            </View>
          ) : error ? (
            <ErrorState onRetry={() => void load()} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No check-ins yet"
              message="Your weekly check-ins will collect here once you complete one."
            />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                {items.map((item) => {
                  const status = item.verdict?.status ?? "no_data";
                  return (
                    <Pressable
                      key={item.checkin.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Check-in ${checkinWeekLabel(item.checkin.weekOf)}`}
                      onPress={() => onSelect(item)}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle}>{checkinWeekLabel(item.checkin.weekOf)}</Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {formatWeight(item.checkin.weight)} · {item.checkin.proteinGramsPerDay} g protein ·{" "}
                          {item.checkin.resistanceWorkoutsCompleted} workouts
                        </Text>
                      </View>
                      <Text style={[styles.badge, { color: VERDICT_STATUS_COLOR[status] }]}>
                        {VERDICT_STATUS_TEXT[status]}
                      </Text>
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
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowMeta: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  badge: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.2 },
  chev: { fontFamily: font.semibold, fontSize: 20, color: colors.faint },
});

export default CheckinHistoryScreen;
