import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { VerdictCard } from "../../components/app/VerdictCard";
import {
  mockVerdictOnTrack,
  mockVerdictDrifting,
  mockVerdictLosingMuscle,
  mockVerdictNoData,
} from "../../mocks/verdicts";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const STATES = [mockVerdictOnTrack, mockVerdictDrifting, mockVerdictLosingMuscle, mockVerdictNoData];

interface VerdictStatesScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Reference gallery of the four verdict states, each rendered with the SAME
 * `VerdictCard` (mini variant) — proof the card restyles per status. Calm tones,
 * never red; the empty state coaches.
 */
export function VerdictStatesScreen({ visible, onClose }: VerdictStatesScreenProps) {
  if (!visible) return null;

  return (
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
          <View style={styles.closeBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>Verdict states</Text>
            <Text style={styles.sub}>Calm tones — never red. The empty state coaches.</Text>
          </View>

          <View style={styles.grid}>
            {STATES.map((v) => (
              <View key={v.status} style={styles.cell}>
                <VerdictCard verdict={v} mini />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 70 },
  safe: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 28 },
  titleBlock: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  h1: { fontFamily: font.extrabold, fontSize: 23, letterSpacing: -0.57, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, paddingHorizontal: 16, paddingTop: 12 },
  cell: { width: "48.5%", flexDirection: "row" },
});

export default VerdictStatesScreen;
