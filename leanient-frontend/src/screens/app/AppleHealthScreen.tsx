import React, { useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { Switch } from "../../components/ui/Switch";
import { HEALTH_DATA_TYPES, defaultHealthSyncState, relativeSyncLabel, type HealthIcon } from "./healthSettings";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const ICONS: Record<HealthIcon, React.ReactNode> = {
  weight: ic(<><Rect x={3} y={7} width={18} height={10} rx={2} /><Path d="M7 7v3M11 7v4M15 7v3M19 7v4" /></>),
  workouts: ic(<Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />),
  steps: ic(<Path d="M7 4v8a3 3 0 0 0 6 0M17 20v-8a3 3 0 0 0-6 0" />),
  energy: ic(<Path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />),
  bodyfat: ic(<><Circle cx={12} cy={7} r={3.2} /><Path d="M6 21c0-3.5 2.7-6 6-6s6 2.5 6 6" /></>),
};

interface AppleHealthScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Apple Health (screen 29). Master connection + per-type sync
 * toggles (device-side / local) and a live "last synced" relative time. When
 * disconnected, the sync list collapses to a connect prompt.
 */
export function AppleHealthScreen({ visible, onClose }: AppleHealthScreenProps) {
  const now = useRef(new Date()).current;
  // Demo: synced 2 minutes ago so the relative label reads naturally.
  const lastSyncedAt = useMemo(() => new Date(now.getTime() - 2 * 60 * 1000).toISOString(), [now]);
  const [connected, setConnected] = useState(true);
  const [sync, setSync] = useState<Record<string, boolean>>(() => defaultHealthSyncState());

  const toggleSync = (id: string) => setSync((s) => ({ ...s, [id]: !s[id] }));

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
            <Text style={styles.headTitle}>Apple Health</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* connection card */}
            <View style={styles.card}>
              <View style={styles.frow}>
                <LinearGradient colors={["#FF6B8A", "#E0405F"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
                    <Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
                  </Svg>
                </LinearGradient>
                <View style={styles.flex}>
                  <Text style={styles.ftitle}>{connected ? "Connected" : "Not connected"}</Text>
                  <Text style={styles.fsub}>
                    {connected ? `Last synced ${relativeSyncLabel(lastSyncedAt, now)}` : "Connect to sharpen your verdict"}
                  </Text>
                </View>
                <Switch value={connected} onValueChange={setConnected} accessibilityLabel="Apple Health connection" />
              </View>
            </View>

            {connected ? (
              <>
                <Text style={styles.glabel}>SYNC THESE</Text>
                <View style={styles.group}>
                  {HEALTH_DATA_TYPES.map((t, i) => (
                    <View key={t.id}>
                      <View style={styles.row}>
                        <View style={styles.icon}>{ICONS[t.icon]}</View>
                        <Text style={styles.label}>{t.label}</Text>
                        <Switch value={sync[t.id]} onValueChange={() => toggleSync(t.id)} accessibilityLabel={t.label} />
                      </View>
                      {i < HEALTH_DATA_TYPES.length - 1 ? <View style={styles.divider} /> : null}
                    </View>
                  ))}
                </View>

                <Pressable accessibilityRole="button" accessibilityLabel="Open Health settings" style={styles.linkWrap}>
                  <Text style={styles.link}>Open Health settings</Text>
                </Pressable>
                <Text style={styles.disc}>Leanient reads these to sharpen your verdict. Manage permissions anytime in the Health app.</Text>
              </>
            ) : (
              <Text style={styles.disc}>When connected, Leanient reads your weight, workouts, and activity to sharpen your weekly verdict.</Text>
            )}
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
  card: { marginHorizontal: 20, marginTop: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  frow: { flexDirection: "row", alignItems: "center", gap: 13 },
  fic: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  ftitle: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: colors.ink },
  fsub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
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
  label: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 15 },
  linkWrap: { alignItems: "center", paddingTop: 18 },
  link: { fontFamily: font.bold, fontSize: 14, color: colors.emeraldDeep },
  disc: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: colors.faint, textAlign: "center", paddingHorizontal: 28, paddingTop: 14 },
});

export default AppleHealthScreen;
