import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockMedicationProtocol } from "../../mocks/home";
import type { ProgressPhotoKind } from "@leanient/shared";
import { FACE_FULLNESS_OPTIONS, POSES, progressWeekNumber, type Pose } from "./progressPhotoMeta";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

/** What a capture reports back: the framing, whether it's a body or face check, and the rating. */
export interface CaptureMeta {
  pose: Pose;
  kind: ProgressPhotoKind;
  faceFullness?: number;
}

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

/**
 * Body outline the user lines up with, drawn per framing so the guide actually
 * looks like the pose: Front faces the viewer, Side is a narrower profile with a
 * nose facing right, Back is the front build with no face and a spine line.
 */
function PoseSilhouette({ pose }: { pose: Pose }) {
  return (
    <Svg width={150} height={320} viewBox="0 0 150 320" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.55)" strokeWidth={2}>
      {pose === "Side" ? (
        <>
          {/* profile: narrower body, facing right, small nose */}
          <Circle cx={70} cy={34} r={22} />
          <Path d="M91 28c6 2 9 5 9 8s-3 6-9 8" fill="none" />
          <Rect x={54} y={62} width={40} height={124} rx={20} />
          <Rect x={64} y={74} width={15} height={100} rx={7} />
          <Rect x={56} y={184} width={18} height={118} rx={9} />
          <Rect x={74} y={186} width={18} height={116} rx={9} />
        </>
      ) : pose === "Back" ? (
        <>
          {/* back: front build, broader shoulders, no face, spine line */}
          <Circle cx={75} cy={34} r={24} />
          <Rect x={40} y={64} width={70} height={120} rx={26} />
          <Rect x={20} y={72} width={18} height={104} rx={9} />
          <Rect x={112} y={72} width={18} height={104} rx={9} />
          <Rect x={52} y={180} width={20} height={120} rx={10} />
          <Rect x={78} y={180} width={20} height={120} rx={10} />
          <Path d="M75 70V178" fill="none" />
        </>
      ) : (
        <>
          {/* front: faces the viewer */}
          <Circle cx={75} cy={34} r={24} />
          <Rect x={42} y={64} width={66} height={120} rx={26} />
          <Rect x={22} y={72} width={18} height={104} rx={9} />
          <Rect x={110} y={72} width={18} height={104} rx={9} />
          <Rect x={52} y={180} width={20} height={120} rx={10} />
          <Rect x={78} y={180} width={20} height={120} rx={10} />
        </>
      )}
    </Svg>
  );
}

/** Head-and-shoulders oval the user centers their face in for a face check. */
function FaceSilhouette() {
  return (
    <Svg width={210} height={300} viewBox="0 0 210 300" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2.5}>
      <Path d="M105 22c40 0 60 34 60 84 0 54-30 96-60 96s-60-42-60-96c0-50 20-84 60-84z" fill="rgba(255,255,255,0.16)" />
      <Path d="M30 300c8-44 38-66 75-66s67 22 75 66" fill="none" />
    </Svg>
  );
}

interface ProgressPhotoScreenProps {
  visible: boolean;
  onClose: () => void;
  /** "body" progress photo (back camera, pose tabs) or a "face" check (front camera, fullness step). */
  mode?: ProgressPhotoKind;
  onCaptured?: (uri: string, meta: CaptureMeta) => Promise<void>;
  onGallery?: () => void;
}

/**
 * Log · Progress photo (screen 39). A camera with a pose guide: pick Front /
 * Side / Back, line up with the outline, optionally use the 3s self-timer, and
 * shoot. The week label comes from the protocol start date.
 */
