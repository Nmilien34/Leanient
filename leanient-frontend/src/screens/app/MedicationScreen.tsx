import React from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect } from "react-native-svg";
import { WEEKDAYS, type PatchUserMedicationProtocolRequest, type Weekday } from "@leanient/shared";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockMedicationProtocol } from "../../mocks/home";
import { mockMedicationCatalog } from "../../mocks/medications";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { SettingGroup } from "../../components/app/SettingsRow";
import { Button } from "../../components/ui/Button";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { deriveMedication, type TitrationStep } from "./medicationMetrics";
import { sortShotDays } from "../../onboarding/shotDay";
import { persistMedicationEdit } from "./medicationSettings";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const WEEKDAY_LABEL = (d: Weekday): string => d.charAt(0).toUpperCase() + d.slice(1, 3);

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const Icons = {
  pill: ic(<><Rect x={3} y={8} width={18} height={8} rx={4} /><Path d="M12 8v8" /></>),
  cal: ic(<><Rect x={3} y={5} width={18} height={16} rx={3} /><Path d="M3 9h18M8 3v4M16 3v4" /></>),
};

function TitrationChip({ step }: { step: TitrationStep }) {
  if (step.state === "now") {
    return (
      <LinearGradient colors={["#2FB87A", "#1F9E63"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.chip, styles.chipNow]}>
        <Text style={[styles.chipText, styles.chipNowText]}>{step.label}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.chip, step.state === "future" && styles.chipFuture]}>
      <Text style={[styles.chipText, step.state === "future" ? styles.chipFutureText : styles.chipDoneText]}>{step.label}</Text>
    </View>
  );
}

interface MedicationScreenProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Open straight into the edit sheet (the Today-tab entry points use this).
   * In this mode, closing the sheet dismisses the whole screen, so it behaves
   * like a focused "edit schedule" editor instead of the settings overview.
   */
  startInEdit?: boolean;
}

/**
 * Settings · Medication & schedule (screen 26). Current med + dose + shot day +
 * next dose, and the titration ladder from the catalog. All from the user's
 * protocol via `deriveMedication`. "Edit schedule" opens an in-screen sheet that
 * persists shot day + dose via `patchMedicationProtocol`.
 */
