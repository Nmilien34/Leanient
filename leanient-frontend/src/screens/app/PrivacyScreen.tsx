import React, { useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path } from "react-native-svg";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useAuth } from "../../context/AuthContext";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { SettingGroup } from "../../components/app/SettingsRow";
import { Switch } from "../../components/ui/Switch";
import { ProgressPhotoDownloadScreen } from "./ProgressPhotoDownloadScreen";
import { FaceAnalysisConsentScreen } from "./FaceAnalysisConsentScreen";
import { isFaceDetectionAvailable } from "./faceLandmarks";
import { faceConsentState } from "./faceConsent";
import { buildPrivacyDataExportPayload, buildPrivacyDataExportShareContent } from "./privacyDataExport";
import { SHARING_TOGGLES, defaultSharingState, photosLabel, type SharingIcon } from "./privacySettings";
import { PRIVACY_URL, TERMS_URL } from "../../config";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const Icons = {
  shield: ic(<Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />),
  download: ic(<Path d="M12 4v10m0 0l-4-4m4 4l4-4M5 20h14" />),
  heart: ic(<Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />),
  face: ic(
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0" />
    </>,
  ),
  trash: (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#C2554E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  ),
};
const SHARING_ICONS: Record<SharingIcon, React.ReactNode> = {
  shield: ic(<Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />),
  heart: ic(<Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />),
};

interface PrivacyScreenProps {
  visible: boolean;
  onClose: () => void;
  onExport?: () => void;
  onDownloadPhotos?: () => void;
  onDeleteAll?: () => void;
}

/**
 * Settings · Privacy & data (screen 30). Data export/download, sharing toggles
 * (local), and destructive delete-all. The progress-photo count is live from
 * the user's photos.
 */
export function PrivacyScreen({ visible, onClose, onExport, onDownloadPhotos, onDeleteAll }: PrivacyScreenProps) {
  const data = useLeanientData();
  const auth = useAuth();
  const photoCount = data.progressPhotos.length;
  const [sharing, setSharing] = useState<Record<string, boolean>>(() => defaultSharingState());
  const [photosOpen, setPhotosOpen] = useState(false);
  const [faceConsentOpen, setFaceConsentOpen] = useState(false);
  // The on-device measurement only exists in a build with the native module, so
  // its control only appears there.
  const showFaceTracking = isFaceDetectionAvailable();
  const faceConsent = faceConsentState(auth.user);

  const toggle = (id: string) => setSharing((s) => ({ ...s, [id]: !s[id] }));
  const exportData = async () => {
    const payload = buildPrivacyDataExportPayload({
      profile: data.profile,
      medicationProtocol: data.medicationProtocol,
      latestVerdictStatus: data.latestVerdictStatus,
      latestVerdictMessage: data.latestVerdictMessage,
      latestVerdict: data.latestVerdict,
      weightLogs: data.weightLogs,
      recentDoseLogs: data.recentDoseLogs,
      todaysMeals: data.todaysMeals,
      todaysWorkouts: data.todaysWorkouts,
      progressOverview: data.progressOverview,
      trainingToday: data.trainingToday,
      progressPhotos: data.progressPhotos,
    });

    try {
      await Share.share(buildPrivacyDataExportShareContent(payload));
    } catch {
      Alert.alert("Export could not start", "Try again in a moment.");
    }
  };
  const openPhotos = () => {
    setPhotosOpen(true);
    void data.refreshProgressPhotos();
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
            <Text style={styles.headTitle}>Privacy & data</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.glabel}>YOUR DATA</Text>
            <SettingGroup
              rows={[
                { key: "export", icon: Icons.shield, label: "Export my data", onPress: onExport ?? exportData },
                { key: "photos", icon: Icons.download, label: "Download progress photos", value: photosLabel(photoCount), onPress: onDownloadPhotos ?? openPhotos },
              ]}
            />

            {showFaceTracking ? (
              <>
                <Text style={styles.glabel}>FACIAL ANALYSIS</Text>
                <SettingGroup
                  rows={[
                    {
                      key: "faceTracking",
                      icon: Icons.face,
                      label: "Facial volume tracking",
                      value: faceConsent.enabled ? "On" : "Off",
                      onPress: () => setFaceConsentOpen(true),
                    },
                  ]}
                />
              </>
            ) : null}

            <Text style={styles.glabel}>SHARING</Text>
            <View style={styles.group}>
              {SHARING_TOGGLES.map((t, i) => (
                <View key={t.id}>
                  <View style={styles.row}>
                    <View style={styles.icon}>{SHARING_ICONS[t.icon]}</View>
                    <View style={styles.flex}>
                      <Text style={styles.label}>{t.label}</Text>
                      <Text style={styles.subtitle}>{t.subtitle}</Text>
                    </View>
                    <Switch value={sharing[t.id]} onValueChange={() => toggle(t.id)} accessibilityLabel={t.label} />
                  </View>
                  {i < SHARING_TOGGLES.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </View>

            <View style={styles.dangerWrap}>
              <SettingGroup rows={[{ key: "delete", icon: Icons.trash, label: "Delete all my data", destructive: true, onPress: onDeleteAll }]} />
            </View>

            <View style={styles.footer}>
              <Pressable accessibilityRole="link" accessibilityLabel="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={styles.footerLink}>Privacy policy</Text>
              </Pressable>
              <Pressable accessibilityRole="link" accessibilityLabel="Terms" onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={styles.footerLink}>Terms</Text>
              </Pressable>
            </View>
          </ScrollView>
        </ModalSafeArea>
        <ProgressPhotoDownloadScreen
          visible={photosOpen}
          photos={data.progressPhotos}
          onClose={() => setPhotosOpen(false)}
          onRefresh={data.refreshProgressPhotos}
        />
        <FaceAnalysisConsentScreen visible={faceConsentOpen} onClose={() => setFaceConsentOpen(false)} />
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
  dangerWrap: { marginTop: 22 },
  footer: { flexDirection: "row", justifyContent: "center", gap: 18, paddingTop: 22 },
  footerLink: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
});

export default PrivacyScreen;
