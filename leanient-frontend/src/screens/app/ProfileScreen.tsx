import React, { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { TargetsScreen } from "./TargetsScreen";
import { FaceAnalysisConsentScreen } from "./FaceAnalysisConsentScreen";
import { CoachStyleScreen } from "./CoachStyleScreen";
import { PhotoDaySettingScreen } from "./PhotoDaySettingScreen";
import { DoctorReportScreen } from "./DoctorReportScreen";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockUser } from "../../mocks/user";
import { mockProfile, mockMedicationProtocol } from "../../mocks/home";
import { computeStreak, loadStreakStore } from "./streak";
import { loadPermissionStatuses, type PermissionStatuses } from "./permissionsStatus";
import { COMMUNITY_LINKS, loadCoachStyle, loadPhotoDay, type CoachStyle, type PhotoDay } from "./settingsPrefs";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ic = (children: React.ReactNode, color: string = colors.emeraldDeep) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const Icons = {
  account: ic(<><Circle cx={12} cy={8} r={3.5} /><Path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>),
  card: ic(<><Rect x={3} y={6} width={18} height={13} rx={3} /><Path d="M3 10h18" /></>),
  syringe: ic(<Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" />),
  flag: ic(<Path d="M6 21V4M6 4h11l-2 4 2 4H6" />),
  fork: ic(<Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" />),
  cam: ic(<><Path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Circle cx={12} cy={13} r={3.4} /></>),
  spark: ic(<Path d="M12 3l1.7 6.1L20 11l-6.3 1.9L12 19l-1.7-6.1L4 11l6.3-1.9z" />),
  cal: ic(<><Rect x={4} y={5} width={16} height={16} rx={3} /><Path d="M4 10h16M9 3v4M15 3v4" /></>, colors.muted),
  bell: ic(<Path d="M6 16V10a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" />, colors.amberDeep),
  doc: ic(<Path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />, colors.amberDeep),
  discord: (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Path
        fill="#5865F2"
        d="M19.3 5.6A16.9 16.9 0 0 0 15.1 4.3l-.5 1a15.6 15.6 0 0 0-5.2 0l-.5-1c-1.5.3-2.9.7-4.2 1.4C2.3 9.2 1.7 12.7 2 16.1c1.6 1.2 3.2 1.9 4.7 2.4l1-1.6c-.5-.2-1-.5-1.5-.8l.4-.3c2.9 1.4 6 1.4 8.8 0l.4.3c-.5.3-1 .6-1.5.8l1 1.6c1.5-.5 3.1-1.2 4.7-2.4.4-3.9-.6-7.3-2.7-10.5zM9.7 14.1c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm4.6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z"
      />
    </Svg>
  ),
  whatsapp: (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Path fill="#25D366" d="M12 2.5a9.3 9.3 0 0 0-8 14L2.6 21l4.7-1.2A9.3 9.3 0 1 0 12 2.5z" />
      <Path
        fill="#fff"
        d="M9.2 7.4c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4C6.8 7.6 6.2 8.2 6.2 9.4s.9 2.4 1 2.6c.1.2 1.7 2.8 4.3 3.8 2.1.8 2.6.7 3 .6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5L9.2 7.4z"
      />
    </Svg>
  ),
  ruler: ic(<><Rect x={3} y={7} width={18} height={10} rx={2} /><Path d="M7 7v3M11 7v4M15 7v3M19 7v4" /></>, colors.muted),
  heart: ic(<Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />, colors.muted),
  shield: ic(<Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />, colors.muted),
  download: ic(<Path d="M12 4v10M8 10l4 4 4-4M5 19h14" />, colors.muted),
  face: ic(<><Circle cx={12} cy={12} r={8} /><Path d="M9 10h.01M15 10h.01M9 15c1 .8 2 1.2 3 1.2s2-.4 3-1.2" /></>, colors.muted),
  help: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M9.5 9.5a2.5 2.5 0 0 1 4 1.8c0 1.7-2.5 2-2.5 3.2M12 17.5v.5" /></>, colors.muted),
  verdict: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M8.3 12.4l2.4 2.4 4.9-5.2" /></>, colors.muted),
  book: ic(<><Path d="M5 4h11a2 2 0 0 1 2 2v13H7a2 2 0 0 0-2 2V4z" /><Path d="M9 8h6M9 12h6" /></>, colors.muted),
  sprout: (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21v-8" />
      <Path d="M12 13c0-4 3-6.5 8-6.5-.8 4.5-3.5 6.5-8 6.5z" />
      <Path d="M12 13c0-3-2-4.5-5.5-4.5.7 3.5 2.7 4.5 5.5 4.5z" />
    </Svg>
  ),
  out: (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.slate} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 4H6v16h8M10 12h10m0 0l-3-3m3 3l-3 3" />
    </Svg>
  ),
};

const SUB_LABEL: Record<SubscriptionStatus, string> = {
  free: "Free",
  trialing: "Free trial",
  active: "Active",
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

const PHOTO_DAY_LABEL: Record<PhotoDay, string> = {
  shot_day: "Shot day",
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

function daysSince(dateStr: string, now: Date): number {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((now.getTime() - d.getTime()) / 86_400_000));
}

/**
 * Settings hub (settings board frame 01): the control room. The header
 * carries the journey, YOUR PLAN makes every onboarding choice editable,
 * YOUR COACH owns voice/reminders/doctor report, and every row routes to a
 * real screen or the OS.
 */
export function ProfileScreen() {
  const auth = useAuth();
  const data = useLeanientData();
  const now = new Date();
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
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [photoDayOpen, setPhotoDayOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [coachStyle, setCoachStyle] = useState<CoachStyle>("gentle");
  const [photoDay, setPhotoDay] = useState<PhotoDay>("shot_day");
  const [streakDays, setStreakDays] = useState(0);
  const [perms, setPerms] = useState<PermissionStatuses | null>(null);

  useEffect(() => {
    let alive = true;
    void loadCoachStyle().then((s) => alive && setCoachStyle(s));
    void loadPhotoDay().then((d) => alive && setPhotoDay(d));
    void loadStreakStore().then((store) => alive && setStreakDays(computeStreak(store, new Date()).days));
    void loadPermissionStatuses().then((p) => alive && setPerms(p));
    return () => {
      alive = false;
    };
  }, []);

  const user = auth.user ?? mockUser;
  const profile = data.profile ?? mockProfile;
  const medication = data.medicationProtocol ?? mockMedicationProtocol;

  const name = user.displayName ?? "Member";
  const subscribed = SUBSCRIBED.includes(user.subscriptionStatus);
  const units = profile.goalWeightUnit === "kg" ? "Metric" : "Imperial";

  // Journey chips: streak, day on med, pounds down — all real.
  const dayOnMed = medication.startDate ? daysSince(medication.startDate, now) : null;
  const sortedWeights = [...data.weightLogs].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
  const lost =
    sortedWeights.length >= 2
      ? Math.round(sortedWeights[0].value - sortedWeights[sortedWeights.length - 1].value)
      : 0;

  const paceLabel = profile.goalPace.charAt(0).toUpperCase() + profile.goalPace.slice(1);

  const signOut = () => {
    auth.logout().catch(() => {
      // no-op in dev (no backend); clears local session when wired
    });
  };

  const openSystemSettings = () => void Linking.openSettings();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* identity header: the journey, not admin */}
          <View style={styles.phead}>
            <EditableAvatar size={60} />
            <View style={styles.pinfo}>
              <Text style={styles.pn}>{name}</Text>
              <View style={styles.chips}>
                {streakDays > 0 ? (
                  <View style={[styles.chip, styles.chipEm]}>
                    {Icons.sprout}
                    <Text style={[styles.chipText, styles.chipTextEm]}>{streakDays} days</Text>
                  </View>
                ) : null}
                {dayOnMed != null ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>Day {dayOnMed} · {medication.medicationName}</Text>
                  </View>
                ) : null}
                {lost >= 1 ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>↓ {lost} {profile.goalWeightUnit}</Text>
                  </View>
                ) : null}
                {streakDays === 0 && dayOnMed == null && lost < 1 ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{subscribed ? "Intact member" : "Free plan"}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <Text style={styles.glabel}>YOUR PLAN</Text>
          <SettingGroup
            rows={[
              {
                key: "medication",
                icon: Icons.syringe,
                label: "Medication",
                value: `${medication.medicationName}${medication.doseAmount != null ? ` ${medication.doseAmount} ${medication.doseUnit}` : ""} · ${medication.shotDays.map((d) => WEEKDAY_ABBR[d]).join(", ")}`,
                valueTone: "em",
                onPress: () => setMedicationOpen(true),
              },
              {
                key: "goal",
                icon: Icons.flag,
                label: "Goal",
                value: `${profile.goalWeight} ${profile.goalWeightUnit} · ${paceLabel}`,
                onPress: () => setTargetsOpen(true),
              },
              {
                key: "targets",
                icon: Icons.fork,
                label: "Daily targets",
                value: `${profile.dailyProteinTarget}g · ${profile.weeklyWorkoutTarget} sessions`,
                onPress: () => setTargetsOpen(true),
              },
              {
                key: "photoday",
                icon: Icons.cam,
                label: "Photo day",
                value: PHOTO_DAY_LABEL[photoDay],
                onPress: () => setPhotoDayOpen(true),
              },
            ]}
          />

          <Text style={styles.glabel}>YOUR COACH</Text>
          <SettingGroup
            rows={[
              {
                key: "style",
                icon: Icons.spark,
                label: "Coach style",
                value: coachStyle === "gentle" ? "Gentle" : "Straight",
                valueTone: "em",
                onPress: () => setStyleOpen(true),
              },
              { key: "checkin", icon: Icons.cal, label: "Check-in day", value: "Sunday" },
              { key: "reminders", icon: Icons.bell, label: "Reminders", value: "Cycle-aware", onPress: () => setRemindersOpen(true) },
              {
                key: "report",
                icon: Icons.doc,
                label: "Doctor report",
                sub: "One page for your prescriber",
                badge: "NEW",
                onPress: () => setReportOpen(true),
              },
            ]}
          />

          <Text style={styles.glabel}>COMMUNITY · JOIN OUR CHANNELS</Text>
          <SettingGroup
            rows={[
              {
                key: "discord",
                icon: Icons.discord,
                label: "Discord",
                sub: "Daily wins, questions, the team",
                value: "Join",
                valueTone: "em",
                onPress: () => void Linking.openURL(COMMUNITY_LINKS.discord),
              },
              {
                key: "whatsapp",
                icon: Icons.whatsapp,
                label: "WhatsApp",
                sub: "Announcements and tips",
                value: "Join",
                valueTone: "em",
                onPress: () => void Linking.openURL(COMMUNITY_LINKS.whatsapp),
              },
            ]}
          />

          <Text style={styles.glabel}>PREFERENCES</Text>
          <SettingGroup
            rows={[
              { key: "units", icon: Icons.ruler, label: "Units", value: units, onPress: () => setUnitsOpen(true) },
              { key: "health", icon: Icons.heart, label: "Apple Health", value: "Connected", onPress: () => setHealthOpen(true) },
            ]}
          />

          <Text style={styles.glabel}>PRIVACY & DATA</Text>
          <SettingGroup
            rows={[
              { key: "privacy", icon: Icons.shield, label: "Privacy & data", onPress: () => setPrivacyOpen(true) },
              { key: "export", icon: Icons.download, label: "Export my data", onPress: () => setPrivacyOpen(true) },
              { key: "face", icon: Icons.face, label: "Face analysis", onPress: () => setFaceOpen(true) },
            ]}
          />

          <Text style={styles.glabel}>PERMISSIONS</Text>
          <SettingGroup
            rows={[
              {
                key: "notif",
                icon: Icons.bell,
                label: "Notifications",
                sub: "Reminders and your Sunday verdict",
                value: perms?.notifications ?? "…",
                valueTone: perms?.notifications === "Allowed" ? "em" : undefined,
                onPress: openSystemSettings,
              },
              {
                key: "camera",
                icon: Icons.cam,
                label: "Camera",
                sub: "Meal scan, barcodes, progress photos",
                value: perms?.camera ?? "…",
                valueTone: perms?.camera === "Allowed" ? "em" : undefined,
                onPress: openSystemSettings,
              },
              {
                key: "photos",
                icon: Icons.download,
                label: "Photo library",
                sub: "Saving your progress photos",
                value: perms?.photos ?? "…",
                valueTone: perms?.photos === "Allowed" ? "em" : undefined,
                onPress: openSystemSettings,
              },
            ]}
          />

          <Text style={styles.glabel}>SUPPORT</Text>
          <SettingGroup
            rows={[
              { key: "verdict", icon: Icons.verdict, label: "What your verdict means", onPress: () => setStatesOpen(true) },
              { key: "sources", icon: Icons.book, label: "Sources & citations", onPress: () => setSourcesOpen(true) },
              { key: "help", icon: Icons.help, label: "Help & support", onPress: () => setHelpOpen(true) },
            ]}
          />

          <Text style={styles.glabel}>ACCOUNT</Text>
          <SettingGroup
            rows={[
              { key: "account", icon: Icons.account, label: "Account", value: user.email ?? undefined, onPress: () => setAccountOpen(true) },
              {
                key: "subscription",
                icon: Icons.card,
                label: "Subscription",
                value: SUB_LABEL[user.subscriptionStatus],
                valueTone: subscribed ? "em" : undefined,
                onPress: () => setSubscriptionOpen(true),
              },
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
      <TargetsScreen visible={targetsOpen} onClose={() => setTargetsOpen(false)} />
      <FaceAnalysisConsentScreen visible={faceOpen} onClose={() => setFaceOpen(false)} />
      <CoachStyleScreen visible={styleOpen} onClose={() => setStyleOpen(false)} onChanged={setCoachStyle} />
      <PhotoDaySettingScreen visible={photoDayOpen} onClose={() => setPhotoDayOpen(false)} onChanged={setPhotoDay} />
      <DoctorReportScreen visible={reportOpen} onClose={() => setReportOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 130, paddingTop: 6 },
  phead: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  pinfo: { flex: 1 },
  pn: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.42, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.sageFill,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  chipEm: { backgroundColor: "rgba(47,184,122,0.12)" },
  chipText: { fontFamily: font.bold, fontSize: 11, letterSpacing: -0.05, color: colors.muted },
  chipTextEm: { color: colors.emeraldDeep },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
});

export default ProfileScreen;