export function ProgressPhotoScreen({ visible, onClose, mode = "body", onCaptured, onGallery }: ProgressPhotoScreenProps) {
  const data = useLeanientData();
  const medication = data.medicationProtocol ?? mockMedicationProtocol;
  const now = useRef(new Date()).current;
  const week = progressWeekNumber(medication?.startDate, now);
  const isFace = mode === "face";

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [pose, setPose] = useState<Pose>("Front");
  const [timerOn, setTimerOn] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  // Face checks pause on a fullness rating after the shot before saving.
  const [pendingFaceUri, setPendingFaceUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Pose guide does a 3D turn-and-swap when the framing changes: the current
  // silhouette turns edge-on, we swap to the new pose's shape while it's hidden,
  // then it turns to face. `spin` runs -1..1, where ±1 is edge-on (90deg). The
  // turn direction follows the tab order so Front→Side→Back reads as one rotation.
  const [displayedPose, setDisplayedPose] = useState<Pose>(pose);
  const spin = useRef(new Animated.Value(0)).current;
  const prevPoseRef = useRef<Pose>(pose);

  useEffect(() => {
    if (prevPoseRef.current === pose) return;
    const dir = POSES.indexOf(pose) > POSES.indexOf(prevPoseRef.current) ? 1 : -1;
    prevPoseRef.current = pose;
    Animated.timing(spin, {
      toValue: dir,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setDisplayedPose(pose); // swap while edge-on (hidden)
      spin.setValue(-dir);
      Animated.timing(spin, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [pose, spin]);

  useEffect(() => {
    if (!visible) {
      setTorch(false);
      setCount(null);
      setPendingFaceUri(null);
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
      if (!photo?.uri) return;
      if (isFace) {
        // Hold the shot and ask how the face feels before saving.
        setPendingFaceUri(photo.uri);
      } else {
        await onCaptured?.(photo.uri, { pose, kind: "body" });
      }
    } catch {
      // no camera (e.g. web preview) — ignore
    } finally {
      setCapturing(false);
    }
  };

  const saveFaceCheck = (faceFullness?: number) => {
    const uri = pendingFaceUri;
    if (!uri) return;
    setPendingFaceUri(null);
    void onCaptured?.(uri, { pose: "Front", kind: "face", faceFullness });
  };

  const onShutter = () => {
    if (capturing || count !== null || pendingFaceUri) return;
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
            <Text style={styles.gateBtnText}>{denied ? "Open Settings" : "Continue"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cam}>
      <StatusBar style="light" />
      <View style={styles.feed}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={isFace ? "front" : "back"} enableTorch={torch} />

        {/* top bar */}
        <View style={styles.camTop}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.camIc}>
            <CloseIcon />
          </Pressable>
          <View style={styles.weekPill}>
            <Text style={styles.weekPillText}>{isFace ? "FACE CHECK" : "PROGRESS"} · WK {week}</Text>
          </View>
          <Pressable accessibilityLabel="Toggle flash" onPress={() => setTorch((t) => !t)} style={styles.camIc}>
            <FlashIcon on={torch} />
          </Pressable>
        </View>

        {/* pose tabs — body framings only; a face check is a single front framing */}
        {isFace ? null : (
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
        )}

        {/* alignment guide */}
        <View style={styles.silhouette} pointerEvents="none">
          {isFace ? (
            <FaceSilhouette />
          ) : (
            <Animated.View
              style={{
                transform: [
                  { perspective: 900 },
                  {
                    rotateY: spin.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ["-90deg", "0deg", "90deg"],
                    }),
                  },
                ],
              }}
            >
              <PoseSilhouette pose={displayedPose} />
            </Animated.View>
          )}
        </View>

        {/* countdown overlay */}
        {count !== null ? (
          <View style={styles.countWrap} pointerEvents="none">
            <Text style={styles.count}>{count}</Text>
          </View>
        ) : null}

        <Text style={styles.hint}>
          {isFace
            ? "Center your face in the oval. Same light each week."
            : "Line up with the outline. Same spot, same light each week."}
        </Text>
      </View>

      {/* face-check fullness rating */}
      {pendingFaceUri ? (
        <View style={styles.fullness}>
          <Text style={styles.fullnessTitle}>How full does your face feel this week?</Text>
          <View style={styles.fullnessRow}>
            {FACE_FULLNESS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                onPress={() => saveFaceCheck(opt.value)}
                style={styles.fullnessOpt}
              >
                <Text style={styles.fullnessNum}>{opt.value}</Text>
                <Text style={styles.fullnessLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip rating" onPress={() => saveFaceCheck(undefined)} style={styles.fullnessSkip}>
            <Text style={styles.fullnessSkipText}>Save without rating</Text>
          </Pressable>
        </View>
      ) : null}

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
  // face-check fullness rating
  fullness: { ...StyleSheet.absoluteFillObject, zIndex: 6, backgroundColor: "rgba(16,15,12,0.82)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  fullnessTitle: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.5, color: "#fff", textAlign: "center", marginBottom: 22 },
  fullnessRow: { flexDirection: "row", gap: 8, alignSelf: "stretch", justifyContent: "center" },
  fullnessOpt: { flex: 1, maxWidth: 70, aspectRatio: 0.78, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", gap: 6 },
  fullnessNum: { fontFamily: font.extrabold, fontSize: 20, color: colors.emeraldHi },
  fullnessLabel: { fontFamily: font.semibold, fontSize: 10.5, color: "rgba(255,255,255,0.85)", textAlign: "center", paddingHorizontal: 2 },
  fullnessSkip: { marginTop: 22, paddingVertical: 12 },
  fullnessSkipText: { fontFamily: font.medium, fontSize: 14, color: "rgba(255,255,255,0.6)" },
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
