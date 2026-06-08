import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { MuscleRetentionSnapshot } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { EmptyState } from "../../components/app/EmptyState";
import { buildWhatChanged, type ChangeTone } from "./whatChanged";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface WhatChangedScreenProps {
  visible: boolean;
  snapshots: MuscleRetentionSnapshot[];
  onClose: () => void;
}

const TONE_COLOR: Record<ChangeTone, string> = {
  up: colors.emeraldDeep,
  down: colors.amberDeep,
  flat: colors.muted,
};
const TONE_ARROW: Record<ChangeTone, string> = { up: "↑", down: "↓", flat: "→" };

/**
 * Real week-over-week comparison after a check-in: this week vs last week's
 * retention label, protein, workouts, and weight (from the retention snapshots).
 */
export function WhatChangedScreen({ visible, snapshots, onClose }: WhatChangedScreenProps) {
  const view = buildWhatChanged(snapshots);

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
            <Text style={styles.headTitle}>What changed</Text>
            <View style={styles.headSpacer} />
          </View>

          {!view ? (
            <EmptyState
              title="Your first scored week is coming"
              message="Once you have a couple of weekly check-ins, this shows how things moved week to week."
            />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* retention headline */}
              <LinearGradient colors={["#EDEEE9", "#E5E7E0"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
                <Text style={styles.heroEyebrow}>THIS WEEK</Text>
                <Text style={[styles.heroLabel, { color: TONE_COLOR[view.retentionTone] }]}>{view.retentionLabel}</Text>
                {view.retentionShift ? (
                  <Text style={styles.heroShift}>
                    {TONE_ARROW[view.retentionTone]} {view.retentionShift}
                  </Text>
                ) : view.hasPrior ? (
                  <Text style={styles.heroShift}>Holding steady from last week</Text>
                ) : null}
              </LinearGradient>

              {!view.hasPrior ? (
                <Text style={styles.firstNote}>
                  This is your first scored week. Next week, this page shows exactly what moved.
                </Text>
              ) : (
                <Text style={styles.sectionLabel}>VS LAST WEEK</Text>
              )}

              <View style={styles.card}>
                {view.rows.map((row) => (
                  <View key={row.key} style={styles.row}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <View style={styles.rowRight}>
                      <Text style={styles.rowValue}>{row.value}</Text>
                      {row.delta ? (
                        <Text style={[styles.delta, { color: TONE_COLOR[row.tone] }]}>
                          {row.tone !== "flat" ? `${TONE_ARROW[row.tone]} ` : ""}
                          {row.delta}
                        </Text>
                      ) : null}
                    </View>
                  </View>
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
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hero: { marginHorizontal: 20, marginTop: 6, borderRadius: 22, paddingVertical: 22, paddingHorizontal: 18, alignItems: "center", borderWidth: 1, borderColor: "#DCDDD5" },
  heroEyebrow: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.0, color: colors.muted },
  heroLabel: { fontFamily: font.extrabold, fontSize: 28, letterSpacing: -0.7, marginTop: 6 },
  heroShift: { fontFamily: font.semibold, fontSize: 13.5, color: colors.muted, marginTop: 6 },
  firstNote: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: "center", paddingHorizontal: 24, marginTop: 18, marginBottom: 4 },
  sectionLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 6 },
  card: { marginHorizontal: 20, marginTop: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, gap: 12, borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { fontFamily: font.medium, fontSize: 14.5, color: colors.muted },
  rowRight: { alignItems: "flex-end" },
  rowValue: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.2, color: colors.ink },
  delta: { fontFamily: font.semibold, fontSize: 12.5, marginTop: 2 },
});

export default WhatChangedScreen;
