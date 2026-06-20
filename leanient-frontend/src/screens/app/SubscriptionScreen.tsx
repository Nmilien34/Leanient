import React from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { mockUser } from "../../mocks/user";
import revenueCatService, { applyRevenueCatCustomerInfoToUser } from "../../services/revenueCat.service";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { SettingGroup } from "../../components/app/SettingsRow";
import { SubscriptionLegal } from "../../components/app/SubscriptionLegal";
import { deriveSubscription } from "./subscriptionMetrics";

/** RevenueCat config/offering errors are internal; never show their raw text to a user. */
function friendlyActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/offering|package|configur|store|fetch/i.test(message)) {
    return "Subscriptions aren't available right now. Please try again in a moment.";
  }
  return message || "Something went wrong. Please try again.";
}
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

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
        planId: "annual",
        appUserId: requireUserId(),
      });
      if (result.status === "cancelled") return;

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
      const managementUrl = customerInfo?.managementURL;
      if (!managementUrl) {
        throw new Error("Open your App Store subscriptions to manage billing.");
      }

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
              <Text style={styles.heroPlan}>{view.planLabel}</Text>
              <Text style={styles.heroPrice}>{view.priceLine}</Text>
              <Text style={styles.heroStatus}>{view.statusLine}</Text>
              <View style={styles.heroDivider} />
              {view.features.map((f) => (
                <View key={f} style={styles.feat}>
                  <FeatureCheck />
                  <Text style={styles.featText}>{f}</Text>
                </View>
              ))}
            </LinearGradient>

            {view.isSubscribed ? (
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
              accessibilityLabel={view.primaryActionLabel}
              onPress={handlePrimary}
              disabled={Boolean(busyAction)}
              style={[styles.btn2, busyAction && styles.btnDisabled]}
            >
              <Text style={styles.btn2Text}>
                {busyAction === "primary" ? "Starting..." : view.primaryActionLabel}
              </Text>
            </Pressable>
            {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}
            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

            {view.showCancel ? (
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
