import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { OptionList } from "../../components/ui/OptionList";
import { Button } from "../../components/ui/Button";
import { useOnboarding } from "../../context/OnboardingContext";
import { ENERGY_OPTIONS } from "../../onboarding/options";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const RISE_EASE = Easing.bezier(0.2, 0.7, 0.2, 1);

interface EnergyRealityScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

export function EnergyRealityScreen({ onBack, onContinue }: EnergyRealityScreenProps) {
  const { draft, setProfile } = useOnboarding();
  // Restore the user's previous picks when they come back to re-tweak; otherwise
  // fall back to the prototype's pre-selected example ([0, 3]) on first visit.
  const [selected, setSelected] = useState<number[]>(() => {
    const persisted = draft.profile.sideEffectBaseline;
    if (!persisted) return [0, 3];
    return persisted
      .map((key) => ENERGY_OPTIONS.findIndex((o) => o.key === key))
      .filter((i) => i >= 0);
  });

  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 520, easing: RISE_EASE, useNativeDriver: true }).start();
  }, [rise]);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const opt = ENERGY_OPTIONS[i];
      const has = prev.includes(i);
      if (opt.exclusive) {
        // "I feel fine" is exclusive: selecting it clears everything else.
        return has ? [] : [i];
      }
      // Any concern deselects the exclusive sentinel.
      const base = prev.filter((idx) => !ENERGY_OPTIONS[idx].exclusive);
      return has ? base.filter((idx) => idx !== i) : [...base, i];
    });
  };

  const handleContinue = () => {
    const baseline = selected
      .map((i) => ENERGY_OPTIONS[i].key)
      .filter((k): k is string => k !== null);
    setProfile({ sideEffectBaseline: baseline });
    onContinue?.();
  };

  const riseStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={1} onBack={onBack} />

        <Animated.View style={[styles.body, riseStyle]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.titleBlock}>
              <Text style={styles.h1}>How are you feeling on it?</Text>
              <Text style={styles.sub}>
                We'll adjust your plan around your real days, not your perfect days.
              </Text>
              <Eyebrow style={styles.eyebrow}>SELECT ALL THAT APPLY</Eyebrow>
            </View>
            <View style={{ height: 20 }} />
            <OptionList
              multi
              options={ENERGY_OPTIONS.map((o) => o.label)}
              selected={selected}
              onSelect={toggle}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Continue" disabled={selected.length === 0} onPress={handleContinue} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  scroll: { paddingBottom: 16 },
  titleBlock: { gap: 10 },
  h1: {
    fontFamily: font.extrabold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.75,
    color: colors.ink,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.16,
    color: colors.muted,
  },
  eyebrow: { marginTop: 2 },
  footer: { paddingTop: 12, paddingBottom: 24 },
});

export default EnergyRealityScreen;
