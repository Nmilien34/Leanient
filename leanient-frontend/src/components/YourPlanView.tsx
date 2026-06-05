import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "./layout/ScreenGround";
import { Button } from "./ui/Button";
import { formatThousands, type YourPlanTargets } from "../onboarding/yourPlan";
import { colors } from "../theme/tokens";
import { font } from "../theme/fonts";

const RISE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

interface MetricDef {
  label: string;
  value: string;
  unit: string;
}

function SparkMark() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={colors.emerald}>
      <Path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
    </Svg>
  );
}

function Metric({ metric }: { metric: MetricDef }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricValue}>
        {metric.value}
        <Text style={styles.metricUnit}> {metric.unit}</Text>
      </Text>
    </View>
  );
}

interface YourPlanViewProps {
  plan: YourPlanTargets;
  onContinue: () => void;
}

/**
 * Post-onboarding celebration view. Shown by PaywallScreen the moment submit()
 * succeeds, displaying the user's REAL backend-computed targets (Mifflin-St Jeor).
 * Tapping Continue is the only way out: it calls onContinue (App's onComplete),
 * which refreshes data and routes to the main app. No auto-dismiss.
 */
export function YourPlanView({ plan, onContinue }: YourPlanViewProps) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 560,
      easing: RISE_EASE,
      useNativeDriver: true,
    }).start();
  }, [rise]);

  const bodyStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  const metrics: MetricDef[] = [
    { label: "DAILY PROTEIN", value: formatThousands(plan.dailyProteinTarget), unit: "g" },
    { label: "DAILY CALORIES", value: formatThousands(plan.dailyCalorieTarget), unit: "kcal" },
    {
      label: "WEEKLY TRAINING",
      value: String(plan.weeklyWorkoutTarget),
      unit: plan.weeklyWorkoutTarget === 1 ? "session" : "sessions",
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.header}>
            <SparkMark />
            <Text style={styles.h1}>Your plan is ready.</Text>
            <Text style={styles.sub}>
              We've calibrated these to your goals, training status, and biology.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metrics}>
            {metrics.map((m) => (
              <Metric key={m.label} metric={m} />
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.spacer} />

          <Button label="Continue to your dashboard" onPress={onContinue} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  header: { alignItems: "center", gap: 12, marginTop: 24 },
  h1: {
    fontFamily: font.extrabold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.75,
    color: colors.ink,
    textAlign: "center",
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.16,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 28 },
  metrics: { gap: 26 },
  metric: { alignItems: "center", gap: 6 },
  metricLabel: {
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 1.08,
    color: colors.muted,
  },
  metricValue: {
    fontFamily: font.extrabold,
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1.2,
    color: colors.emeraldDeep,
  },
  metricUnit: {
    fontFamily: font.semibold,
    fontSize: 18,
    letterSpacing: -0.2,
    color: colors.muted,
  },
  spacer: { flex: 1, minHeight: 18 },
});

export default YourPlanView;
