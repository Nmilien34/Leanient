import React, { useRef, useState } from "react";
import { Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import Svg, { Path, Rect } from "react-native-svg";
import type { WeightUnit } from "@leanient/shared";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockProfile, mockWeightLogs } from "../../mocks/home";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { STEP, buildWeightLogDraft, stepWeight, weightCoachLine, type WeightLogDraft } from "./weightLogForm";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- static asset must be bundled via require
const tickSound = require("../../../assets/tick.wav");

// Pixels of drag per weight step on the ruler.
const PX_PER_STEP = 9;

function fmtWhen(now: Date): string {
  let h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `Today · ${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function Spark() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

interface WeightLogScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: WeightLogDraft) => Promise<void>;
}

/**
 * Log · Weight (screen 37). Big-number entry with a stepper; the coach line
 * reacts to the delta vs. the last weigh-in. Saves a `WeightLog` draft.
 */
export function WeightLogScreen({ visible, onClose, onSave }: WeightLogScreenProps) {
  const data = useLeanientData();
  const profile = data.profile ?? mockProfile;
  const logs = data.weightLogs.length ? data.weightLogs : mockWeightLogs;
  const now = useRef(new Date()).current;

  const lastLog = logs.length ? logs[logs.length - 1] : null;
  const lastWeight = lastLog ? lastLog.value : null;
  const unit: WeightUnit = lastLog?.unit ?? profile.goalWeightUnit;

  const [value, setValue] = useState<number>(lastWeight ?? profile.goalWeight);
  const [dragging, setDragging] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Tick: a haptic "click" (mobile) + the same tick sound the wheel uses.
  const player = useAudioPlayer(tickSound);
  const tick = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // audio not ready yet — ignore
    }
  };

  // Apply a new value, clicking once per change (shared by buttons + drag).
  const applyValue = (next: number) => {
    if (next === valueRef.current) return;
    valueRef.current = next;
    tick();
    setValue(next);
  };

  // Drag the ruler horizontally to scrub the weight (right = up, left = down).
  const dragStart = useRef(value);
  const dragLastSteps = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        dragStart.current = valueRef.current;
        dragLastSteps.current = 0;
        setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        const steps = Math.round(g.dx / PX_PER_STEP);
        if (steps !== dragLastSteps.current) {
          dragLastSteps.current = steps;
          applyValue(Math.round((dragStart.current + steps * STEP[unit]) * 10) / 10);
        }
      },
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  const save = () => {
    void onSave?.(buildWeightLogDraft(value, unit, now.toISOString()));
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
            <Text style={styles.headTitle}>Log weight</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* big number */}
            <View style={styles.bignum}>
              <Text style={styles.bignumValue}>{value.toFixed(1)}</Text>
              <Text style={styles.bignumUnit}>{unit}</Text>
            </View>

            {/* ruler — drag horizontally to scrub the weight */}
            <View style={styles.rulerWrap} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Weight ruler, drag to adjust">
              <View style={[styles.ruler, dragging && styles.rulerActive]}>
                {Array.from({ length: 33 }, (_, i) => (
                  <View key={i} style={[styles.tick, i === 16 && styles.tickMid, { height: i % 4 === 0 ? 28 : 14 }]} />
                ))}
              </View>
              <Text style={styles.dragHint}>Drag to adjust</Text>
            </View>

            {/* stepper */}
            <View style={styles.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel="Decrease weight" onPress={() => applyValue(stepWeight(valueRef.current, -1, unit))} style={styles.stepBtn}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Increase weight" onPress={() => applyValue(stepWeight(valueRef.current, 1, unit))} style={styles.stepBtn}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>

            {/* when */}
            <Text style={styles.glabel}>WHEN</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x={3} y={5} width={18} height={16} rx={3} />
                    <Path d="M3 9h18M8 3v4M16 3v4" />
                  </Svg>
                </View>
                <Text style={styles.rowLabel}>Date</Text>
                <Text style={styles.rowValue}>{fmtWhen(now)}</Text>
                <Text style={styles.chevSmall}>›</Text>
              </View>
            </View>

            {/* coach */}
            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.coachText}>{weightCoachLine(value, lastWeight, unit)}</Text>
            </LinearGradient>

            <Pressable accessibilityRole="button" accessibilityLabel="Save weight" onPress={save}>
              <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Save weight</Text>
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
  bignum: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 7, paddingTop: 28, paddingBottom: 4 },
  bignumValue: { fontFamily: font.extrabold, fontSize: 66, letterSpacing: -2, color: colors.ink, lineHeight: 66 },
  bignumUnit: { fontFamily: font.bold, fontSize: 21, color: colors.muted, marginBottom: 9 },
  rulerWrap: { marginTop: 18, paddingVertical: 10 },
  ruler: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 5, height: 34, opacity: 0.7 },
  rulerActive: { opacity: 1 },
  tick: { width: 2, borderRadius: 1, backgroundColor: "#CBCBC4" },
  tickMid: { backgroundColor: colors.emeraldDeep, width: 3 },
  dragHint: { fontFamily: font.medium, fontSize: 11, color: colors.faint, textAlign: "center", marginTop: 8 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 14 },
  stepBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: font.regular, fontSize: 27, color: colors.ink },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 2 },
  group: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 15, paddingHorizontal: 15 },
  icon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  rowLabel: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowValue: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  chevSmall: { fontFamily: font.regular, fontSize: 20, color: colors.faintest, marginLeft: 11 },
  aicard: { marginHorizontal: 20, marginTop: 18, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  cta: { marginHorizontal: 20, marginTop: 18, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
});

export default WeightLogScreen;
