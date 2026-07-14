import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import type { OneTapMeal } from "../../screens/app/oneTapMeals";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface OneTapMealSheetProps {
  visible: boolean;
  /** The protein card's title, e.g. "Lunch · ~40g". */
  title: string;
  /** Grams still owed today. */
  remaining: number;
  meals: OneTapMeal[];
  /** Persists the meal; resolve closes the sheet, reject shows the retry line. */
  onLog: (meal: OneTapMeal) => Promise<void>;
  onScan: () => void;
  onType: () => void;
  onClose: () => void;
}

const ForkIcon = (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" />
  </Svg>
);

/**
 * Frame 05: tapping the protein card opens their own meals as one-tap logs —
 * tap a row and it's logged, sheet closes. Scan is the primary for something
 * new; typing is the quiet escape hatch. No expansion, no forms.
 */
export function OneTapMealSheet({ visible, title, remaining, meals, onLog, onScan, onType, onClose }: OneTapMealSheetProps) {
  const slide = useRef(new Animated.Value(0)).current;
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSavingKey(null);
    setError(null);
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, slide]);

  const close = () => {
    if (savingKey) return;
    Animated.timing(slide, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(onClose);
  };

  const handleLog = async (meal: OneTapMeal) => {
    if (savingKey) return;
    setSavingKey(meal.name);
    setError(null);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await onLog(meal);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      close();
    } catch {
      setSavingKey(null);
      setError("That didn't save. One more try, I'm right here.");
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: slide }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] },
          ]}
        >
          <View style={styles.grab} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            <Text style={styles.subNum}>{remaining}g</Text> left today. One tap logs it.
          </Text>

          {meals.map((meal) => {
            const saving = savingKey === meal.name;
            return (
              <Pressable
                key={meal.name}
                accessibilityRole="button"
                accessibilityLabel={`Log ${meal.name}, ${meal.protein} grams protein`}
                onPress={() => void handleLog(meal)}
                disabled={savingKey != null}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed, saving && styles.rowSaving]}
              >
                <View style={styles.tile}>{ForkIcon}</View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <View style={styles.chips}>
                    <View style={[styles.chip, styles.chipEm]}>
                      <Text style={[styles.chipText, styles.chipTextEm]}>~{meal.protein}g</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{meal.note}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.add}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.6} strokeLinecap="round">
                    <Path d={saving ? "M5 12h14" : "M12 5v14M5 12h14"} />
                  </Svg>
                </View>
              </Pressable>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan a meal"
            onPress={() => {
              close();
              onScan();
            }}
            style={({ pressed }) => [styles.scan, pressed && styles.scanPressed]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F4FBF7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 9V7a2 2 0 0 1 2-2h2M17 5h2a2 2 0 0 1 2 2v2M21 15v2a2 2 0 0 1-2 2h-2M7 19H5a2 2 0 0 1-2-2v-2" />
              <Path d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
            </Svg>
            <Text style={styles.scanText}>Scan a meal</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Type it instead"
            onPress={() => {
              close();
              onType();
            }}
            style={styles.typeWrap}
          >
            <Text style={styles.type}>Type it instead</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(12,16,11,0.55)" },
  // mock .sheet: r28 top, padding 10 18 30
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
  },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: colors.faintest, alignSelf: "center", marginTop: 6, marginBottom: 14 },
  title: { fontFamily: font.extrabold, fontSize: 22, letterSpacing: -0.44, color: colors.ink, paddingHorizontal: 4 },
  sub: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted, paddingHorizontal: 4, paddingTop: 2, paddingBottom: 10 },
  subNum: { fontFamily: font.extrabold, color: colors.emeraldDeep },
  // mock .mealrow: r18, padding 13 14, shadow 0 6 14 .05
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    shadowOpacity: 0.05,
    elevation: 1,
  },
  rowPressed: { backgroundColor: "#F4F8F2" },
  rowSaving: { opacity: 0.55 },
  tile: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#E7F4EC", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.extrabold, fontSize: 16, letterSpacing: -0.24, color: colors.ink },
  chips: { flexDirection: "row", gap: 6, marginTop: 5 },
  chip: { backgroundColor: colors.sageFill, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  chipEm: { backgroundColor: "rgba(47,184,122,0.12)" },
  chipText: { fontFamily: font.bold, fontSize: 11, color: colors.muted },
  chipTextEm: { color: colors.emeraldDeep },
  add: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(47,184,122,0.13)", alignItems: "center", justifyContent: "center" },
  error: { fontFamily: font.semibold, fontSize: 12.5, color: colors.amberDeep, paddingHorizontal: 4, paddingTop: 10 },
  // mock .scanbtn: h50 r25 emerald-deep + shadow
  scan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.emeraldDeep,
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    shadowOpacity: 0.35,
    elevation: 4,
  },
  scanPressed: { opacity: 0.85 },
  scanText: { fontFamily: font.semibold, fontSize: 15.5, letterSpacing: -0.11, color: "#F4FBF7" },
  typeWrap: { alignItems: "center", marginTop: 13 },
  type: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, textDecorationLine: "underline" },
});

export default OneTapMealSheet;
