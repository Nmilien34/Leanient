import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import type { DoseInjectionSite } from "@leanient/shared";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockMedicationProtocol } from "../../mocks/home";
import { ScreenGround } from "../../components/layout/ScreenGround";
import {
  MAP_SITES,
  buildDoseCalendarMonth,
  buildDoseLogDraft,
  formatDoseCalendarMonth,
  formatDoseLogWhen,
  siteHint,
  siteLabel,
  suggestNextSite,
  withDoseLogDate,
  type DoseCalendarCell,
  type DoseLogDraft,
} from "./doseLogForm";
import { DOSE_LOG_HEADER_TOP_PADDING } from "./doseLogLayout";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

// Front-body coordinates for each injectable site (viewBox 166x208).
const SITE_POS: Record<DoseInjectionSite, { x: number; y: number }> = {
  abdomen_left: { x: 72, y: 92 },
  abdomen_right: { x: 94, y: 92 },
  arm_left: { x: 43, y: 76 },
  arm_right: { x: 123, y: 76 },
  thigh_left: { x: 70, y: 152 },
  thigh_right: { x: 96, y: 152 },
  buttock_left: { x: 0, y: 0 },
  buttock_right: { x: 0, y: 0 },
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface DoseLogScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: DoseLogDraft) => Promise<void>;
  /** Last site injected (from the latest dose); drives the rotation suggestion. */
  lastSite?: DoseInjectionSite | null;
}

/**
 * Log · Dose (screen 36). Confirms the scheduled med + dose and logs the
 * injection site, suggesting the next site by rotation from the last one used.
 * Saves a `DoseLog` draft.
 */
