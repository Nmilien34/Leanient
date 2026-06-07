import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { useLeanientData } from "../../context/LeanientDataContext";
import { mockProfile } from "../../mocks/home";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { UNIT_GROUPS, persistWeightUnit, systemFromWeightUnit, type UnitSystem } from "./unitSettings";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function RadioRow({ label, selected, onPress, last, disabled }: { label: string; selected: boolean; onPress: () => void; last?: boolean; disabled?: boolean }) {
  return (
    <>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: Boolean(disabled) }}
        accessibilityLabel={label}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      </Pressable>
      {!last ? <View style={styles.divider} /> : null}
    </>
  );
}

interface UnitsScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Units (screen 28). One unit system (imperial/metric) seeded from
 * `profile.goalWeightUnit`, shown as the weight/height/energy radio groups,
 * which stay in sync. Selecting any option switches the whole system.
 */
export function UnitsScreen({ visible, onClose }: UnitsScreenProps) {
  const data = useLeanientData();
  const profile = data.profile ?? mockProfile;
  const [system, setSystem] = useState<UnitSystem>(() => systemFromWeightUnit(profile.goalWeightUnit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist the units change. Optimistic: the radios flip immediately. On failure
  // we revert to the prior system and surface the error inline (no retry queue).
  // On success refreshHomeData() reconciles the context profile so the rest of the
  // app reflects the new unit.
  const changeSystem = async (next: UnitSystem) => {
    if (saving || next === system) return;
    const previous = system;
    setSystem(next);
    setSaving(true);
    setError(null);
    try {
      await persistWeightUnit(next, {
        patchProfile: (body) => apiService.patchProfile(body),
        refresh: () => data.refreshHomeData(),
      });
    } catch (e) {
      setSystem(previous);
      setError(extractApiError(e).message);
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
            <Text style={styles.headTitle}>Units</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {UNIT_GROUPS.map((group) => (
              <View key={group.title}>
                <Text style={styles.glabel}>{group.title}</Text>
                <View style={styles.group}>
                  <RadioRow label={group.imperial} selected={system === "imperial"} onPress={() => void changeSystem("imperial")} disabled={saving} />
                  <RadioRow label={group.metric} selected={system === "metric"} onPress={() => void changeSystem("metric")} disabled={saving} last />
                </View>
              </View>
            ))}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
        </ModalSafeArea>
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
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  group: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 15, paddingHorizontal: 16 },
  pressed: { backgroundColor: colors.sageFill },
  label: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  radio: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: colors.faintest, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.emeraldDeep },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.emeraldDeep },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 16 },
  error: { fontFamily: font.medium, fontSize: 13, color: "#C2554E", textAlign: "center", marginTop: 16, paddingHorizontal: 22 },
});

export default UnitsScreen;
