import React, { useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { Button } from "../../components/ui/Button";
import { YourPlanView } from "../../components/YourPlanView";
import { useAuth } from "../../context/AuthContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { extractApiError } from "../../services/apiError";
import { buildPlanPreview } from "../../onboarding/planPreview";
import { completePaywallOnboarding } from "../../onboarding/paywallSubmit";
import type { YourPlanTargets } from "../../onboarding/yourPlan";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

type PlanId = "annual" | "monthly";

interface PlanTierDef {
  id: PlanId;
  name: string;
  price: string;
  unit: string;
  note: string;
  badge?: string;
  trialNote: string;
}

const TIERS: PlanTierDef[] = [
  {
    id: "annual",
    name: "Annual",
    price: "$29.99",
    unit: " /yr",
    note: "just $2.50/mo",
    badge: "SAVE 69%",
    trialNote: "7 days free, then $29.99/yr · cancel anytime",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$7.99",
    unit: " /mo",
    note: "billed monthly",
    trialNote: "7 days free, then $7.99/mo · cancel anytime",
  },
];

function Star() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill={colors.emerald}>
      <Path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
    </Svg>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Skip"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.sageSoft }]}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M6 6l12 12M18 6L6 18" stroke={colors.muted} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

function PlanRow({ label, value, hero, sub }: { label: string; value: string; hero?: boolean; sub?: string }) {
  return (
    <View style={[styles.row, hero && styles.rowHero]}>
      <View style={styles.rowKey}>
        {hero ? null : <View style={styles.pdot} />}
        <View>
          <Text style={[styles.k, hero && styles.kHero]}>{label}</Text>
          {sub ? <Text style={styles.kSub}>{sub}</Text> : null}
        </View>
      </View>
      <Text style={[styles.v, hero && styles.vHero]}>{value}</Text>
    </View>
  );
}

function PlanTier({ tier, selected, onPress }: { tier: PlanTierDef; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${tier.name} ${tier.price}${tier.unit}`}
      onPress={onPress}
      style={[styles.plan, selected && styles.planSel]}
    >
      {tier.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{tier.badge}</Text>
        </View>
      ) : null}
      <Text style={styles.planName}>{tier.name}</Text>
      <Text style={styles.planPrice}>
        {tier.price}
        <Text style={styles.planPriceSmall}>{tier.unit}</Text>
      </Text>
      <Text style={styles.pnote}>{tier.note}</Text>
    </Pressable>
  );
}

interface PaywallScreenProps {
  onComplete?: () => void;
}

export function PaywallScreen({ onComplete }: PaywallScreenProps) {
  const auth = useAuth();
  const { draft, submit } = useOnboarding();
  const now = useRef(new Date()).current;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set once submit() succeeds. Its presence flips the screen from the pitch UI to
  // the YourPlan celebration view, which holds the user until they tap Continue.
  const [submittedPlan, setSubmittedPlan] = useState<YourPlanTargets | null>(null);
  const plan = useMemo(() => buildPlanPreview(draft, now), [draft, now]);
  const [selected, setSelected] = useState<PlanId>("annual");

  const tier = TIERS.find((t) => t.id === selected) ?? TIERS[0];

  // Retention sheet shown when the user taps the X — one last $0 nudge before
  // letting them leave to the app (they can still subscribe in settings later).
  const [exitOpen, setExitOpen] = useState(false);
  const sheet = useRef(new Animated.Value(0)).current;

  const openExit = () => {
    setExitOpen(true);
    Animated.timing(sheet, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const closeExit = () => {
    Animated.timing(sheet, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
      () => setExitOpen(false),
    );
  };

  // Persist onboarding (POST /onboarding/complete) before leaving the flow. The
  // draft lives in OnboardingContext, so on failure we surface a retry and the
  // answers are NOT lost. onComplete() (App handler) then refreshes home data;
  // once the new profile arrives the router advances to the main app.
  const complete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const planTargets = await completePaywallOnboarding({
        submit,
        updateCachedUser: auth.updateCachedUser,
      });
      // Capture the backend-computed targets and switch to the celebration view.
      // We deliberately do NOT call onComplete() here — the user advances to the
      // app only when they tap Continue on YourPlanView. If the app is backgrounded
      // here, auth already reflects the backend's completed user state.
      setSubmittedPlan(planTargets);
      setSubmitting(false);
    } catch (e) {
      setSubmitError(extractApiError(e).message);
      setSubmitting(false);
    }
  };

  const startTrial = () => {
    // INTEGRATION POINT: trigger the RevenueCat purchase for `selected` first
    // (revenueCatService is currently a stub), then persist onboarding.
    void complete();
  };
  const skipForNow = () => {
    // Leave without subscribing → subscriptionStatus stays "free"; can upgrade in settings.
    closeExit();
    void complete();
  };

  // Once onboarding has been persisted, hold the user on the celebration view that
  // shows their computed plan. Continue (onComplete) is the only way forward.
  if (submittedPlan) {
    return <YourPlanView plan={submittedPlan} onContinue={() => onComplete?.()} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.closeRow}>
          <CloseButton onPress={openExit} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>YOUR PLAN IS READY</Text>
            <Text style={styles.h1}>Keep your muscle.{"\n"}Keep your face. Keep going.</Text>
          </View>

          <LinearGradient colors={["#EDEEE9", "#E5E7E0"]} style={styles.plancard}>
            <PlanRow label="Daily protein target" value={plan.dailyProteinLabel} />
            <PlanRow label="Workouts per week" value={plan.workoutsLabel} />
            <PlanRow label="Estimated goal date" value={plan.goalDateLabel} />
            <PlanRow
              hero
              label="Projected muscle retained"
              sub="vs typical GLP-1 loss"
              value={plan.muscleRetainedLabel}
            />
          </LinearGradient>

          <View style={styles.plans}>
            {TIERS.map((t) => (
              <PlanTier key={t.id} tier={t} selected={selected === t.id} onPress={() => setSelected(t.id)} />
            ))}
          </View>

          <Button label="Start my 7-day free trial" onPress={startTrial} style={styles.cta} loading={submitting} disabled={submitting} />
          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
          <Text style={styles.trialNote}>{tier.trialNote}</Text>

          <Pressable accessibilityRole="button" onPress={openExit} style={styles.notNow}>
            <Text style={styles.notNowText}>Not now</Text>
          </Pressable>

          <View style={styles.proof}>
            <View style={styles.stars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} />
              ))}
            </View>
            <Text style={styles.who}>4.8 ★ · Used by 40,000+ people on GLP-1</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {exitOpen ? (
        <View style={styles.overlay}>
          {/* Frosted "bridge" between the paywall and the app: heavy blur + paper
              wash so the paywall reads as abstract shapes, not a legible screen. */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: sheet }]}>
            <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.backdropTint} />
            <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={closeExit} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [460, 0] }) }] },
            ]}
          >
            <View style={styles.grabber} />
            <Text style={styles.sheetEyebrow}>BEFORE YOU GO</Text>
            <Text style={styles.sheetTitle}>Try it free — pay nothing today</Text>

            <View style={styles.zeroRow}>
              <Text style={styles.zero}>$0</Text>
              <Text style={styles.zeroUnit}>due today</Text>
            </View>
            <Text style={styles.sheetSub}>
              7 days free, then {tier.price}{tier.unit.trim()}. Cancel anytime — we'll remind you 2 days before it
              renews.
            </Text>

            <Button label="Start my 7-day free trial" onPress={startTrial} style={styles.sheetCta} loading={submitting} disabled={submitting} />
            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
            <Pressable accessibilityRole="button" onPress={skipForNow} disabled={submitting} style={styles.sheetSkip}>
              <Text style={styles.sheetSkipText}>I'll set it up in settings later</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  closeRow: { alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 6, height: 42 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.sageFill,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 24, paddingTop: 2, paddingBottom: 24 },
  titleBlock: { alignItems: "center", gap: 6 },
  eyebrow: {
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 1.08,
    color: colors.muted,
  },
  h1: {
    fontFamily: font.extrabold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: colors.ink,
    textAlign: "center",
  },
  // plan card
  plancard: {
    marginTop: 18,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#DCDDD5",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(24,28,24,0.08)",
  },
  rowKey: { flexDirection: "row", alignItems: "center", gap: 10 },
  pdot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  k: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  kSub: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 1 },
  v: { fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.17, color: colors.ink },
  rowHero: {
    backgroundColor: "rgba(47,184,122,0.10)",
    borderWidth: 1,
    borderColor: "rgba(47,184,122,0.25)",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 8,
    borderBottomWidth: 1,
  },
  kHero: { fontFamily: font.semibold, color: colors.ink },
  vHero: { fontFamily: font.bold, fontSize: 21, color: "#1B9D62" },
  // pricing tiers
  plans: { flexDirection: "row", gap: 10, marginTop: 16 },
  plan: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 2,
  },
  planSel: {
    borderColor: colors.emerald,
    backgroundColor: "rgba(47,184,122,0.07)",
  },
  planName: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  planPrice: { fontFamily: font.bold, fontSize: 21, letterSpacing: -0.42, color: colors.ink },
  planPriceSmall: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  pnote: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  badge: {
    position: "absolute",
    top: -9,
    right: 11,
    backgroundColor: colors.emerald,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    zIndex: 2,
  },
  badgeText: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: "#FFFFFF",
  },
  // cta + notes
  cta: { marginTop: 16 },
  trialNote: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 10,
  },
  notNow: { alignSelf: "center", paddingVertical: 8, marginTop: 2 },
  notNowText: { fontFamily: font.medium, fontSize: 14, color: colors.faint },
  submitError: { fontFamily: font.medium, fontSize: 13, color: "#C2554E", textAlign: "center", marginTop: 10 },
  // proof
  proof: { alignItems: "center", gap: 8, marginTop: 18 },
  stars: { flexDirection: "row", gap: 3 },
  who: { fontFamily: font.medium, fontSize: 12, letterSpacing: 0.24, color: colors.faint },
  // retention sheet
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  backdropTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(243,242,237,0.55)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    alignItems: "center",
    shadowColor: "rgba(12,16,11,1)",
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 24,
    shadowOpacity: 0.18,
    elevation: 16,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.faintest,
    marginBottom: 18,
  },
  sheetEyebrow: {
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 1.08,
    color: colors.muted,
  },
  sheetTitle: {
    fontFamily: font.extrabold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.6,
    color: colors.ink,
    textAlign: "center",
    marginTop: 8,
  },
  zeroRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 14 },
  zero: {
    fontFamily: font.light,
    fontWeight: "300",
    fontSize: 60,
    lineHeight: 62,
    letterSpacing: -1.8,
    color: colors.emeraldDeep,
  },
  zeroUnit: { fontFamily: font.medium, fontSize: 16, color: colors.muted, marginBottom: 10 },
  sheetSub: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.muted,
    textAlign: "center",
    marginTop: 10,
  },
  sheetCta: { marginTop: 20, alignSelf: "stretch" },
  sheetSkip: { paddingVertical: 12, marginTop: 4 },
  sheetSkipText: { fontFamily: font.medium, fontSize: 14, color: colors.faint },
});

export default PaywallScreen;
