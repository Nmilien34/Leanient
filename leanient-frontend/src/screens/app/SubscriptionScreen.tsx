import React from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { mockUser } from "../../mocks/user";
import revenueCatService, {
  applyRevenueCatCustomerInfoToUser,
  hasActiveEntitlement,
} from "../../services/revenueCat.service";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { SettingGroup } from "../../components/app/SettingsRow";
import { SubscriptionLegal } from "../../components/app/SubscriptionLegal";
import { deriveSubscription } from "./subscriptionMetrics";

/** RevenueCat config/offering errors are internal; never show their raw text to a user. */
function friendlyActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/offering|package|configur|\bstore\b|fetch/i.test(message)) {
    return "Subscriptions aren't available right now. Please try again in a moment.";
  }
  return message || "Something went wrong. Please try again.";
}
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

export const APP_STORE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

type SubscriptionPlanId = "annual" | "monthly";

const SUBSCRIPTION_PLANS: Array<{
  id: SubscriptionPlanId;
  title: string;
  heroLabel: string;
  price: string;
  note: string;
  heroNote: string;
  badge?: string;
}> = [
  {
    id: "annual",
    title: "Annual",
    heroLabel: "INTACT · ANNUAL",
    price: "$29.99 / yr",
    note: "$2.50 / mo",
    heroNote: "Billed yearly · $2.50 / mo",
    badge: "Best value",
  },
  {
    id: "monthly",
    title: "Monthly",
    heroLabel: "INTACT · MONTHLY",
    price: "$7.99 / mo",
    note: "Billed monthly",
    heroNote: "Billed monthly",
  },
];

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const Icons = {
  card: ic(<><Rect x={3} y={6} width={18} height={13} rx={3} /><Path d="M3 10h18" /></>),
  restore: ic(<Path d="M4 12a8 8 0 1 1 2.3 5.6M4 12V7M4 12h5" />),
};

function FeatureCheck() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#7FE3AB" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}

interface SubscriptionScreenProps {
  visible: boolean;
  onClose: () => void;
  onManage?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
  onPrimary?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Settings · Subscription (screen 25). Status-driven plan hero + features, with
 * billing handled where it actually lives (the App Store), all from the user's
 * subscription fields via `deriveSubscription`.
 */
export function SubscriptionScreen({ visible, onClose, onManage, onRestore, onPrimary, onCancel }: SubscriptionScreenProps) {
  const auth = useAuth();
  const user = auth.user ?? mockUser;
  const view = deriveSubscription(user);
  const [busyAction, setBusyAction] = React.useState<"primary" | "restore" | "manage" | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<SubscriptionPlanId>("annual");
  const selectedPlanView = SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlan) ?? SUBSCRIPTION_PLANS[0];
  const legacyTrialAccess = user.subscriptionStatus === "trialing";
  const canManageBilling = view.isSubscribed && !legacyTrialAccess;
  const primaryActionLabel = legacyTrialAccess || !view.isSubscribed ? "Upgrade" : view.primaryActionLabel;
  const heroStatusLine = canManageBilling ? view.statusLine : selectedPlanView.heroNote;

