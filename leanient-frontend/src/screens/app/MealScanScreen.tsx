import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { MealScanResponse } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { readMealScanImageFromUri } from "../../services/mealScanPhoto.service";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function Spark({ color = "#fff" }: { color?: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

interface MealScanScreenProps {
  visible: boolean;
  photoUri: string | null;
  onClose: () => void;
  onRetake: () => void;
  onLogged: (mode: "as_is" | "swap", result: MealScanResponse) => Promise<void>;
}

/**
 * AI meal scan result. Renders the photo the user just captured, runs the live
 * scan, then shows the macro analysis + coach content. Everything is driven by
 * `MealScanResponse`.
 */
export function MealScanScreen({ visible, photoUri, onClose, onRetake, onLogged }: MealScanScreenProps) {
  const [result, setResult] = useState<MealScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanAttempt, setScanAttempt] = useState(0);

  useEffect(() => {
    if (!visible) {
      setResult(null);
      setError(null);
      setIsScanning(false);
      return;
    }

    if (!photoUri) {
      setResult(null);
      setError("Take a meal photo before scanning.");
      setIsScanning(false);
      return;
    }

    let cancelled = false;

    async function performScan(uri: string) {
      setResult(null);
      setError(null);
      setIsScanning(true);

      try {
        const image = await readMealScanImageFromUri(uri);
        const scanResult = await apiService.scanMeal(image);
        if (!cancelled) {
          setResult(scanResult);
        }
      } catch (scanError) {
        if (!cancelled) {
          setError(extractApiError(scanError).message);
        }
      } finally {
        if (!cancelled) {
          setIsScanning(false);
        }
      }
    }

    void performScan(photoUri);

    return () => {
      cancelled = true;
    };
  }, [visible, photoUri, scanAttempt]);

  if (!visible) return null;

  const photo = photoUri ? <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null;

  // Analyzing state, show the captured photo with a scanning overlay.
  if (!result) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Header onClose={onClose} retake={onRetake} disabled={isScanning} />
          <View style={styles.scanPhoto}>
            {photo ?? <LinearGradient colors={["#C9A86A", "#8A6A3C"]} style={StyleSheet.absoluteFill} />}
            <View style={styles.scanOverlay}>
              {isScanning ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.scanText}>Analyzing your meal...</Text>
                  <Text style={styles.scanHint}>Usually 5 to 10 seconds.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.scanText}>Couldn't analyze this photo.</Text>
                  {error ? <Text style={styles.scanHint}>{error}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setScanAttempt((attempt) => attempt + 1)}
                    style={styles.retryBtn}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const { analysis, coachContent } = result;
  const isSwap = coachContent?.mode === "swap" && coachContent.swap;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Header onClose={onClose} retake={onRetake} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* captured photo + confidence */}
          <View style={styles.scanPhoto}>
            {photo ?? <LinearGradient colors={["#C9A86A", "#8A6A3C"]} style={StyleSheet.absoluteFill} />}
            <View style={styles.confidence}>
              <Spark />
              <Text style={styles.confidenceText}>{Math.round(analysis.confidence * 100)}% SURE</Text>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.foodName}>{analysis.foodName}</Text>
            <Text style={styles.serving}>{analysis.servingSize} · tap to adjust portion</Text>
          </View>

          {/* macros */}
          <View style={styles.macros}>
            <Macro value={`${analysis.protein}g`} label="Protein" lead />
            <Macro value={`${analysis.calories}`} label="Calories" />
            <Macro value={`${analysis.carbs}g`} label="Carbs" />
          </View>

          {/* coach content */}
          {coachContent ? (
            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.callout}>{coachContent.callout}</Text>
              {isSwap && coachContent.swap ? (
                <View style={styles.statline}>
                  <View style={styles.sli}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z" />
                    </Svg>
                  </View>
                  <Text style={styles.slk}>{coachContent.swap.description}</Text>
                  <Text style={styles.slv}>+{coachContent.swap.additionalProtein}g</Text>
                </View>
              ) : null}
            </LinearGradient>
          ) : null}

          {/* actions */}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => void onLogged("as_is", result)} style={[styles.btn2, styles.flexBtn]}>
              <Text style={styles.btn2Text}>Log as is</Text>
            </Pressable>
            {isSwap ? (
              <Pressable accessibilityRole="button" onPress={() => void onLogged("swap", result)} style={styles.flexBtnLead}>
                <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.vbtn}>
                  <Text style={styles.vbtnText}>Add the swap & log</Text>
                </LinearGradient>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Header({
  onClose,
  retake,
  disabled = false,
}: {
  onClose: () => void;
  retake: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.head}>
      <Pressable
        accessibilityLabel="Close"
        disabled={disabled}
        onPress={onClose}
        style={[styles.closeBtn, disabled && styles.disabledControl]}
      >
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      </Pressable>
      <Text style={styles.headTitle}>Confirm meal</Text>
      <Pressable
        accessibilityLabel="Retake"
        disabled={disabled}
        onPress={retake}
        style={disabled && styles.disabledControl}
      >
        <Text style={styles.retake}>Retake</Text>
      </Pressable>
    </View>
  );
}

function Macro({ value, label, lead }: { value: string; label: string; lead?: boolean }) {
  return (
    <View style={[styles.macro, lead && styles.macroLead]}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 90 },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  disabledControl: { opacity: 0.45 },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  retake: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  scanPhoto: { marginHorizontal: 20, marginTop: 8, height: 172, borderRadius: 20, overflow: "hidden", backgroundColor: "#8A6A3C" },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(12,16,11,0.35)" },
  scanText: { fontFamily: font.semibold, fontSize: 14, color: "#fff", textAlign: "center" },
  scanHint: { maxWidth: 260, fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: "rgba(255,255,255,0.78)", textAlign: "center" },
  retryBtn: { marginTop: 4, paddingHorizontal: 16, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  retryText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  confidence: { position: "absolute", right: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.35)", paddingVertical: 5, paddingHorizontal: 9, borderRadius: 9 },
  confidenceText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.44, color: "#fff" },
  titleBlock: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 2 },
  foodName: { fontFamily: font.extrabold, fontSize: 20, letterSpacing: -0.4, color: colors.ink },
  serving: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  macros: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  macro: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, alignItems: "center" },
  macroLead: { borderColor: "rgba(47,184,122,0.4)", backgroundColor: "rgba(47,184,122,0.07)" },
  macroValue: { fontFamily: font.extrabold, fontSize: 19, letterSpacing: -0.38, color: colors.ink },
  macroLabel: { fontFamily: font.semibold, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  aicard: { marginHorizontal: 20, marginTop: 16, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  callout: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: colors.inkSoft, marginTop: 10 },
  statline: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  sli: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  slk: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  slv: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  flexBtn: { flex: 1 },
  flexBtnLead: { flex: 1.3 },
  btn2: { height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.10)", borderWidth: 1.5, borderColor: "rgba(47,184,122,0.35)" },
  btn2Text: { fontFamily: font.semibold, fontSize: 15, color: colors.emeraldDeep },
  vbtn: { height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  vbtnText: { fontFamily: font.semibold, fontSize: 15, color: "#F4FBF7" },
});

export default MealScanScreen;
