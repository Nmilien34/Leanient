import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockMedicationProtocol } from "../../mocks/home";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { Switch } from "../../components/ui/Switch";
import { deriveReminderGroups, defaultReminderState, type ReminderIcon } from "./reminderSettings";
import {
  loadReminderState,
  saveReminderState,
  syncReminderNotifications,
  type ReminderPermissionStatus,
} from "../../services/reminderNotification.service";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const ICONS: Record<ReminderIcon, React.ReactNode> = {
  bell: ic(<Path d="M6 16V10a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" />),
  pill: ic(<><Rect x={3} y={8} width={18} height={8} rx={4} /><Path d="M12 8v8" /></>),
  heart: ic(<Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />),
  ruler: ic(<><Rect x={3} y={7} width={18} height={10} rx={2} /><Path d="M7 7v3M11 7v4M15 7v3M19 7v4" /></>),
  photo: ic(<><Rect x={3} y={6} width={18} height={14} rx={3} /><Circle cx={9} cy={11} r={2} /><Path d="M4 18l5-4 4 3 3-2 4 3" /></>),
};

interface RemindersScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Reminders (screen 27). Interactive local notification toggles
 * grouped by purpose. Preferences are persisted locally and synced to Expo's
 * scheduled notifications whenever the screen opens or a toggle changes.
 */
export function RemindersScreen({ visible, onClose }: RemindersScreenProps) {
  const data = useLeanientData();
  const medication = data.medicationProtocol ?? mockMedicationProtocol;
  const groups = useMemo(() => deriveReminderGroups({ medication }), [medication]);
  const [state, setState] = useState<Record<string, boolean>>(() => defaultReminderState(groups));
  const [permissionStatus, setPermissionStatus] = useState<ReminderPermissionStatus>("undetermined");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyReminderState = useCallback(
    async (nextState: Record<string, boolean>, previousState?: Record<string, boolean>) => {
      setState(nextState);
      setSyncing(true);
      setError(null);
      try {
        await saveReminderState(nextState);
        const result = await syncReminderNotifications(groups, nextState);
        setPermissionStatus(result.permissionStatus);
      } catch {
        if (previousState) setState(previousState);
        setError("Couldn't update reminders right now.");
      } finally {
        setSyncing(false);
      }
    },
    [groups],
  );

  useEffect(() => {
    if (!visible) return;
    let active = true;

    setSyncing(true);
    setError(null);
    loadReminderState(groups)
      .then(async (loaded) => {
        if (!active) return;
        setState(loaded);
        const result = await syncReminderNotifications(groups, loaded);
        if (!active) return;
        setPermissionStatus(result.permissionStatus);
      })
      .catch(() => {
        if (active) setError("Couldn't update reminders right now.");
      })
      .finally(() => {
        if (active) setSyncing(false);
      });

    return () => {
      active = false;
    };
  }, [groups, visible]);

  const toggle = (id: string, value: boolean) => {
    const nextState = { ...state, [id]: value };
    void applyReminderState(nextState, state);
  };

  const hasScheduledReminderOn = groups.some((group) =>
    group.items.some((item) => item.schedule.kind !== "none" && state[item.id]),
  );
  const statusText =
    error ??
    (!hasScheduledReminderOn
      ? "All scheduled reminders are off."
      : permissionStatus === "denied"
      ? "Notifications are off in your phone settings."
      : syncing
        ? "Updating reminders..."
        : "Reminders are scheduled on this phone.");

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
            <Text style={styles.headTitle}>Reminders</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.status, error && styles.statusError]}>{statusText}</Text>
            {groups.map((group) => (
              <View key={group.title}>
                <Text style={styles.glabel}>{group.title}</Text>
                <View style={styles.group}>
                  {group.items.map((item, i) => (
                    <View key={item.id}>
                      <View style={styles.row}>
                        <View style={styles.icon}>{ICONS[item.icon]}</View>
                        <View style={styles.flex}>
                          <Text style={styles.label}>{item.label}</Text>
                          <Text style={styles.subtitle}>{item.subtitle}</Text>
                        </View>
                        <Switch value={state[item.id]} onValueChange={(value) => toggle(item.id, value)} accessibilityLabel={item.label} />
                      </View>
                      {i < group.items.length - 1 ? <View style={styles.divider} /> : null}
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
  status: { fontFamily: font.regular, fontSize: 13, color: colors.muted, paddingHorizontal: 22, paddingTop: 16, lineHeight: 18 },
  statusError: { color: colors.amberDeep },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  group: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 15 },
  icon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  flex: { flex: 1 },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  subtitle: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 15 },
});

export default RemindersScreen;
