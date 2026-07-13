import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
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
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface MedicationDetailsScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

const MONTH_ITEMS: WheelItem[] = MONTHS_SHORT.map((label, value) => ({ label, value }));

/**
 * Start date + dose, as a conversation turn. Fills the contract's required
 * `startDate` + `doseUnit`; the dose is derived from the chosen medication's
 * catalog entry. The light Wheel pickers sit on a paper panel — an input
 * surface on the ink ground — so the shared Wheel stays untouched.
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
    <ConvoScreen
      progress={onboardingProgress("medicationDetails")}
      onBack={onBack}
      context={`${view.medName}. Got it.`}
      question="When did you start?"
      sub="Your check-ins and progress are timed from this date."
      footer={<ConvoButton label="Continue" onPress={handleContinue} />}
    >
      <View style={styles.labelRow}>
        <Text style={styles.eyebrow}>START DATE</Text>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
      </View>
      <View style={styles.panel}>
        <View style={styles.wheelRow}>
          <View style={styles.wheelCol}>
            <Wheel
              items={MONTH_ITEMS}
              value={parts.month}
              onChange={(month) => setParts((p) => clampDay({ ...p, month }))}
              height={178}
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
              height={178}
              fontSize={19}
              centerScale={1.25}
            />
          </View>
          <View style={styles.wheelCol}>
            <Wheel
              items={yearItems}
              value={parts.year}
              onChange={(year) => setParts((p) => clampDay({ ...p, year }))}
              height={178}
              fontSize={19}
              centerScale={1.25}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.eyebrow, styles.doseEyebrow]}>YOUR DOSE</Text>
      <View style={styles.doseCard}>
        <View style={styles.doseIcon}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={ink.emeraldHi} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 8 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.99, color: ink.faint },
  dateLabel: { fontFamily: font.semibold, fontSize: 14, letterSpacing: -0.14, color: ink.emeraldHi },
  panel: {
    borderRadius: 20,
    backgroundColor: colors.paper,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  wheelRow: { flexDirection: "row", gap: 8 },
  wheelCol: { flex: 1 },
  doseEyebrow: { marginTop: 24, marginBottom: 10 },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(47,184,122,0.12)",
    borderWidth: 1,
    borderColor: "rgba(111,224,166,0.30)",
  },
  doseIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(238,244,234,0.10)",
  },
  doseText: { flex: 1 },
  doseValue: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: ink.emeraldHi },
  doseNote: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink.soft, marginTop: 2 },
});

export default MedicationDetailsScreen;
