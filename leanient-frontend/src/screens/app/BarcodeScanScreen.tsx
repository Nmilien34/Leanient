import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import Svg, { Path } from "react-native-svg";
import type { MealParseResponse } from "@leanient/shared";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const DARK = "#100F0C";

interface BarcodeScanScreenProps {
  visible: boolean;
  onClose: () => void;
  /** Looks the scanned code up; resolves null when not found / unavailable. */
  onLookup: (code: string) => Promise<MealParseResponse | null>;
  /** Log the confirmed product. */
  onLog: (product: MealParseResponse) => void;
  /** Fall back to typing the food when the code isn't found. */
  onType: () => void;
}

type Phase =
  | { kind: "scanning" }
  | { kind: "looking" }
  | { kind: "found"; product: MealParseResponse }
  | { kind: "notFound" };

/** The "found" confirm sheet — macros are editable, since barcode data is imperfect. */
function FoundSheet({ product, onLog, onScanAgain }: { product: MealParseResponse; onLog: (p: MealParseResponse) => void; onScanAgain: () => void }) {
  const [protein, setProtein] = useState(String(product.protein));
  const [calories, setCalories] = useState(String(product.calories));
  const serving = product.components[0]?.name.match(/\(([^)]+)\)\s*$/)?.[1];

  const log = () => {
    const p = Math.max(0, Math.round(Number(protein) || 0));
    const c = Math.max(0, Math.round(Number(calories) || 0));
    onLog({ ...product, protein: p, calories: c, components: [{ name: product.components[0]?.name ?? product.name, protein: p, calories: c }] });
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.foundName}>{product.name}</Text>
      <Text style={styles.foundServing}>{serving ? `Per ${serving} · adjust if it looks off` : "Adjust if it looks off"}</Text>
      <View style={styles.editRow}>
        <View style={styles.editField}>
          <TextInput value={protein} onChangeText={setProtein} keyboardType="number-pad" style={styles.editInput} accessibilityLabel="Protein grams" />
          <Text style={styles.editUnit}>g protein</Text>
        </View>
        <View style={styles.editField}>
          <TextInput value={calories} onChangeText={setCalories} keyboardType="number-pad" style={styles.editInput} accessibilityLabel="Calories" />
          <Text style={styles.editUnit}>cal</Text>
        </View>
      </View>
      <Pressable style={styles.logBtn} onPress={log}>
        <Text style={styles.logBtnText}>Log it</Text>
      </Pressable>
      <Pressable onPress={onScanAgain} hitSlop={8}>
        <Text style={styles.againText}>Scan another</Text>
      </Pressable>
    </View>
  );
}

/**
 * Full-screen barcode scanner. expo-camera reads the UPC/EAN, the backend looks
 * it up (Open Food Facts), and the confirmed product logs as a meal — with the
 * macros editable, since barcode data is imperfect. Codes that aren't found route
 * to typing the food instead — never a guessed macro.
 */
export function BarcodeScanScreen({ visible, onClose, onLookup, onLog, onType }: BarcodeScanScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setPhase({ kind: "scanning" });
      handledRef.current = false;
    }
  }, [visible]);

  if (!visible) return null;

  const handleScan = async (result: BarcodeScanningResult) => {
    if (handledRef.current || phase.kind !== "scanning") return;
    const code = result.data?.replace(/\D/g, "");
    if (!code || code.length < 6) return;
    handledRef.current = true;
    setPhase({ kind: "looking" });
    const product = await onLookup(code).catch(() => null);
    setPhase(product ? { kind: "found", product } : { kind: "notFound" });
  };

  const scanAgain = () => {
    handledRef.current = false;
    setPhase({ kind: "scanning" });
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.gateClose}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>
        <Text style={styles.permTitle}>Scan a barcode</Text>
        <Text style={styles.permBody}>Leanient needs the camera to read a product barcode.</Text>
        <Pressable style={styles.permBtn} onPress={() => (permission?.canAskAgain === false ? Linking.openSettings() : requestPermission())}>
          <Text style={styles.permBtnText}>{permission?.canAskAgain === false ? "Open Settings" : "Continue"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={phase.kind === "scanning" ? handleScan : undefined}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
      />

      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round"><Path d="M6 6l12 12M18 6L6 18" /></Svg>
        </Pressable>
        <Text style={styles.topTitle}>Scan barcode</Text>
        <View style={styles.closeBtn} />
      </View>

      {phase.kind === "scanning" ? (
        <View style={styles.reticleWrap} pointerEvents="none">
          <View style={styles.reticle} />
          <Text style={styles.hint}>Line up the barcode</Text>
        </View>
      ) : null}

      {phase.kind === "looking" ? (
        <View style={styles.sheet}>
          <ActivityIndicator color={colors.emeraldDeep} />
          <Text style={styles.sheetLook}>Looking it up…</Text>
        </View>
      ) : null}

      {phase.kind === "found" ? (
        <FoundSheet product={phase.product} onLog={onLog} onScanAgain={scanAgain} />
      ) : null}

      {phase.kind === "notFound" ? (
        <View style={styles.sheet}>
          <Text style={styles.foundName}>Not in our database</Text>
          <Text style={styles.sheetLook}>We couldn't find that barcode. Type the product instead and we'll estimate it.</Text>
          <Pressable style={styles.logBtn} onPress={onType}>
            <Text style={styles.logBtnText}>Type the food</Text>
          </Pressable>
          <Pressable onPress={scanAgain} hitSlop={8}>
            <Text style={styles.againText}>Try another code</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: DARK, zIndex: 100 },
  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  permTitle: { fontFamily: font.bold, fontSize: 20, color: "#fff" },
  permBody: { fontFamily: font.regular, fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 20 },
  permBtn: { marginTop: 8, height: 50, paddingHorizontal: 28, borderRadius: 25, backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center" },
  permBtnText: { fontFamily: font.semibold, fontSize: 15, color: "#fff" },
  permCancel: { fontFamily: font.medium, fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 6 },
  topBar: { position: "absolute", top: 60, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  gateClose: { position: "absolute", top: 60, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  topTitle: { fontFamily: font.semibold, fontSize: 15, color: "#fff" },
  reticleWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 16 },
  reticle: { width: 260, height: 150, borderRadius: 20, borderWidth: 2.5, borderColor: "rgba(255,255,255,0.85)" },
  hint: { fontFamily: font.medium, fontSize: 14, color: "rgba(255,255,255,0.85)" },
  sheet: { position: "absolute", left: 16, right: 16, bottom: 40, backgroundColor: colors.card, borderRadius: 22, padding: 20, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, shadowOpacity: 0.3 },
  sheetLook: { fontFamily: font.medium, fontSize: 13.5, color: colors.muted, textAlign: "center", lineHeight: 19 },
  foundName: { fontFamily: font.extrabold, fontSize: 18, letterSpacing: -0.3, color: colors.ink, textAlign: "center" },
  foundServing: { fontFamily: font.medium, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: -2 },
  editRow: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 6 },
  editField: { flex: 1, alignItems: "center", backgroundColor: colors.sageFill, borderRadius: 14, paddingVertical: 10 },
  editInput: { fontFamily: font.extrabold, fontSize: 22, letterSpacing: -0.5, color: colors.ink, textAlign: "center", minWidth: 60, padding: 0 },
  editUnit: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted, marginTop: 1 },
  logBtn: { marginTop: 8, alignSelf: "stretch", height: 50, borderRadius: 25, backgroundColor: colors.emeraldDeep, alignItems: "center", justifyContent: "center" },
  logBtnText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7" },
  againText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.emeraldDeep, paddingTop: 4 },
});

export default BarcodeScanScreen;
