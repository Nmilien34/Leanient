import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Button } from "../../components/ui/Button";
import { Wheel, type WheelItem } from "../../components/ui/Wheel";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { mockMedicationCatalog } from "../../mocks/medications";
import {
  MONTHS_SHORT,
  clampDay,
  clampToToday,
  daysInMonth,
  deriveMedicationDetails,
  formatLongDate,
  startYearRange,
  toDateParts,
  toIsoDate,
  type DateParts,
} from "../../onboarding/medicationDetails";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const RISE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

interface MedicationDetailsScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

const MONTH_ITEMS: WheelItem[] = MONTHS_SHORT.map((label, value) => ({ label, value }));

/**
 * Medication Details (onboarding, after the GLP picker). Fills the contract's
 * required `startDate` + `doseUnit`. Variant A: the dose unit is derived from the
 * selected medication's catalog entry and shown read-only, so the user only sets
 * the start date. Everything is dynamic from the chosen medication.
 */
export function MedicationDetailsScreen({ onBack, onContinue }: MedicationDetailsScreenProps) {
  const { draft, setMedication } = useOnboarding();
  const { medicationCatalog, refreshMedicationCatalog } = useLeanientData();
  const now = useRef(new Date()).current;
  const catalog = medicationCatalog.length ? medicationCatalog : mockMedicationCatalog;

  useEffect(() => {
    if (!medicationCatalog.length) {
      void refreshMedicationCatalog();
    }
  }, [medicationCatalog.length, refreshMedicationCatalog]);

  const view = useMemo(
    () =>
      deriveMedicationDetails({
        catalog,
        medicationCatalogId: draft.medicationProtocol.medicationCatalogId,
        medicationName: draft.medicationProtocol.medicationName,
      }),
    [catalog, draft.medicationProtocol.medicationCatalogId, draft.medicationProtocol.medicationName],
  );

  const [parts, setParts] = useState<DateParts>(() => toDateParts(now));
  const yearItems = useMemo<WheelItem[]>(
    () => startYearRange(now).map((y) => ({ label: String(y), value: y })),
    [now],
  );
  const dayItems = useMemo<WheelItem[]>(
    () => Array.from({ length: daysInMonth(parts.year, parts.month) }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
    [parts.year, parts.month],
  );

  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 520, easing: RISE_EASE, useNativeDriver: true }).start();
  }, [rise]);
  const bodyStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  const dateLabel = formatLongDate(clampToToday(parts, now));

  const handleContinue = () => {
    const startDate = toIsoDate(clampToToday(parts, now));
    setMedication({
      doseUnit: view.doseUnit,
      ...(view.doseAmount != null ? { doseAmount: view.doseAmount } : {}),
      startDate,
    });
    onContinue?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={0.18} onBack={onBack} />

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>When did you start {view.medName}?</Text>
            <Text style={styles.sub}>We'll time your weekly check-ins and progress from this date.</Text>
          </View>

          <View style={styles.eyebrowRow}>
            <Eyebrow>START DATE</Eyebrow>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
          </View>
          <View style={styles.wheelRow}>
            <View style={styles.wheelCol}>
              <Wheel
                items={MONTH_ITEMS}
                value={parts.month}
                onChange={(month) => setParts((p) => clampDay({ ...p, month }))}
                height={186}
                fontSize={19}
                centerScale={1.25}
              />
            </View>
            <View style={styles.wheelCol}>
              <Wheel
                key={`day-${parts.year}-${parts.month}`}
                items={dayItems}
                value={Math.min(parts.day, dayItems.length)}
                onChange={(day) => setParts((p) => ({ ...p, day }))}
                height={186}
                fontSize={19}
                centerScale={1.25}
              />
            </View>
            <View style={styles.wheelCol}>
              <Wheel
                items={yearItems}
                value={parts.year}
                onChange={(year) => setParts((p) => clampDay({ ...p, year }))}
                height={186}
                fontSize={19}
                centerScale={1.25}
              />
            </View>
          </View>

          <Eyebrow style={styles.doseEyebrow}>YOUR DOSE</Eyebrow>
          <View style={styles.doseCard}>
            <View style={styles.doseIcon}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" />
              </Svg>
            </View>
            <View style={styles.doseText}>
              <Text style={styles.doseValue}>{view.doseLabel}</Text>
              <Text style={styles.doseNote}>
                {view.hasDerivedAmount
                  ? `Starting dose, set from ${view.medName}. You can change it later in settings.`
                  : `Set automatically from ${view.medName}. You can fine-tune it later in settings.`}
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <Button label="Continue" onPress={handleContinue} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  titleBlock: { marginBottom: 8 },
  h1: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -0.75, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, letterSpacing: -0.16, color: colors.muted, marginTop: 10 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 6 },
  dateLabel: { fontFamily: font.semibold, fontSize: 14, letterSpacing: -0.14, color: colors.emeraldDeep },
  wheelRow: { flexDirection: "row", gap: 8 },
  wheelCol: { flex: 1 },
  doseEyebrow: { marginTop: 24, marginBottom: 12 },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(47,184,122,0.08)",
    borderWidth: 1,
    borderColor: "rgba(47,184,122,0.22)",
  },
  doseIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF7F1",
  },
  doseText: { flex: 1 },
  doseValue: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: colors.emeraldDeep },
  doseNote: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 2 },
  spacer: { flex: 1, minHeight: 18 },
});

export default MedicationDetailsScreen;
