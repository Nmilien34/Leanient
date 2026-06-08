import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { WeeklyVerdict } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { VerdictCard } from "../../components/app/VerdictCard";
import { Button } from "../../components/ui/Button";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekLabel(weekOf: string): string {
  const start = new Date(`${weekOf}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return "THIS WEEK";
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `WEEK OF ${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()} – ${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
}

interface VerdictRevealScreenProps {
  verdict: WeeklyVerdict;
  onSeeChanges: () => void;
  onBackHome: () => void;
}

/**
 * Post check-in verdict reveal. The submit response returns the freshly generated
 * verdict, shown here as the calm standout moment the check-in builds toward.
 * "See what changed" opens the verdict explainer on Home; "Back to home" dismisses.
 */
export function VerdictRevealScreen({ verdict, onSeeChanges, onBackHome }: VerdictRevealScreenProps) {
  // First check-ins (and weeks without enough data) come back "no_data": the
  // muscle-retention verdict needs a prior week to compare against. Frame that as
  // progress ("check-in saved, verdict unlocks next week") instead of a flat
  // "still gathering", and hide the breakdown CTA since there's nothing to break
  // down yet.
  const gathering = verdict.status === "no_data";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.head}>
          <Text style={styles.headTitle}>{gathering ? "Check-in saved" : "Your verdict"}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>{weekLabel(verdict.weekOf)}</Text>
          <View style={styles.cardWrap}>
            <VerdictCard verdict={verdict} />
          </View>
          {gathering ? (
            <>
              <Text style={styles.note}>
                Your full muscle verdict needs one more weekly check-in to compare against. Keep logging your
                protein and workouts, and it unlocks next week.
              </Text>
              <Button label="Got it" onPress={onBackHome} style={styles.cta} />
            </>
          ) : (
            <>
              <Button label="See what changed" onPress={onSeeChanges} style={styles.cta} />
              <Button label="Back to home" variant="ghost" onPress={onBackHome} style={styles.ghost} />
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 90 },
  safe: { flex: 1 },
  head: { alignItems: "center", paddingTop: 14, paddingBottom: 4 },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 22, paddingBottom: 30 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.0, color: colors.muted, textAlign: "center", marginBottom: 16 },
  cardWrap: { marginBottom: 22 },
  note: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: "center", marginBottom: 22, paddingHorizontal: 6 },
  cta: {},
  ghost: { marginTop: 8 },
});

export default VerdictRevealScreen;