export function MedicationScreen({ visible, onClose, startInEdit = false }: MedicationScreenProps) {
  const auth = useAuth();
  const data = useLeanientData();
  const refreshedForUserRef = React.useRef<string | null>(null);
  const protocol = data.medicationProtocol ?? mockMedicationProtocol;
  const catalog = data.medicationCatalog.length ? data.medicationCatalog : mockMedicationCatalog;
  const now = React.useRef(new Date()).current;
  const view = deriveMedication({ protocol, catalog, now });

  // Edit-schedule sheet. Shot day + dose amount are editable; medication and dose
  // unit stay fixed (changing the medication is a larger flow, and the unit is
  // catalog-bound). Start date editing is intentionally not included here.
  const [editing, setEditing] = React.useState(false);
  const [shotDaysInput, setShotDaysInput] = React.useState<Weekday[]>(protocol.shotDays);
  const [doseInput, setDoseInput] = React.useState(protocol.doseAmount != null ? String(protocol.doseAmount) : "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sheet = React.useRef(new Animated.Value(0)).current;
  const autoEditedRef = React.useRef(false);

  const toggleShotDay = (day: Weekday) => {
    setShotDaysInput((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : sortShotDays([...current, day]),
    );
  };

  const openEdit = () => {
    setShotDaysInput(protocol.shotDays);
    setDoseInput(protocol.doseAmount != null ? String(protocol.doseAmount) : "");
    setError(null);
    setEditing(true);
    Animated.timing(sheet, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeEdit = () => {
    if (saving) return;
    Animated.timing(sheet, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      setEditing(false);
      // In focused-edit mode the sheet IS the screen, so dismiss back to Home.
      if (startInEdit) onClose();
    });
  };
  const saveEdit = async () => {
    if (saving) return;
    const updates: PatchUserMedicationProtocolRequest = {};
    if (shotDaysInput.length === 0) {
      setError("Pick at least one shot day.");
      return;
    }
    const sortedInput = sortShotDays(shotDaysInput);
    if (JSON.stringify(sortedInput) !== JSON.stringify(sortShotDays(protocol.shotDays))) {
      updates.shotDays = sortedInput;
    }
    const doseTrim = doseInput.trim();
    if (doseTrim.length) {
      const parsed = Number(doseTrim);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Enter a dose greater than 0.");
        return;
      }
      if (parsed !== protocol.doseAmount) updates.doseAmount = parsed;
    }
    if (Object.keys(updates).length === 0) {
      closeEdit();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Persist, then refreshHomeData so the protocol (and Home) reflect the change.
      // On failure the sheet stays open with inputs preserved and the error shown.
      await persistMedicationEdit(updates, {
        patchMedicationProtocol: (body) => apiService.patchMedicationProtocol(body),
        refresh: () => data.refreshHomeData(),
      });
      setSaving(false);
      Animated.timing(sheet, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        setEditing(false);
        if (startInEdit) onClose();
      });
    } catch (e) {
      setError(extractApiError(e).message);
      setSaving(false);
    }
  };

  React.useEffect(() => {
    const userId = auth.user?.id;

    if (!visible || !userId || refreshedForUserRef.current === userId) {
      return;
    }

    refreshedForUserRef.current = userId;
    void data.refreshMedicationCatalog();
  }, [auth.user?.id, data.refreshMedicationCatalog, visible]);

  // Today-tab entry points open straight into the edit sheet. Reset the latch
  // when the screen closes so reopening re-triggers it.
  React.useEffect(() => {
    if (!visible) {
      autoEditedRef.current = false;
      return;
    }
    if (startInEdit && !autoEditedRef.current) {
      autoEditedRef.current = true;
      openEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openEdit reopens the sheet on identity change; gate on visible + startInEdit only
  }, [visible, startInEdit]);

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
            <Text style={styles.headTitle}>Medication & schedule</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* current */}
            <View style={styles.current}>
              <Text style={styles.currentEyebrow}>CURRENT</Text>
              <View style={styles.frow}>
                <LinearGradient colors={["#9AC8E0", "#5E93B6"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x={3} y={8} width={18} height={8} rx={4} />
                    <Path d="M12 8v8" />
                  </Svg>
                </LinearGradient>
                <View style={styles.flex}>
                  <Text style={styles.ftitle}>
                    {view.medicationName} · {view.doseLabel}
                  </Text>
                  <Text style={styles.fsub}>{view.currentSummary}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.glabel}>DETAILS</Text>
            <SettingGroup
              rows={[
                { key: "med", icon: Icons.pill, label: "Medication", value: view.medicationName },
                { key: "dose", icon: Icons.pill, label: "Current dose", value: view.doseLabel, onPress: openEdit },
                { key: "shotday", icon: Icons.cal, label: "Shot day", value: view.shotDayName, onPress: openEdit },
                { key: "started", icon: Icons.cal, label: "Started", value: view.startedLabel },
              ]}
            />

            {view.titration.length ? (
              <>
                <View style={styles.titHead}>
                  <Text style={styles.glabelInline}>TITRATION</Text>
                  <Text style={styles.titAdjust}>Adjust ›</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Adjust your dose"
                  onPress={openEdit}
                  style={({ pressed }) => [styles.titCard, pressed && styles.titCardPressed]}
                >
                  <View style={styles.titRow}>
                    {view.titration.map((step, i) => (
                      <React.Fragment key={step.value}>
                        <TitrationChip step={step} />
                        {i < view.titration.length - 1 ? <Text style={styles.titArrow}>›</Text> : null}
                      </React.Fragment>
                    ))}
                  </View>
                </Pressable>
              </>
            ) : null}

            <Pressable accessibilityRole="button" accessibilityLabel="Edit schedule" onPress={openEdit} style={styles.btn2}>
              <Text style={styles.btn2Text}>Edit schedule</Text>
            </Pressable>
            <Text style={styles.disc}>Leanient tunes your workouts to this schedule. Talk to your prescriber before changing your dose.</Text>
          </ScrollView>
        </ModalSafeArea>

        {editing ? (
          <View style={styles.overlay}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: sheet }]}>
              <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={closeEdit} />
            </Animated.View>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }]}>
              <View style={styles.grabber} />
              <Text style={styles.sheetTitle}>Edit schedule</Text>

              <Text style={styles.fieldLabel}>SHOT DAYS</Text>
              <View style={styles.dayRow}>
                {WEEKDAYS.map((d) => {
                  const on = shotDaysInput.includes(d);
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={d}
                      onPress={() => toggleShotDay(d)}
                      disabled={saving}
                      style={[styles.dayChip, on && styles.dayChipOn]}
                    >
                      <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{WEEKDAY_LABEL(d)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>DOSE</Text>
              <View style={styles.doseRow}>
                <TextInput
                  style={styles.doseInput}
                  value={doseInput}
                  onChangeText={setDoseInput}
                  placeholder="0"
                  placeholderTextColor={colors.faint}
                  keyboardType="decimal-pad"
                  editable={!saving}
                  accessibilityLabel="Dose amount"
                />
                <Text style={styles.doseUnit}>{protocol.doseUnit}</Text>
              </View>

              {error ? <Text style={styles.sheetError}>{error}</Text> : null}
              <Button label="Save" onPress={() => void saveEdit()} loading={saving} disabled={saving} style={styles.sheetCta} />
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={closeEdit} disabled={saving} style={styles.sheetCancel}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
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
  current: { marginHorizontal: 20, marginTop: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  currentEyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.84, color: colors.amberDeep },
  frow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 10 },
  fic: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  ftitle: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: colors.ink },
  fsub: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 2 },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  titHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  glabelInline: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint },
  titAdjust: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  titCard: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 15 },
  titCardPressed: { opacity: 0.85 },
  titRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  chip: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: "#EEF7F1" },
  chipNow: { shadowColor: "rgba(31,158,99,1)", shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, shadowOpacity: 0.5, elevation: 4 },
  chipFuture: { backgroundColor: "#EFEEE9" },
  chipText: { fontFamily: font.bold, fontSize: 12.5 },
  chipDoneText: { color: colors.emeraldDeep },
  chipNowText: { color: "#fff" },
  chipFutureText: { color: colors.faint },
  titArrow: { fontFamily: font.regular, fontSize: 13, color: colors.faintest },
  btn2: { marginHorizontal: 20, marginTop: 18, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.10)", borderWidth: 1.5, borderColor: "rgba(47,184,122,0.35)" },
  btn2Text: { fontFamily: font.semibold, fontSize: 15, color: colors.emeraldDeep },
  disc: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: colors.faint, textAlign: "center", paddingHorizontal: 28, paddingTop: 14 },
  // edit-schedule sheet
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(24,28,24,0.32)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    shadowColor: "rgba(12,16,11,1)",
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 24,
    shadowOpacity: 0.18,
    elevation: 16,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.faintest, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginBottom: 6 },
  fieldLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, marginTop: 16, marginBottom: 10 },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  dayChip: { minWidth: 44, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 11, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line, alignItems: "center" },
  dayChipOn: { backgroundColor: "rgba(47,184,122,0.10)", borderColor: colors.emeraldDeep },
  dayChipText: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  dayChipTextOn: { color: colors.emeraldDeep },
  doseRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  doseInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  doseUnit: { fontFamily: font.semibold, fontSize: 15, color: colors.muted, minWidth: 36 },
  sheetError: { fontFamily: font.medium, fontSize: 13, color: "#C2554E", marginTop: 12 },
  sheetCta: { marginTop: 20 },
  sheetCancel: { alignSelf: "center", paddingVertical: 12, marginTop: 4 },
  sheetCancelText: { fontFamily: font.medium, fontSize: 14, color: colors.faint },
});

export default MedicationScreen;
