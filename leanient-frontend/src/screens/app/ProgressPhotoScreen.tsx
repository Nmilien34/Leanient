import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockMedicationProtocol } from "../../mocks/home";
import { POSES, progressWeekNumber, type Pose } from "./progressPhotoMeta";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const DARK = "#100F0C";

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
function GalleryIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#cfcfc7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={3} />
      <Circle cx={9} cy={10} r={2} />
      <Path d="M4 17l5-5 4 4 3-3 4 4" />
    </Svg>
  );
}

/** Front-body outline the user lines up with. */
function PoseSilhouette() {
  return (
    <Svg width={150} height={320} viewBox="0 0 150 320" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.55)" strokeWidth={2}>
      <Circle cx={75} cy={34} r={24} />
      <Rect x={42} y={64} width={66} height={120} rx={26} />
      <Rect x={22} y={72} width={18} height={104} rx={9} />
      <Rect x={110} y={72} width={18} height={104} rx={9} />
      <Rect x={52} y={180} width={20} height={120} rx={10} />
      <Rect x={78} y={180} width={20} height={120} rx={10} />
    </Svg>
  );
}

interface ProgressPhotoScreenProps {
  visible: boolean;
  onClose: () => void;
  onCaptured?: (uri: string, pose: Pose) => Promise<void>;
  onGallery?: () => void;
}

/**
 * Log · Progress photo (screen 39). A camera with a pose guide: pick Front /
 * Side / Back, line up with the outline, optionally use the 3s self-timer, and
 * shoot. The week label comes from the protocol start date.
 */
export function ProgressPhotoScreen({ visible, onClose, onCaptured, onGallery }: ProgressPhotoScreenProps) {
  const data = useLeanientData();
  const medication = data.medicationProtocol ?? mockMedicationProtocol;
  const now = useRef(new Date()).current;
  const week = progressWeekNumber(medication?.startDate, now);

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [pose, setPose] = useState<Pose>("Front");
  const [timerOn, setTimerOn] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!visible) {
      setTorch(false);
      setCount(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [visible]);

  useEffect(() => () => countdownRef.current && clearInterval(countdownRef.current), []);

  if (!visible) return null;

  const doCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) await onCaptured?.(photo.uri, pose);
    } catch {
      // no camera (e.g. web preview) — ignore
    } finally {
      setCapturing(false);
    }
  };

  const onShutter = () => {
    if (capturing || count !== null) return;
    if (!timerOn) {
      void doCapture();
      return;
    }
    setCount(3);
    countdownRef.current = setInterval(() => {
      setCount((c) => {
        if (c == null) return null;
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          void doCapture();
          return null;
        }
        return c - 1;
      });
    }, 1000);
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
          <Text style={styles.gateTitle}>Take your progress photo</Text>
          <Text style={styles.gateText}>Leanient uses your camera for weekly progress photos. They stay private on your device.</Text>
          <Pressable accessibilityRole="button" onPress={denied ? () => Linking.openSettings() : () => requestPermission()} style={styles.gateBtn}>
            <Text style={styles.gateBtnText}>{denied ? "Open Settings" : "Allow camera"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.gateSkip}>
            <Text style={styles.gateSkipText}>Not now</Text>
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
          <View style={styles.weekPill}>
            <Text style={styles.weekPillText}>PROGRESS · WK {week}</Text>
          </View>
          <Pressable accessibilityLabel="Toggle flash" onPress={() => setTorch((t) => !t)} style={styles.camIc}>
            <FlashIcon on={torch} />
          </Pressable>
        </View>

        {/* pose tabs */}
        <View style={styles.poseBar}>
          {POSES.map((p) => {
            const on = p === pose;
            return (
              <Pressable key={p} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${p} pose`} onPress={() => setPose(p)} style={[styles.poseTab, on && styles.poseTabOn]}>
                <Text style={[styles.poseText, on && styles.poseTextOn]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* pose silhouette */}
        <View style={styles.silhouette} pointerEvents="none">
          <PoseSilhouette />
        </View>

        {/* countdown overlay */}
        {count !== null ? (
          <View style={styles.countWrap} pointerEvents="none">
            <Text style={styles.count}>{count}</Text>
          </View>
        ) : null}

        <Text style={styles.hint}>Line up with the outline. Same spot, same light each week.</Text>
      </View>

      {/* controls */}
      <View style={styles.ctrls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open gallery" onPress={onGallery} style={styles.side}>
          <GalleryIcon />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={onShutter} style={styles.shutter} />
        <Pressable accessibilityRole="button" accessibilityLabel="Toggle self timer" accessibilityState={{ selected: timerOn }} onPress={() => setTimerOn((t) => !t)} style={[styles.side, styles.timerSide]}>
          <Text style={[styles.timerText, timerOn && styles.timerTextOn]}>3s</Text>
          <Text style={[styles.timerSub, timerOn && styles.timerTextOn]}>{timerOn ? "on" : "timer"}</Text>
        </Pressable>
      </View>
      <Text style={styles.privacy}>Your photos stay private on your device</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cam: { ...StyleSheet.absoluteFillObject, backgroundColor: DARK, zIndex: 100 },
  feed: { flex: 1, overflow: "hidden", position: "relative", backgroundColor: "#39414A" },
  camTop: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 46, paddingHorizontal: 18 },
  camIc: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  weekPill: { backgroundColor: "rgba(0,0,0,0.4)", paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20 },
  weekPillText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.66, color: "#fff" },
  poseBar: { position: "absolute", top: 100, left: 0, right: 0, zIndex: 3, flexDirection: "row", justifyContent: "center", gap: 8 },
  poseTab: { backgroundColor: "rgba(0,0,0,0.32)", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 18 },
  poseTabOn: { backgroundColor: "rgba(47,184,122,0.92)" },
  poseText: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.36, color: "rgba(255,255,255,0.72)" },
  poseTextOn: { color: "#fff" },
  silhouette: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 1 },
  countWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 4 },
  count: { fontFamily: font.extrabold, fontSize: 96, color: "rgba(255,255,255,0.92)" },
  hint: { position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center", color: "rgba(255,255,255,0.92)", fontFamily: font.semibold, fontSize: 13.5, zIndex: 3, paddingHorizontal: 30 },
  ctrls: { backgroundColor: DARK, paddingHorizontal: 30, paddingTop: 22, paddingBottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  side: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#24231D", alignItems: "center", justifyContent: "center" },
  timerSide: { gap: 0 },
  timerText: { fontFamily: font.bold, fontSize: 13, color: "#cfcfc7", lineHeight: 15 },
  timerSub: { fontFamily: font.medium, fontSize: 9, color: "rgba(207,207,199,0.7)", lineHeight: 11 },
  timerTextOn: { color: colors.emeraldHi },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", borderWidth: 4, borderColor: DARK },
  privacy: { backgroundColor: DARK, paddingBottom: 30, textAlign: "center", color: "rgba(255,255,255,0.6)", fontFamily: font.semibold, fontSize: 13 },
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

export default ProgressPhotoScreen;
