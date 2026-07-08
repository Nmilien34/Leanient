import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { Button } from "../../components/ui/Button";
import { SubscriptionLegal } from "../../components/app/SubscriptionLegal";
import { YourPlanView } from "../../components/YourPlanView";
import { useAuth } from "../../context/AuthContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { extractApiError } from "../../services/apiError";
import revenueCatService from "../../services/revenueCat.service";
import { buildPlanPreview } from "../../onboarding/planPreview";
import { startPaywallSubscription } from "../../onboarding/paywallPurchase";
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
  billingNote: string;
}

const TIERS: PlanTierDef[] = [
  {
    id: "annual",
    name: "Annual",
    price: "$29.99",
    unit: " /yr",
    note: "just $2.50/mo",
    badge: "SAVE 69%",
    billingNote: "Billed $29.99 yearly · cancel anytime",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$7.99",
    unit: " /mo",
    note: "billed monthly",
    billingNote: "Billed $7.99 monthly · cancel anytime",
  },
];

function Star() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill={colors.emerald}>
      <Path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
    </Svg>
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

function messageFromSubmitError(error: unknown): string {
  if ((error as { response?: unknown })?.response) {
    return extractApiError(error).message;
  }

  return error instanceof Error ? error.message : extractApiError(error).message;
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

  const startSubscription = () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    void startPaywallSubscription({
      user: auth.user,
      planId: selected,
      purchasePlan: (input) => revenueCatService.purchasePlan(input),
      submit,
      updateCachedUser: auth.updateCachedUser,
    })
      .then((result) => {
        if (result.status === "completed") {
          setSubmittedPlan(result.plan);
        } else if (result.status === "inactive") {
          setSubmitError("Purchase is still syncing. Try Restore in a moment to unlock Leanient.");
        }
      })
      .catch((e) => {
        setSubmitError(messageFromSubmitError(e));
      })
      .finally(() => {
        setSubmitting(false);
      });
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

          <Button label="Subscribe" onPress={startSubscription} style={styles.cta} loading={submitting} disabled={submitting} />
          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
          <Text style={styles.billingNote}>{tier.billingNote}</Text>

          <View style={styles.proof}>
            <View style={styles.stars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} />
              ))}
            </View>
            <Text style={styles.who}>4.8 ★ · Used by 40,000+ people on GLP-1</Text>
          </View>

          <SubscriptionLegal style={styles.legal} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
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
  billingNote: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 10,
  },
  submitError: { fontFamily: font.medium, fontSize: 13, color: "#C2554E", textAlign: "center", marginTop: 10 },
  // proof
  proof: { alignItems: "center", gap: 8, marginTop: 18 },
  stars: { flexDirection: "row", gap: 3 },
  who: { fontFamily: font.medium, fontSize: 12, letterSpacing: 0.24, color: colors.faint },
  legal: { marginTop: 20, paddingHorizontal: 8 },
});

export default PaywallScreen;