  const runSubscriptionAction = async (
    action: "primary" | "restore" | "manage",
    task: () => Promise<void>,
  ) => {
    if (busyAction) return;

    setBusyAction(action);
    setActionError(null);
    setActionMessage(null);
    try {
      await task();
    } catch (error) {
      setActionError(friendlyActionError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const currentUser = auth.user;
  const requireUserId = () => {
    if (!currentUser?.id) {
      throw new Error("Sign in again to manage your subscription.");
    }

    return currentUser.id;
  };

  const refreshCachedSubscription = async (customerInfo: Parameters<typeof applyRevenueCatCustomerInfoToUser>[1]) => {
    if (!currentUser) return;

    await auth.updateCachedUser(applyRevenueCatCustomerInfoToUser(currentUser, customerInfo));
    void auth.refreshMe().catch(() => {
      // RevenueCat webhooks can take a moment; the local RevenueCat customer info
      // keeps the UI honest while the backend catches up.
    });
  };

  const handlePrimary = () => {
    void runSubscriptionAction("primary", async () => {
      if (onPrimary) {
        await onPrimary();
        return;
      }

      const result = await revenueCatService.purchasePlan({
        planId: selectedPlan,
        appUserId: requireUserId(),
      });
      if (result.status === "cancelled") return;
      if (!hasActiveEntitlement(result.customerInfo)) {
        throw new Error("Purchase is still syncing. Try Restore in a moment to unlock Leanient.");
      }

      await refreshCachedSubscription(result.customerInfo);
      setActionMessage("Subscription updated.");
    });
  };

  const handleRestore = () => {
    void runSubscriptionAction("restore", async () => {
      if (onRestore) {
        await onRestore();
        return;
      }

      const customerInfo = await revenueCatService.restorePurchases(requireUserId());
      await refreshCachedSubscription(customerInfo);
      setActionMessage(
        Object.keys(customerInfo.entitlements.active).length
          ? "Purchases restored."
          : "No active purchases found.",
      );
    });
  };

  const handleManage = () => {
    void runSubscriptionAction("manage", async () => {
      if (onManage) {
        await onManage();
        return;
      }

      const customerInfo = await revenueCatService.syncSubscriptionStatus(requireUserId());
      const managementUrl = customerInfo?.managementURL || APP_STORE_SUBSCRIPTIONS_URL;

      await Linking.openURL(managementUrl);
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Back" onPress={onClose} style={styles.backBtn}>
              <Svg width={10} height={17} viewBox="0 0 10 17" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M8.5 1.5L1.5 8.5l7 7" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Subscription</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* plan hero */}
            <LinearGradient colors={["#1f6f4a", "#123b29"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
              <Text style={styles.heroPlan}>{selectedPlanView.heroLabel}</Text>
              <Text style={styles.heroPrice}>{selectedPlanView.price}</Text>
              <Text style={styles.heroStatus}>{heroStatusLine}</Text>
              <View style={styles.heroDivider} />
              {view.features.map((f) => (
                <View key={f} style={styles.feat}>
                  <FeatureCheck />
                  <Text style={styles.featText}>{f}</Text>
                </View>
              ))}
            </LinearGradient>

            <Text style={styles.glabel}>PLANS</Text>
            <View style={styles.planGrid}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const selected = selectedPlan === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    accessibilityRole="button"
                    accessibilityLabel={plan.title}
                    onPress={() => setSelectedPlan(plan.id)}
                    disabled={Boolean(busyAction)}
                    style={[styles.planCard, selected && styles.planCardSelected]}
                  >
                    <View style={styles.planTop}>
                      <Text style={[styles.planTitle, selected && styles.planTitleSelected]}>{plan.title}</Text>
                      {plan.badge ? <Text style={styles.planBadge}>{plan.badge}</Text> : null}
                    </View>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planNote}>{plan.note}</Text>
                  </Pressable>
                );
              })}
            </View>

            {canManageBilling ? (
              <>
                <Text style={styles.glabel}>BILLING</Text>
                <SettingGroup
                  rows={[
                    { key: "manage", icon: Icons.card, label: "Manage in App Store", value: busyAction === "manage" ? "Opening..." : "Payment · history", onPress: handleManage },
                    { key: "restore", icon: Icons.restore, label: "Restore purchases", value: busyAction === "restore" ? "Restoring..." : undefined, onPress: handleRestore },
                  ]}
                />
              </>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={primaryActionLabel}
              onPress={handlePrimary}
              disabled={Boolean(busyAction)}
              style={[styles.btn2, busyAction && styles.btnDisabled]}
            >
              <Text style={styles.btn2Text}>
                {busyAction === "primary" ? "Starting..." : primaryActionLabel}
              </Text>
            </Pressable>
            {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}
            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

            {view.showCancel && !legacyTrialAccess ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel subscription" onPress={onCancel} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel subscription</Text>
              </Pressable>
            ) : null}

            <SubscriptionLegal style={styles.legal} />
          </ScrollView>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hero: { marginHorizontal: 20, marginTop: 14, borderRadius: 20, padding: 18 },
  heroPlan: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1.15, color: "#9FE8C0" },
  heroPrice: { fontFamily: font.extrabold, fontSize: 24, letterSpacing: -0.48, color: "#F4FBF6", marginTop: 7 },
  heroStatus: { fontFamily: font.regular, fontSize: 13, color: "rgba(244,251,246,0.78)", marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.16)", marginTop: 14, marginBottom: 12 },
  feat: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 9 },
  featText: { fontFamily: font.medium, fontSize: 13.5, color: "rgba(244,251,246,0.92)" },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  planGrid: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 8 },
  planCard: { flex: 1, minHeight: 98, borderRadius: 16, borderWidth: 1, borderColor: "rgba(39,70,52,0.12)", backgroundColor: "rgba(255,255,255,0.70)", padding: 13 },
  planCardSelected: { borderColor: "rgba(47,184,122,0.55)", backgroundColor: "rgba(47,184,122,0.08)" },
  planTop: { minHeight: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  planTitle: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  planTitleSelected: { color: colors.emeraldDeep },
  planBadge: { flexShrink: 0, overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(47,184,122,0.12)", paddingHorizontal: 7, paddingVertical: 3, fontFamily: font.bold, fontSize: 9.5, color: colors.emeraldDeep },
  planPrice: { marginTop: 10, fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  planNote: { marginTop: 4, fontFamily: font.medium, fontSize: 12, color: colors.muted },
  btn2: { marginHorizontal: 20, marginTop: 18, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.10)", borderWidth: 1.5, borderColor: "rgba(47,184,122,0.35)" },
  btnDisabled: { opacity: 0.65 },
  btn2Text: { fontFamily: font.semibold, fontSize: 15, color: colors.emeraldDeep },
  actionMessage: { marginTop: 10, marginHorizontal: 24, fontFamily: font.medium, fontSize: 13, color: colors.emeraldDeep, textAlign: "center" },
  actionError: { marginTop: 10, marginHorizontal: 24, fontFamily: font.medium, fontSize: 13, color: "#B5534B", textAlign: "center" },
  cancel: { alignItems: "center", paddingVertical: 16 },
  cancelText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  legal: { marginTop: 18, marginHorizontal: 24 },
});

export default SubscriptionScreen;
