import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { FirstJourneyView } from "../../screens/app/firstJourney";
import { RadialGlow } from "../layout/RadialGlow";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface FirstJourneyCardProps {
  view: FirstJourneyView;
}

/**
 * Cold-start "mirror moment" for a brand-new user with no data. Reflects back
 * the drug, goal, and fear we captured at onboarding and makes the stakes vivid,
 * so the empty app reads as "we understand you, here's the path" rather than a
 * blank score waiting to be unlocked.
 */
export function FirstJourneyCard({ view }: FirstJourneyCardProps) {
  const hasPath = view.startLabel != null && view.goalLabel != null;

  return (
    <View style={styles.card}>
      <RadialGlow
        size={210}
        position={{ top: -60, right: -50 }}
        stops={[
          { offset: 0, color: "rgba(47,184,122,0.34)", opacity: 1 },
          { offset: 0.7, color: "rgba(47,184,122,0.34)", opacity: 0 },
        ]}
      />

      <Text style={styles.eyebrow}>WHY LEANIENT</Text>

      <View style={styles.statRow}>
        <Text style={styles.stat}>{view.stakeStat}</Text>
        <Text style={styles.statCaption}>{view.stakeCaption}</Text>
      </View>

      <Text style={styles.fear}>{view.fearLine}</Text>

      {hasPath ? (
        <View style={styles.strip}>
          <View style={styles.stripCol}>
            <Text style={styles.stripKey}>START</Text>
            <Text style={styles.stripVal}>{view.startLabel}</Text>
          </View>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12h14M13 6l6 6-6 6" />
          </Svg>
          <View style={styles.stripCol}>
            <Text style={styles.stripKey}>GOAL</Text>
            <Text style={styles.stripVal}>{view.goalLabel}</Text>
          </View>
          {view.etaLabel ? (
            <View style={styles.stripCol}>
              <Text style={styles.stripKey}>BY</Text>
              <Text style={styles.stripVal}>{view.etaLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.promise}>{view.promise}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 18, overflow: "hidden", shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 16 }, shadowRadius: 24, shadowOpacity: 0.1, elevation: 4 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.emeraldDeep },
  statRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 12 },
  stat: { fontFamily: font.extrabold, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: colors.emeraldDeep },
  statCaption: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.inkSoft, paddingBottom: 3 },
  fear: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted, marginTop: 14 },
  strip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 16, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.sageFill },
  stripCol: { alignItems: "center" },
  stripKey: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.6, color: colors.muted },
  stripVal: { fontFamily: font.extrabold, fontSize: 16, letterSpacing: -0.3, color: colors.ink, marginTop: 3 },
  promise: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 13 },
});

export default FirstJourneyCard;
