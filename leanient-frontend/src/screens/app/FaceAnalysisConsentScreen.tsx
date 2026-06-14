import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { faceConsentState } from "./faceConsent";
import { clearFaceMetrics } from "./faceMetricsStore";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface FaceAnalysisConsentScreenProps {
  visible: boolean;
  onClose: () => void;
}

function Bullet({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.bulletTitle}>{title}</Text>
        <Text style={styles.bulletBody}>{body}</Text>
      </View>
    </View>
  );
}

const stroke = (children: React.ReactNode) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

/**
 * Phase 2 consent gate for on-device facial-volume analysis. Facial photos are
 * biometric data, so measurement is strictly opt-in: this screen states plainly
 * what is measured, that it runs on the device and never leaves it, and lets the
 * user revoke at any time. Consent is recorded server-side with a timestamp.
 */
export function FaceAnalysisConsentScreen({ visible, onClose }: FaceAnalysisConsentScreenProps) {
  const auth = useAuth();
  const consent = faceConsentState(auth.user);
  const [saving, setSaving] = useState(false);

  const apply = async (granted: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const user = await apiService.setFaceAnalysisConsent(granted);
      await auth.updateCachedUser(user);
      // Turning it off removes the on-device measurements too, so nothing lingers.
      if (!granted && user.id) {
        await clearFaceMetrics(user.id).catch(() => {});
      }
      onClose();
    } catch (error) {
      Alert.alert("Couldn't update", extractApiError(error).message);
    } finally {
      setSaving(false);
    }
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
            <Text style={styles.headTitle}>Facial volume tracking</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <LinearGradient colors={["#6FE0A6", "#1F9E63"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.heroIcon}>
                <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx={12} cy={12} r={9} />
                  <Path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0" />
                </Svg>
              </LinearGradient>
              <Text style={styles.h1}>Track your facial volume, on your device</Text>
              <Text style={styles.sub}>
                The honest read on "Ozempic face". Strictly optional, and nothing about your face leaves your phone.
              </Text>
            </View>

            <View style={styles.card}>
              <Bullet
                icon={stroke(<><Path d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2" /><Circle cx={12} cy={12} r={3.2} /></>)}
                title="What it measures"
                body="The proportions of your face (cheeks, jaw, temples) from your weekly face checks, to spot when your face may be thinning."
              />
              <Bullet
                icon={stroke(<><Path d="M7 11V8a5 5 0 0 1 10 0v3" /><Path d="M5 11h14v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /></>)}
                title="It stays on your phone"
                body="Measurements run entirely on your device. Your face photos and the measurements are never uploaded or sent to our servers."
              />
              <Bullet
                icon={stroke(<><Path d="M3 12h4l2 5 4-13 2 8h4" /></>)}
                title="It works with your habits"
                body="Paired with your protein and loss pace, so the app can tell you what actually keeps your face full."
              />
              <Bullet
                icon={stroke(<><Circle cx={12} cy={12} r={9} /><Path d="M8 12l3 3 5-6" /></>)}
                title="You're in control"
                body="Turn it off whenever you want. We keep no facial measurements on our servers to delete."
              />
            </View>

            {consent.enabled ? (
              <>
                <Text style={styles.statusLine}>On since {consent.sinceLabel}.</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Turn off facial volume tracking" disabled={saving} onPress={() => void apply(false)} style={styles.offBtn}>
                  {saving ? <ActivityIndicator color={colors.amberDeep} /> : <Text style={styles.offBtnText}>Turn off tracking</Text>}
                </Pressable>
              </>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Allow on-device tracking" disabled={saving} onPress={() => void apply(true)}>
                <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                  {saving ? <ActivityIndicator color="#F4FBF7" /> : <Text style={styles.ctaText}>Allow on-device tracking</Text>}
                </LinearGradient>
              </Pressable>
            )}
            <Text style={styles.disc}>This is on-device estimation, not a medical or diagnostic measurement.</Text>
          </ScrollView>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 30, paddingHorizontal: 20 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hero: { alignItems: "center", paddingTop: 14 },
  heroIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  h1: { fontFamily: font.extrabold, fontSize: 24, letterSpacing: -0.6, color: colors.ink, marginTop: 16, textAlign: "center", paddingHorizontal: 10 },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 9, textAlign: "center" },
  card: { marginTop: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  bullet: { flexDirection: "row", gap: 13, alignItems: "flex-start", paddingVertical: 13 },
  bulletIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(47,184,122,0.10)", alignItems: "center", justifyContent: "center" },
  bulletTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  bulletBody: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
  statusLine: { fontFamily: font.semibold, fontSize: 13.5, color: colors.emeraldDeep, textAlign: "center", marginTop: 22 },
  cta: { marginTop: 22, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
  offBtn: { marginTop: 12, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: "rgba(200,132,58,0.5)", alignItems: "center", justifyContent: "center" },
  offBtnText: { fontFamily: font.semibold, fontSize: 15, color: colors.amberDeep },
  disc: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: colors.faint, textAlign: "center", paddingHorizontal: 18, paddingTop: 16 },
});

export default FaceAnalysisConsentScreen;
