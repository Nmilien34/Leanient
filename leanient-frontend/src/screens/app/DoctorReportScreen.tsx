import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useAuth } from "../../context/AuthContext";
import { buildDoctorReport } from "./doctorReport";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface DoctorReportScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Doctor report (frame 02): the journey on one page for the
 * prescriber appointment, built from real logs, shared via the system sheet.
 */
export function DoctorReportScreen({ visible, onClose }: DoctorReportScreenProps) {
  const data = useLeanientData();
  const auth = useAuth();

  const report = useMemo(
    () =>
      buildDoctorReport({
        displayName: auth.user?.displayName,
        medicationName: data.medicationProtocol?.medicationName,
        doseAmount: data.medicationProtocol?.doseAmount ?? null,
        doseUnit: data.medicationProtocol?.doseUnit,
        weightLogs: data.weightLogs,
        doseLogs: data.doseHistory,
        snapshots: (data.progressOverview?.chart.snapshots ?? []).map((s) => ({
          weekOf: s.weekOf,
          retention: s.muscleRetentionScore,
        })),
        now: new Date(),
      }),
    [auth.user, data.medicationProtocol, data.weightLogs, data.doseHistory, data.progressOverview],
  );

  const share = () => {
    if (!report) return;
    void Share.share({ message: report.shareText });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Back" onPress={onClose} style={styles.backBtn}>
              <Svg width={10} height={17} viewBox="0 0 10 17" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M8.5 1.5L1.5 8.5l7 7" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Doctor report</Text>
            <View style={styles.backBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.lede}>
              Your journey on one page. Built from your logs, ready for your next appointment.
            </Text>

            {report ? (
              <>
                <View style={styles.doc}>
                  <View style={styles.docHead}>
                    <View style={styles.docHeadLeft}>
                      <Text style={styles.docTitle}>Leanient Summary</Text>
                      {report.medLine ? <Text style={styles.docMeta}>{report.medLine}</Text> : null}
                    </View>
                    <Text style={styles.docMeta}>{report.rangeLabel}</Text>
                  </View>
                  {report.rows.map((row) => (
                    <View key={row.label} style={styles.line}>
                      <Text style={styles.lineLabel}>{row.label}</Text>
                      <Text style={styles.lineValue}>{row.value}</Text>
                    </View>
                  ))}
                  <Text style={styles.docFoot}>
                    Generated from your logs. A self-tracked summary for discussion with your
                    prescriber.
                  </Text>
                </View>

                <Pressable accessibilityRole="button" accessibilityLabel="Share report" onPress={share} style={({ pressed }) => [styles.share, pressed && styles.sharePressed]}>
                  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#F4FBF7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
                  </Svg>
                  <Text style={styles.shareText}>Share report</Text>
                </Pressable>
                <Text style={styles.shareSub}>Email it, print it, or show your phone.</Text>
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Your report builds itself</Text>
                <Text style={styles.emptyBody}>
                  Log a weigh-in or a dose and this page starts filling in. By your next
                  appointment it will be one tap to share.
                </Text>
              </View>
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
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  lede: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.muted, paddingHorizontal: 2, paddingBottom: 12 },
  // the document card: white, ruled, deliberately printable-looking
  doc: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 18,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 28,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  docHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingBottom: 10,
  },
  docHeadLeft: { flexShrink: 1, paddingRight: 10 },
  docTitle: { fontFamily: font.extrabold, fontSize: 15, letterSpacing: -0.3, color: colors.ink },
  docMeta: { fontFamily: font.medium, fontSize: 10.5, color: colors.muted, marginTop: 2 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lineLabel: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  lineValue: { flexShrink: 1, fontFamily: font.extrabold, fontSize: 13, letterSpacing: -0.13, color: colors.ink, textAlign: "right" },
  docFoot: { fontFamily: font.medium, fontSize: 10, lineHeight: 14, color: colors.faint, paddingTop: 10 },
  share: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.emeraldDeep,
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    shadowOpacity: 0.35,
    elevation: 4,
  },
  sharePressed: { opacity: 0.85 },
  shareText: { fontFamily: font.semibold, fontSize: 15.5, letterSpacing: -0.11, color: "#F4FBF7" },
  shareSub: { fontFamily: font.medium, fontSize: 12, color: colors.faint, textAlign: "center", marginTop: 10 },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink },
  emptyBody: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: colors.muted, textAlign: "center", marginTop: 8 },
});

export default DoctorReportScreen;
