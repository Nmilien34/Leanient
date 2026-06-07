import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect } from "react-native-svg";
import type { SideEffectSymptom } from "@leanient/shared";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockMedicationProtocol } from "../../mocks/home";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { computeShotCycle } from "./todayMetrics";
import {
  SEVERITIES,
  SYMPTOMS,
  buildSideEffectLogDraft,
  initialSideEffectForm,
  sideEffectCoachLine,
  type SideEffectLogDraft,
} from "./sideEffectLogForm";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function Spark() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

interface SideEffectLogScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: SideEffectLogDraft) => Promise<void>;
}

/**
 * Log · Side effect (screen 40). Pick a symptom + severity; the coach line is
 * symptom-specific and shot-aware. Saves a `SideEffectLog` draft.
 */
export function SideEffectLogScreen({ visible, onClose, onSave }: SideEffectLogScreenProps) {
  const data = useLeanientData();
  const medication = data.medicationProtocol ?? mockMedicationProtocol;
  const now = useRef(new Date()).current;
  const daysSinceShot = medication ? computeShotCycle(medication, now).daysSinceShot : null;

  const [form, setForm] = useState(initialSideEffectForm);
  const setSymptom = (symptom: SideEffectSymptom) => setForm((f) => ({ ...f, symptom }));
  const setSeverity = (severity: number) => setForm((f) => ({ ...f, severity }));
  const setNote = (note: string) => setForm((f) => ({ ...f, note }));

  const save = () => {
    void onSave?.(buildSideEffectLogDraft(form, daysSinceShot, now.toISOString()));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Side effect</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.glabel}>WHAT ARE YOU FEELING?</Text>
            <View style={styles.chiprow}>
              {SYMPTOMS.map((s) => {
                const on = form.symptom === s.id;
                return (
                  <Pressable key={s.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={s.label} onPress={() => setSymptom(s.id)} style={[styles.chip, on && styles.chipSel]}>
                    <Text style={[styles.chipText, on && styles.chipTextSel]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.glabel}>HOW STRONG?</Text>
            <View style={styles.seg}>
              {SEVERITIES.map((sv) => {
                const on = form.severity === sv.level;
                return (
                  <Pressable key={sv.level} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={sv.label} onPress={() => setSeverity(sv.level)} style={[styles.segItem, on && styles.segItemOn]}>
                    <Text style={[styles.segText, on && styles.segTextOn]}>{sv.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.glabel}>WHEN</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x={3} y={5} width={18} height={16} rx={3} />
                    <Path d="M3 9h18M8 3v4M16 3v4" />
                  </Svg>
                </View>
                <Text style={styles.rowLabel}>Started</Text>
                <Text style={styles.rowValue}>Today · since this morning</Text>
                <Text style={styles.chev}>›</Text>
              </View>
            </View>

            <TextInput
              style={styles.note}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.faintest}
              value={form.note}
              onChangeText={setNote}
              multiline
              accessibilityLabel="Note"
            />

            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.coachText}>{sideEffectCoachLine(form.symptom, daysSinceShot)}</Text>
            </LinearGradient>

            <Pressable accessibilityRole="button" accessibilityLabel="Save" onPress={save}>
              <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Save</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  chiprow: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingHorizontal: 20 },
  chip: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 15 },
  chipSel: { backgroundColor: "rgba(47,184,122,0.10)", borderColor: "rgba(47,184,122,0.45)" },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  chipTextSel: { color: colors.emeraldDeep },
  seg: { flexDirection: "row", marginHorizontal: 20, backgroundColor: "#EBECE6", borderRadius: 14, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 11 },
  segItemOn: { backgroundColor: "#fff", shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, shadowOpacity: 0.18, elevation: 2 },
  segText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  segTextOn: { color: colors.ink },
  group: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 15, paddingHorizontal: 15 },
  icon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  rowLabel: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowValue: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  chev: { fontFamily: font.regular, fontSize: 20, color: colors.faintest, marginLeft: 11 },
  note: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, minHeight: 50, fontFamily: font.regular, fontSize: 14, color: colors.ink },
  aicard: { marginHorizontal: 20, marginTop: 16, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  cta: { marginHorizontal: 20, marginTop: 18, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
});

export default SideEffectLogScreen;
