import React, { useRef, useState } from "react";
import { Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import Svg, { Path, Rect } from "react-native-svg";
import type { MeasurementUnit } from "@leanient/shared";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockProfile } from "../../mocks/home";
import { ScreenGround } from "../../components/layout/ScreenGround";
import {
  MEASURE_FIELDS,
  MEASURE_STEP,
  buildMeasurementLogDraft,
  initialMeasureState,
  type MeasureKey,
  type MeasureState,
  type MeasurementLogDraft,
} from "./measurementLogForm";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- static asset must be bundled via require
const tickSound = require("../../../assets/tick.wav");
const PX_PER_STEP = 7;

function fmtDate(now: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Today, ${months[now.getMonth()]} ${now.getDate()}`;
}

function Spark() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

interface MeasureRowProps {
  label: string;
  value: number | null;
  fallback: number;
  unit: MeasurementUnit;
  onChange: (next: number) => void;
  onTick: () => void;
  last?: boolean;
}

/** A measurement row whose value scrubs on horizontal drag (vertical scroll still works). */
function MeasureRow({ label, value, fallback, unit, onChange, onTick, last }: MeasureRowProps) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const dragStart = useRef(0);
  const dragLastSteps = useRef(0);
  const [dragging, setDragging] = useState(false);

  const pan = useRef(
    PanResponder.create({
      // Only claim horizontal drags so the ScrollView keeps vertical scrolling.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 3,
      onPanResponderGrant: () => {
        dragStart.current = valueRef.current ?? fallback;
        dragLastSteps.current = 0;
        setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        const steps = Math.round(g.dx / PX_PER_STEP);
        if (steps !== dragLastSteps.current) {
          dragLastSteps.current = steps;
          const next = Math.max(0, Math.round((dragStart.current + steps * MEASURE_STEP[unit]) * 10) / 10);
          if (next !== valueRef.current) {
            valueRef.current = next;
            onTick();
            onChange(next);
          }
        }
      },
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  return (
    <View style={[styles.row, last && styles.rowLast]} {...pan.panHandlers}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.valuePill, dragging && styles.valuePillActive]}>
        {value != null ? (
          <>
            <Text style={styles.value}>{value.toFixed(1)}</Text>
            <Text style={styles.valueUnit}>{unit}</Text>
          </>
        ) : (
          <Text style={styles.valueAdd}>Add</Text>
        )}
      </View>
    </View>
  );
}

interface MeasurementLogScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: MeasurementLogDraft) => Promise<void>;
}

/**
 * Log · Measurement (screen 38). Body measurements scrubbed by dragging each
 * value (with a tick). Saves a `MeasurementLog` draft (blank fields omitted).
 */
export function MeasurementLogScreen({ visible, onClose, onSave }: MeasurementLogScreenProps) {
  const data = useLeanientData();
  const profile = data.profile ?? mockProfile;
  const unit: MeasurementUnit = profile.goalWeightUnit === "kg" ? "cm" : "in";
  const now = useRef(new Date()).current;
  const [state, setState] = useState<MeasureState>(initialMeasureState);

  const player = useAudioPlayer(tickSound);
  const tick = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // audio not ready — ignore
    }
  };

  const setField = (key: MeasureKey, next: number) => setState((s) => ({ ...s, [key]: next }));

  const save = () => {
    void onSave?.(buildMeasurementLogDraft(state, unit, now.toISOString()));
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
            <Text style={styles.headTitle}>Measurements</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.glabel}>WHEN</Text>
            <View style={styles.group}>
              <View style={styles.whenRow}>
                <View style={styles.icon}>
                  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x={3} y={5} width={18} height={16} rx={3} />
                    <Path d="M3 9h18M8 3v4M16 3v4" />
                  </Svg>
                </View>
                <Text style={styles.rowLabel}>Date</Text>
                <Text style={styles.whenValue}>{fmtDate(now)}</Text>
              </View>
            </View>

            <View style={styles.bodyHead}>
              <Text style={styles.glabelInline}>BODY</Text>
              <Text style={styles.dragHint}>Drag a value to adjust</Text>
            </View>
            <View style={styles.group}>
              {MEASURE_FIELDS.map((f, i) => (
                <MeasureRow
                  key={f.key}
                  label={f.label}
                  value={state[f.key]}
                  fallback={f.fallback}
                  unit={unit}
                  onChange={(next) => setField(f.key, next)}
                  onTick={tick}
                  last={i === MEASURE_FIELDS.length - 1}
                />
              ))}
            </View>

            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.coachText}>Waist is the one to watch. When it drops while your arm holds steady, you're losing fat and keeping muscle.</Text>
            </LinearGradient>

            <Pressable accessibilityRole="button" accessibilityLabel="Save measurements" onPress={save}>
              <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Save measurements</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
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
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  bodyHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  glabelInline: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint },
  dragHint: { fontFamily: font.medium, fontSize: 11, color: colors.faint },
  group: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: "hidden" },
  whenRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 15, paddingHorizontal: 15 },
  icon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  whenValue: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  valuePill: { flexDirection: "row", alignItems: "baseline", gap: 4, minWidth: 64, justifyContent: "flex-end", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  valuePillActive: { backgroundColor: "rgba(47,184,122,0.10)" },
  value: { fontFamily: font.bold, fontSize: 17, color: colors.ink, fontVariant: ["tabular-nums"] },
  valueUnit: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  valueAdd: { fontFamily: font.semibold, fontSize: 15, color: colors.faintest },
  aicard: { marginHorizontal: 20, marginTop: 18, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  cta: { marginHorizontal: 20, marginTop: 18, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
});

export default MeasurementLogScreen;
