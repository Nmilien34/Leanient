import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { Weekday } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Button } from "../../components/ui/Button";
import { CoachPill } from "../../components/ui/CoachPill";
import { useOnboarding } from "../../context/OnboardingContext";
import { SHOT_DAY_OPTIONS, shotDayCoachNote } from "../../onboarding/shotDay";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const RISE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

interface ShotDayScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

/**
 * Shot Day (onboarding, after Medication Details). Captures the contract's
 * required `shotDay` as a `Weekday`. Days are shown in calendar order; the coach
 * line is dynamic on the selected medication + day.
 */
export function ShotDayScreen({ onBack, onContinue }: ShotDayScreenProps) {
  const { draft, setMedication } = useOnboarding();
  const [day, setDay] = useState<Weekday | null>(draft.medicationProtocol.shotDay ?? null);

  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 520, easing: RISE_EASE, useNativeDriver: true }).start();
  }, [rise]);
  const bodyStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  const coach = shotDayCoachNote(draft.medicationProtocol.medicationName, day);

  const handleContinue = () => {
    if (!day) return;
    setMedication({ shotDay: day });
    onContinue?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={0.21} onBack={onBack} />

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>What day do you take your shot?</Text>
            <Text style={styles.sub}>We'll use this to time your shot reminders and weekly check-ins.</Text>
          </View>

          <Eyebrow style={styles.eyebrow}>SHOT DAY</Eyebrow>
          <View style={styles.chipRow}>
            {SHOT_DAY_OPTIONS.map((o) => {
              const on = day === o.key;
              return (
                <Pressable
                  key={o.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={o.long}
                  onPress={() => setDay(o.key)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.short}</Text>
                </Pressable>
              );
            })}
          </View>

          {coach ? (
            <View style={styles.coachWrap}>
              <CoachPill>{coach}</CoachPill>
            </View>
          ) : null}

          <View style={styles.spacer} />

          <Button label="Continue" disabled={day === null} onPress={handleContinue} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  titleBlock: { marginBottom: 8 },
  h1: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -0.75, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, letterSpacing: -0.16, color: colors.muted, marginTop: 10 },
  eyebrow: { marginTop: 26, marginBottom: 12 },
  chipRow: { flexDirection: "row", gap: 7 },
  chip: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 13,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: "rgba(47,184,122,0.10)", borderColor: colors.emeraldDeep },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  chipTextOn: { color: colors.emeraldDeep },
  coachWrap: { marginTop: 20 },
  spacer: { flex: 1, minHeight: 18 },
});

export default ShotDayScreen;
