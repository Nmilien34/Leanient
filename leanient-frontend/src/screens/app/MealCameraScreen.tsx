import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const DARK = "#100F0C";

function Spark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}
function CloseIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function FlashIcon({ on }: { on: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={on ? "#FFD66E" : "none"} stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </Svg>
  );
}

interface MealCameraScreenProps {
  visible: boolean;
  onClose: () => void;
  onCaptured: (uri: string) => void;
}

/**
 * Full-screen meal-capture camera. Asks for camera permission (priming gate →
 * OS prompt), shows the live feed with framing brackets, and captures a photo
 * for the AI meal scan. The captured photo feeds `MealScanRequest` → POST
 * /meal-scans (wired downstream on the scan screen).
 */
export function MealCameraScreen({ visible, onClose, onCaptured }: MealCameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!visible) setTorch(false);
  }, [visible]);

  if (!visible) return null;

  const capture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) onCaptured(photo.uri);
    } catch {
      // ignore capture errors (e.g. no camera on web preview)
    } finally {
      setCapturing(false);
    }
  };

  // Permission gate (priming) — shown until the user grants camera access.
  if (!permission?.granted) {
    const denied = permission && !permission.canAskAgain;
    return (
      <View style={styles.gate}>
        <StatusBar style="light" />
        <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.camIc, styles.gateClose]}>
          <CloseIcon />
        </Pressable>
        <View style={styles.gateBody}>
          <View style={styles.gateIcon}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
              <Path d="M12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" />
            </Svg>
          </View>
          <Text style={styles.gateTitle}>Scan your meal</Text>
          <Text style={styles.gateText}>
            Leanient uses your camera to estimate the protein on your plate. Photos stay private.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={denied ? () => Linking.openSettings() : () => requestPermission()}
            style={styles.gateBtn}
          >
            <Text style={styles.gateBtnText}>{denied ? "Open Settings" : "Allow camera"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.gateSkip}>
            <Text style={styles.gateSkipText}>Type it in instead</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cam}>
      <StatusBar style="light" />
      <View style={styles.feed}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />

        {/* top bar */}
        <View style={styles.camTop}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.camIc}>
            <CloseIcon />
          </Pressable>
          <View style={styles.aipill}>
            <Spark />
            <Text style={styles.aipillText}>AI SCAN</Text>
          </View>
          <Pressable accessibilityLabel="Toggle flash" onPress={() => setTorch((t) => !t)} style={styles.camIc}>
            <FlashIcon on={torch} />
          </Pressable>
        </View>

        {/* framing brackets */}
        <View style={[styles.bracket, styles.tl]} />
        <View style={[styles.bracket, styles.tr]} />
        <View style={[styles.bracket, styles.bl]} />
        <View style={[styles.bracket, styles.br]} />

        <Text style={styles.hint}>Center your plate — we'll estimate the protein</Text>
      </View>

      {/* controls */}
      <View style={styles.ctrls}>
        <View style={styles.side} />
        <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={capture} style={styles.shutter} />
        <View style={styles.side} />
      </View>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.typeWrap}>
        <Text style={styles.typeLink}>Type it in instead</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cam: { ...StyleSheet.absoluteFillObject, backgroundColor: DARK, zIndex: 100 },
  feed: { flex: 1, overflow: "hidden", position: "relative" },
  camTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 46,
    paddingHorizontal: 18,
  },
  camIc: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  aipill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(47,184,122,0.92)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  aipillText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.66, color: "#fff" },
  bracket: { position: "absolute", width: 34, height: 34, borderColor: "rgba(255,255,255,0.9)", borderWidth: 0, zIndex: 2 },
  tl: { top: 120, left: 46, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 9 },
  tr: { top: 120, right: 46, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 9 },
  bl: { bottom: 60, left: 46, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 9 },
  br: { bottom: 60, right: 46, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 9 },
  hint: { position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center", color: "rgba(255,255,255,0.92)", fontFamily: font.semibold, fontSize: 13.5, zIndex: 3 },
  ctrls: { backgroundColor: DARK, paddingHorizontal: 30, paddingTop: 22, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  side: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#24231D" },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", borderWidth: 4, borderColor: DARK },
  typeWrap: { backgroundColor: DARK, paddingBottom: 30 },
  typeLink: { textAlign: "center", color: "rgba(255,255,255,0.6)", fontFamily: font.semibold, fontSize: 13 },
  // permission gate
  gate: { ...StyleSheet.absoluteFillObject, backgroundColor: DARK, zIndex: 100, alignItems: "center", justifyContent: "center", padding: 28 },
  gateClose: { position: "absolute", top: 50, left: 18 },
  gateBody: { alignItems: "center" },
  gateIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(47,184,122,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  gateTitle: { fontFamily: font.extrabold, fontSize: 24, letterSpacing: -0.6, color: "#fff", textAlign: "center" },
  gateText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 10 },
  gateBtn: { marginTop: 24, alignSelf: "stretch", height: 54, borderRadius: 27, backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center" },
  gateBtnText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7" },
  gateSkip: { paddingVertical: 14, marginTop: 4 },
  gateSkipText: { fontFamily: font.medium, fontSize: 14, color: "rgba(255,255,255,0.55)" },
});

export default MealCameraScreen;
