import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { VerdictCard } from "../../components/app/VerdictCard";
import type { CheckinHistoryItem } from "../../services/api.service";
import { checkinWeekLabel, formatWeight } from "./checkinHistory";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface CheckinDetailScreenProps {
  visible: boolean;
  item: CheckinHistoryItem | null;
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

/** Read-only detail for one past weekly check-in + the verdict it produced. */
export function CheckinDetailScreen({ visible, item, onClose }: CheckinDetailScreenProps) {
  const checkin = item?.checkin;

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
            <Text style={styles.headTitle}>Check-in</Text>
            <View style={styles.headSpacer} />
          </View>

          {checkin ? (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.eyebrow}>{checkinWeekLabel(checkin.weekOf)}</Text>

              {item?.verdict ? (
                <View style={styles.cardWrap}>
                  <VerdictCard verdict={item.verdict} />
                </View>
              ) : null}

              <Text style={styles.glabel}>WHAT YOU LOGGED</Text>
              <View style={styles.card}>
                <Row label="Weight" value={formatWeight(checkin.weight)} />
                <Row label="Avg protein" value={`${checkin.proteinGramsPerDay} g/day`} />
                <Row label="Resistance workouts" value={`${checkin.resistanceWorkoutsCompleted}`} />
                <Row
                  label="Side effects"
                  value={checkin.sideEffects.length ? checkin.sideEffects.join(", ") : "None"}
                />
                {checkin.notes ? <Row label="Notes" value={checkin.notes} /> : null}
              </View>
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
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.muted, textAlign: "center", paddingTop: 8, paddingBottom: 14 },
  cardWrap: { paddingHorizontal: 20, marginBottom: 8 },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6 },
  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 16, borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  rowValue: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: "right" },
});

export default CheckinDetailScreen;
