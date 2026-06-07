import React from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { SettingGroup } from "../../components/app/SettingsRow";
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL } from "../../config";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const FAQ_URL = "https://leanient.app/faq";
const GUIDE_URL = "https://leanient.app/getting-started";
const VERDICT_URL = "https://leanient.app/how-the-verdict-works";
const APP_STORE_URL = "https://apps.apple.com/app/leanient";

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const Icons = {
  faq: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M9.5 9.5a2.5 2.5 0 0 1 4 1.8c0 1.7-2.5 2-2.5 3.2M12 17.5v.5" /></>),
  guide: ic(<><Path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2zM12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2h-6" /></>),
  verdict: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M8.3 12.4l2.4 2.4 4.9-5.2" /></>),
  report: ic(<><Path d="M12 9v4M12 17v.5" /><Path d="M10.3 4l-7 12a2 2 0 0 0 1.7 3h14a2 2 0 0 0 1.7-3l-7-12a2 2 0 0 0-3.4 0Z" /></>),
  rate: ic(<Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6L12 17l-5.4 2.8 1-6L3.2 9.5l6.1-.9z" />),
};

function Spark() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

interface HelpScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Help & support (screen 31). Coach contact, learn links, feedback,
 * and the app version (config-driven). Links open via `Linking`.
 */
export function HelpScreen({ visible, onClose }: HelpScreenProps) {
  const mailCoach = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Help with Leanient")}`);
  const reportProblem = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Problem report")}`);

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
            <Text style={styles.headTitle}>Help & support</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* coach */}
            <View style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.coachText}>Stuck on something? Message your coach and I'll get back to you within a day.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Message your coach" onPress={mailCoach} style={styles.btn2}>
                <Text style={styles.btn2Text}>Message your coach</Text>
              </Pressable>
            </View>

            <Text style={styles.glabel}>LEARN</Text>
            <SettingGroup
              rows={[
                { key: "faq", icon: Icons.faq, label: "FAQ", onPress: () => Linking.openURL(FAQ_URL) },
                { key: "guide", icon: Icons.guide, label: "Getting started guide", onPress: () => Linking.openURL(GUIDE_URL) },
                { key: "verdict", icon: Icons.verdict, label: "How the verdict works", onPress: () => Linking.openURL(VERDICT_URL) },
              ]}
            />

            <Text style={styles.glabel}>FEEDBACK</Text>
            <SettingGroup
              rows={[
                { key: "report", icon: Icons.report, label: "Report a problem", onPress: reportProblem },
                { key: "rate", icon: Icons.rate, label: `Rate ${APP_NAME}`, onPress: () => Linking.openURL(APP_STORE_URL) },
              ]}
            />

            <Text style={styles.version}>
              {APP_NAME} · Version {APP_VERSION}
            </Text>
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
  aicard: { marginHorizontal: 20, marginTop: 10, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16, backgroundColor: "rgba(47,184,122,0.06)" },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  btn2: { marginTop: 13, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.10)", borderWidth: 1.5, borderColor: "rgba(47,184,122,0.35)" },
  btn2Text: { fontFamily: font.semibold, fontSize: 15, color: colors.emeraldDeep },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  version: { fontFamily: font.semibold, fontSize: 12, color: colors.faint, textAlign: "center", paddingTop: 22 },
});

export default HelpScreen;
