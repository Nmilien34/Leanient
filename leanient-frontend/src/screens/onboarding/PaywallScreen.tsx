import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { Button } from "../../components/ui/Button";
import { SubscriptionLegal } from "../../components/app/SubscriptionLegal";
import { ReviewAskScreen } from "./ReviewAskScreen";
import { useAuth } from "../../context/AuthContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { extractApiError } from "../../services/apiError";
import revenueCatService from "../../services/revenueCat.service";
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
    <Svg width={15} height={15} viewBox="0 0 24 24" fill={colors.amber}>
      <Path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
    </Svg>
  );
}

/** The value stack (onboarding-v2 frame 16): the app they watched get built. */
const VALUE_ROWS = [
  { title: "A daily plan tuned to your shot cycle", sub: "green light days, defense days, reset days" },
  { title: "Your weekly muscle verdict", sub: "are you keeping it, and the one move if you're not" },
  { title: "A coach that answers anything", sub: "the questions you'd otherwise ask strangers online" },
  { title: "Doctor report", sub: "your whole journey, one page for your prescriber" },
] as const;

function ValueCheck() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l5 5 9-11" stroke={colors.emeraldDeep} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ValueRow({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={styles.vrow}>
      <View style={styles.vic}>
        <ValueCheck />
      </View>
      <View style={styles.flex}>
        <Text style={styles.vt}>{title}</Text>
        <Text style={styles.vs}>{sub}</Text>
      </View>
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set once submit() succeeds. Its presence flips the screen from the pitch UI to
  // the YourPlan celebration view, which holds the user until they tap Continue.
  const [submittedPlan, setSubmittedPlan] = useState<YourPlanTargets | null>(null);
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

  // Once onboarding has been persisted, the review ask lands at peak excitement
  // before the app opens (onboarding-v2 frame 17). Rate or "Not now" both
  // continue into the app.
  if (submittedPlan) {
    return <ReviewAskScreen onContinue={() => onComplete?.()} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>
              Lose the weight without losing <Text style={styles.h1Em}>yourself.</Text>
            </Text>
            <Text style={styles.h1Sub}>Your plan is built. Start it today.</Text>
          </View>

          <View style={styles.valueCard}>
            {VALUE_ROWS.map((row) => (
              <ValueRow key={row.title} title={row.title} sub={row.sub} />
            ))}
          </View>

          <View style={styles.plans}>
            {TIERS.map((t) => (
              <PlanTier key={t.id} tier={t} selected={selected === t.id} onPress={() => setSelected(t.id)} />
            ))}
          </View>

          <Button label="Start my plan" onPress={startSubscription} style={styles.cta} loading={submitting} disabled={submitting} />
          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
          <Text style={styles.billingNote}>{tier.billingNote}</Text>

          <View style={styles.testi}>
            <Text style={styles.testiQuote}>"Down 23 lb and I kept my strength. This app is why."</Text>
            <View style={styles.testiRow}>
              <View style={styles.stars}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} />
                ))}
              </View>
              <Text style={styles.who}>Martha · 58 · on Zepbound</Text>
            </View>
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
  h1: {
    fontFamily: font.extrabold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: colors.ink,
    textAlign: "center",
  },
  h1Em: { color: colors.emeraldDeep },
  h1Sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.muted, textAlign: "center", marginTop: 4 },
  // value stack
  valueCard: {
    marginTop: 18,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#DCDDD5",
    backgroundColor: colors.card,
  },
  vrow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  vic: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(47,184,122,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
  vt: { fontFamily: font.bold, fontSize: 14, letterSpacing: -0.14, color: colors.ink },
  vs: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 1 },
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
  // peer testimonial (onboarding-v2 frame 16)
  testi: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCDDD5",
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  testiQuote: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 19, letterSpacing: -0.1, color: colors.ink },
  testiRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stars: { flexDirection: "row", gap: 3 },
  who: { fontFamily: font.medium, fontSize: 12, letterSpacing: 0.24, color: colors.muted },
  legal: { marginTop: 20, paddingHorizontal: 8 },
});

export default PaywallScreen;
