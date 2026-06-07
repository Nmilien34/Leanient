import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { DoseLog } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { siteLabel } from "./doseLogForm";
import { formatDoseAmount, formatDoseFull } from "./doseHistory";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface DoseDetailScreenProps {
  visible: boolean;
  dose: DoseLog | null;
  medicationName?: string;
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

/** Read-only detail for a single logged dose. */
export function DoseDetailScreen({ visible, dose, medicationName, onClose }: DoseDetailScreenProps) {
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
            <Text style={styles.headTitle}>Dose details</Text>
            <View style={styles.headSpacer} />
          </View>

          {dose ? (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                <LinearGradient colors={["#6FE0A6", "#1F9E63"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.heroIcon}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" />
                  </Svg>
                </LinearGradient>
                <Text style={styles.heroTitle}>{medicationName ?? "Dose"}</Text>
                <Text style={styles.heroAmount}>{formatDoseAmount(dose)}</Text>
              </View>

              <View style={styles.card}>
                <Row label="Logged" value={formatDoseFull(dose.recordedAt)} />
                <Row label="Dose" value={formatDoseAmount(dose)} />
                <Row
                  label="Injection site"
                  value={dose.injectionSite ? siteLabel(dose.injectionSite) : "Not recorded"}
                />
                {medicationName ? <Row label="Medication" value={medicationName} /> : null}
                {dose.notes ? <Row label="Notes" value={dose.notes} /> : null}
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
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hero: { alignItems: "center", paddingTop: 12, paddingBottom: 20, gap: 6 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: font.extrabold, fontSize: 22, letterSpacing: -0.44, color: colors.ink, marginTop: 6 },
  heroAmount: { fontFamily: font.semibold, fontSize: 15, color: colors.emeraldDeep },
  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 16, borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  rowValue: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: "right" },
});

export default DoseDetailScreen;
