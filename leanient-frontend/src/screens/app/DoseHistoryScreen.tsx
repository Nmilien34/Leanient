import React, { useRef } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import type { DoseLog } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { EmptyState } from "../../components/app/EmptyState";
import { siteLabel } from "./doseLogForm";
import { formatDoseAmount, formatDoseRelative, sortRecentDoses } from "./doseHistory";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface DoseHistoryScreenProps {
  visible: boolean;
  doses: DoseLog[];
  onClose: () => void;
  onSelectDose: (dose: DoseLog) => void;
}

/** Full, scrollable list of every logged dose. Each row opens its detail. */
export function DoseHistoryScreen({ visible, doses, onClose, onSelectDose }: DoseHistoryScreenProps) {
  const now = useRef(new Date()).current;
  const sorted = sortRecentDoses(doses);

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
            <Text style={styles.headTitle}>Dose history</Text>
            <View style={styles.headSpacer} />
          </View>

          {sorted.length === 0 ? (
            <EmptyState message="No doses logged yet." />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                {sorted.map((dose) => (
                  <Pressable
                    key={dose.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Dose ${formatDoseRelative(dose.recordedAt, now)}`}
                    onPress={() => onSelectDose(dose)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowDate}>{formatDoseRelative(dose.recordedAt, now)}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {dose.injectionSite ? `${siteLabel(dose.injectionSite)} · ` : ""}
                        {formatDoseAmount(dose)}
                      </Text>
                    </View>
                    <Text style={styles.chev}>›</Text>
                  </Pressable>
                ))}
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
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.line },
  rowPressed: { opacity: 0.6 },
  rowText: { flexShrink: 1 },
  rowDate: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowMeta: { fontFamily: font.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  chev: { fontFamily: font.semibold, fontSize: 20, color: colors.faint },
});

export default DoseHistoryScreen;