export function DoseLogScreen({ visible, onClose, onSave, lastSite = "abdomen_left" }: DoseLogScreenProps) {
  const data = useLeanientData();
  const protocol = data.medicationProtocol;
  const displayProtocol = protocol ?? mockMedicationProtocol;
  const openedAtRef = useRef(new Date());
  const [openedAt, setOpenedAt] = useState(openedAtRef.current);
  const suggested = useMemo(() => suggestNextSite(lastSite), [lastSite]);
  const [site, setSite] = useState<DoseInjectionSite>(suggested);
  const [recordedAt, setRecordedAt] = useState(openedAt);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(openedAt.getFullYear(), openedAt.getMonth(), 1));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const nextOpenedAt = new Date();
    openedAtRef.current = nextOpenedAt;
    setOpenedAt(nextOpenedAt);
    setSite(suggested);
    setRecordedAt(nextOpenedAt);
    setCalendarMonth(new Date(nextOpenedAt.getFullYear(), nextOpenedAt.getMonth(), 1));
    setCalendarOpen(false);
    setSaving(false);
    setError(null);
  }, [suggested, visible]);

  const calendarCells = useMemo(
    () => buildDoseCalendarMonth(calendarMonth, recordedAt, openedAt),
    [calendarMonth, openedAt, recordedAt],
  );
  const canSave = !saving;
  const doseLabel = displayProtocol.doseAmount != null ? `${displayProtocol.doseAmount.toFixed(1)} ${displayProtocol.doseUnit}` : "";

  const openCalendar = () => {
    setCalendarMonth(new Date(recordedAt.getFullYear(), recordedAt.getMonth(), 1));
    setCalendarOpen(true);
  };

  const chooseDate = (cell: DoseCalendarCell) => {
    if (!cell.day) return;
    setRecordedAt(withDoseLogDate(recordedAt, cell.year, cell.month, cell.day));
    setCalendarOpen(false);
  };

  const save = async () => {
    if (saving) return;
    if (!protocol) {
      setError("Your medication schedule is still loading. Try again in a moment.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave?.(buildDoseLogDraft({ protocol, site, recordedAt: recordedAt.toISOString() }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't log this dose. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Log dose</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* medication */}
            <View style={styles.medCard}>
              <LinearGradient colors={["#9AC8E0", "#5E93B6"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Rect x={3} y={8} width={18} height={8} rx={4} />
                  <Path d="M12 8v8" />
                </Svg>
              </LinearGradient>
              <View style={styles.flex}>
                <Text style={styles.ftitle}>
                  {displayProtocol.medicationName} · {doseLabel}
                </Text>
                <Text style={styles.fsub}>From your schedule. Tap to change just this dose.</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </View>

            {/* injection site */}
            <Text style={styles.glabel}>INJECTION SITE</Text>
            <View style={styles.siteCard}>
              <View style={styles.bodyWrap}>
                <Svg width={166} height={208} viewBox="0 0 166 208">
                  <G fill="#E8EBE3">
                    <Circle cx={83} cy={22} r={16} />
                    <Rect x={53} y={44} width={60} height={90} rx={20} />
                    <Rect x={36} y={50} width={15} height={66} rx={7.5} />
                    <Rect x={115} y={50} width={15} height={66} rx={7.5} />
                    <Rect x={61} y={128} width={17} height={70} rx={8.5} />
                    <Rect x={88} y={128} width={17} height={70} rx={8.5} />
                  </G>
                  {MAP_SITES.map((s) => {
                    const p = SITE_POS[s];
                    const selected = s === site;
                    const isLast = s === lastSite;
                    return (
                      <G key={s}>
                        {isLast && !selected ? (
                          <Circle cx={p.x} cy={p.y} r={11} fill="none" stroke="#C7CCC0" strokeWidth={1.5} strokeDasharray="3 3" />
                        ) : null}
                        <Circle
                          cx={p.x}
                          cy={p.y}
                          r={selected ? 9 : 7}
                          fill={selected ? "#1F9E63" : "#fff"}
                          stroke={selected ? "#fff" : "#C7CCC0"}
                          strokeWidth={selected ? 2.5 : 2}
                          onPress={() => setSite(s)}
                        />
                      </G>
                    );
                  })}
                </Svg>
              </View>
              <Text style={styles.siteName}>{siteLabel(site)}</Text>
              <Text style={styles.siteHint}>{siteHint(site, suggested, lastSite)}</Text>
            </View>

            {/* when */}
            <Text style={styles.glabel}>WHEN</Text>
            <View style={styles.group}>
              <Pressable accessibilityRole="button" accessibilityLabel="Choose dose date" onPress={openCalendar} style={styles.row}>
                <View style={styles.icon}>
                  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x={3} y={5} width={18} height={16} rx={3} />
                    <Path d="M3 9h18M8 3v4M16 3v4" />
                  </Svg>
                </View>
                <Text style={styles.rowLabel}>Date</Text>
                <Text style={styles.rowValue}>{formatDoseLogWhen(recordedAt, openedAt)}</Text>
                <Text style={styles.chevSmall}>›</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable accessibilityRole="button" accessibilityLabel="Log this dose" onPress={save} disabled={!canSave}>
              <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.cta, !canSave && styles.ctaDisabled]}>
                {saving ? <ActivityIndicator color="#F4FBF7" /> : <Text style={styles.ctaText}>Log this dose</Text>}
              </LinearGradient>
            </Pressable>
          </ScrollView>

          <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
            <View style={styles.calendarOverlay}>
              <Pressable style={styles.calendarBackdrop} onPress={() => setCalendarOpen(false)} />
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={styles.monthButton}>
                    <Text style={styles.monthButtonText}>‹</Text>
                  </Pressable>
                  <Text style={styles.calendarTitle}>{formatDoseCalendarMonth(calendarMonth)}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={styles.monthButton}>
                    <Text style={styles.monthButtonText}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.weekdayRow}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <Text key={`${label}-${index}`} style={styles.weekdayText}>{label}</Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) =>
                    cell.day ? (
                      <Pressable
                        key={cell.key}
                        accessibilityRole="button"
                        accessibilityLabel={`Choose ${formatDoseCalendarMonth(new Date(cell.year, cell.month, 1))} ${cell.day}`}
                        onPress={() => chooseDate(cell)}
                        style={[styles.dayButton, cell.isSelected && styles.dayButtonSelected, cell.isToday && !cell.isSelected && styles.dayButtonToday]}
                      >
                        <Text style={[styles.dayText, cell.isSelected && styles.dayTextSelected]}>{cell.day}</Text>
                      </Pressable>
                    ) : (
                      <View key={cell.key} style={styles.dayButton} />
                    ),
                  )}
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: DOSE_LOG_HEADER_TOP_PADDING, paddingBottom: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  medCard: { flexDirection: "row", alignItems: "center", gap: 13, marginHorizontal: 20, marginTop: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  fic: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  ftitle: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: colors.ink },
  fsub: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 2 },
  chev: { fontFamily: font.regular, fontSize: 20, color: colors.faintest },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  siteCard: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16 },
  bodyWrap: { alignItems: "center" },
  siteName: { fontFamily: font.semibold, fontSize: 14, color: colors.emeraldDeep, textAlign: "center", marginTop: 8 },
  siteHint: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, textAlign: "center", marginTop: 3, paddingHorizontal: 8 },
  group: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 15, paddingHorizontal: 15 },
  icon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  rowLabel: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowValue: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  chevSmall: { fontFamily: font.regular, fontSize: 20, color: colors.faintest, marginLeft: 11 },
  errorText: { marginHorizontal: 24, marginTop: 14, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: "#A94B4B" },
  cta: { marginHorizontal: 20, marginTop: 22, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaDisabled: { opacity: 0.55 },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
  calendarOverlay: { flex: 1, justifyContent: "flex-end" },
  calendarBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 18, 15, 0.28)" },
  calendarCard: { margin: 16, marginBottom: 26, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  monthButtonText: { fontFamily: font.regular, fontSize: 28, color: colors.ink, lineHeight: 30 },
  calendarTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  weekdayRow: { flexDirection: "row", marginTop: 16 },
  weekdayText: { flex: 1, textAlign: "center", fontFamily: font.bold, fontSize: 11, color: colors.faint },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  dayButton: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  dayButtonSelected: { backgroundColor: colors.emeraldDeep },
  dayButtonToday: { borderWidth: 1, borderColor: colors.emeraldDeep },
  dayText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  dayTextSelected: { color: "#F4FBF7" },
});

export default DoseLogScreen;
