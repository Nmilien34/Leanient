import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { SubscriptionStatus, Weekday } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { EditableAvatar } from "../../components/app/EditableAvatar";
import { SettingGroup } from "../../components/app/SettingsRow";
import { VerdictStatesScreen } from "./VerdictStatesScreen";
import { AccountScreen } from "./AccountScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";
import { MedicationScreen } from "./MedicationScreen";
import { RemindersScreen } from "./RemindersScreen";
import { UnitsScreen } from "./UnitsScreen";
import { AppleHealthScreen } from "./AppleHealthScreen";
import { PrivacyScreen } from "./PrivacyScreen";
import { HelpScreen } from "./HelpScreen";
import { SourcesScreen } from "./SourcesScreen";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockUser } from "../../mocks/user";
import { mockProfile, mockMedicationProtocol } from "../../mocks/home";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const Icons = {
  account: ic(<><Circle cx={12} cy={8} r={3.5} /><Path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>),
  card: ic(<><Rect x={3} y={6} width={18} height={13} rx={3} /><Path d="M3 10h18" /></>),
  pill: ic(<><Rect x={3} y={8} width={18} height={8} rx={4} /><Path d="M12 8v8" /></>),
  bell: ic(<Path d="M6 16V10a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" />),
  ruler: ic(<><Rect x={3} y={7} width={18} height={10} rx={2} /><Path d="M7 7v3M11 7v4M15 7v3M19 7v4" /></>),
  heart: ic(<Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />),
  shield: ic(<Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />),
  help: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M9.5 9.5a2.5 2.5 0 0 1 4 1.8c0 1.7-2.5 2-2.5 3.2M12 17.5v.5" /></>),
  verdict: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M8.3 12.4l2.4 2.4 4.9-5.2" /></>),
  book: ic(<><Path d="M5 4h11a2 2 0 0 1 2 2v13H7a2 2 0 0 0-2 2V4z" /><Path d="M9 8h6M9 12h6" /></>),
  out: (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.slate} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 4H6v16h8M10 12h10m0 0l-3-3m3 3l-3 3" />
    </Svg>
  ),
};

const SUB_LABEL: Record<SubscriptionStatus, string> = {
  free: "Free",
  trialing: "Free trial",
  active: "$29.99/yr",
  active_canceled: "Cancels soon",
  past_due: "Past due",
  canceled: "Expired",
  refunded: "Refunded",
};
const SUBSCRIBED: SubscriptionStatus[] = ["trialing", "active", "active_canceled"];
const WEEKDAY_ABBR: Record<Weekday, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

export function ProfileScreen() {
  const auth = useAuth();
  const data = useLeanientData();
  const [statesOpen, setStatesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [medicationOpen, setMedicationOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const user = auth.user ?? mockUser;
  const profile = data.profile ?? mockProfile;
  const medication = data.medicationProtocol ?? mockMedicationProtocol;

  const name = user.displayName ?? "Member";
  const subscribed = SUBSCRIBED.includes(user.subscriptionStatus);
  const units = profile.goalWeightUnit === "kg" ? "Metric" : "Imperial";

  const signOut = () => {
    auth.logout().catch(() => {
      // no-op in dev (no backend); clears local session when wired
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* header */}
          <View style={styles.phead}>
            <EditableAvatar size={60} />
            <View>
              <Text style={styles.pn}>{name}</Text>
              {user.email ? <Text style={styles.pe}>{user.email}</Text> : null}
              <View style={styles.pbadge}>
                <Text style={styles.pbadgeText}>● {subscribed ? "INTACT MEMBER" : "FREE PLAN"}</Text>
              </View>
            </View>
          </View>

          <SettingGroup
            rows={[
              { key: "account", icon: Icons.account, label: "Account", onPress: () => setAccountOpen(true) },
              { key: "subscription", icon: Icons.card, label: "Subscription", value: SUB_LABEL[user.subscriptionStatus], onPress: () => setSubscriptionOpen(true) },
              {
                key: "medication",
                icon: Icons.pill,
                label: "Medication & schedule",
                value: `${medication.medicationName} · ${medication.shotDays.map((d) => WEEKDAY_ABBR[d]).join(", ")}`,
                onPress: () => setMedicationOpen(true),
              },
            ]}
          />

          <Text style={styles.glabel}>PREFERENCES</Text>
          <SettingGroup
            rows={[
              { key: "reminders", icon: Icons.bell, label: "Reminders", value: "On", onPress: () => setRemindersOpen(true) },
              { key: "units", icon: Icons.ruler, label: "Units", value: units, onPress: () => setUnitsOpen(true) },
              { key: "health", icon: Icons.heart, label: "Apple Health", value: "Connected", onPress: () => setHealthOpen(true) },
            ]}
          />

          <Text style={styles.glabel}>SUPPORT</Text>
          <SettingGroup
            rows={[
              { key: "verdict", icon: Icons.verdict, label: "What your verdict means", onPress: () => setStatesOpen(true) },
              { key: "sources", icon: Icons.book, label: "Sources & citations", onPress: () => setSourcesOpen(true) },
              { key: "privacy", icon: Icons.shield, label: "Privacy & data", onPress: () => setPrivacyOpen(true) },
              { key: "help", icon: Icons.help, label: "Help & support", onPress: () => setHelpOpen(true) },
              { key: "signout", icon: Icons.out, label: "Sign out", onPress: signOut, danger: true },
            ]}
          />
        </ScrollView>
      </SafeAreaView>

      <VerdictStatesScreen visible={statesOpen} onClose={() => setStatesOpen(false)} />
      <AccountScreen visible={accountOpen} onClose={() => setAccountOpen(false)} />
      <SubscriptionScreen visible={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
      <MedicationScreen visible={medicationOpen} onClose={() => setMedicationOpen(false)} />
      <RemindersScreen visible={remindersOpen} onClose={() => setRemindersOpen(false)} />
      <UnitsScreen visible={unitsOpen} onClose={() => setUnitsOpen(false)} />
      <AppleHealthScreen visible={healthOpen} onClose={() => setHealthOpen(false)} />
      <PrivacyScreen visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <HelpScreen visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <SourcesScreen visible={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 120, paddingTop: 6 },
  phead: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  pn: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.42, color: colors.ink },
  pe: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 1 },
  pbadge: { alignSelf: "flex-start", marginTop: 5, backgroundColor: "rgba(47,184,122,0.12)", paddingVertical: 4, paddingHorizontal: 9, borderRadius: 8 },
  pbadgeText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.55, color: colors.emeraldDeep },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
});

export default ProfileScreen;
