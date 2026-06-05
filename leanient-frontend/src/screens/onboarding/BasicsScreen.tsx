import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { SegButton } from "../../components/ui/SegButton";
import { AgeWheel } from "../../components/ui/AgeWheel";
import { Button } from "../../components/ui/Button";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { useOnboarding } from "../../context/OnboardingContext";
import type { SexAssignedAtBirth } from "../../onboarding/draft";

const RISE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

interface BasicsScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

// Sex + age feed the backend calorie model (Mifflin-St Jeor). Sex is male/female
// only: a biological input, separate from gender identity. They are written to the
// draft's `basics` slice and submitted with onboarding.
const SEX_OPTIONS: { key: SexAssignedAtBirth; label: string }[] = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
];

export function BasicsScreen({ onBack, onContinue }: BasicsScreenProps) {
  const { setBasics } = useOnboarding();
  const [sex, setSex] = useState<SexAssignedAtBirth | null>(null);
  const [age, setAge] = useState(30);

  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 520, easing: RISE_EASE, useNativeDriver: true }).start();
  }, [rise]);

  const bodyStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={0.48} onBack={onBack} />

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>A couple basics so we calibrate right.</Text>
            <Text style={styles.sub}>
              We use this to set protein targets and metabolic baselines. Nothing else.
            </Text>
          </View>

          <Eyebrow style={styles.eyebrowFirst}>SEX ASSIGNED AT BIRTH</Eyebrow>
          <View style={styles.segRow}>
            {SEX_OPTIONS.map((o) => (
              <SegButton key={o.key} label={o.label} selected={sex === o.key} onPress={() => setSex(o.key)} />
            ))}
          </View>
          <Text style={styles.sexCaption}>
            We use this to calculate your calorie target accurately. This is a biological input
            separate from gender identity.
          </Text>

          <Eyebrow style={styles.eyebrowAge}>AGE</Eyebrow>
          <AgeWheel value={age} onChange={setAge} />

          <View style={styles.spacer} />

          <Button
            label="Continue"
            disabled={sex === null}
            onPress={() => {
              if (!sex) return;
              setBasics({ sexAssignedAtBirth: sex, age });
              onContinue?.();
            }}
          />
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
    marginTop: 10,
  },
  eyebrowFirst: { marginTop: 22, marginBottom: 12 },
  segRow: { flexDirection: "row", gap: 10 },
  sexCaption: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
    color: colors.muted,
    marginTop: 10,
  },
  eyebrowAge: { marginTop: 28, marginBottom: 12 },
  spacer: { flex: 1, minHeight: 18 },
});

export default BasicsScreen;
