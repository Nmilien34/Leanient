import React, { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { loadPhotoDay, savePhotoDay, type PhotoDay } from "./settingsPrefs";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const OPTIONS: Array<{ value: PhotoDay; label: string; sub?: string }> = [
  { value: "shot_day", label: "Shot day", sub: "Recommended. Rides your weekly ritual." },
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

interface PhotoDaySettingScreenProps {
  visible: boolean;
  onClose: () => void;
  onChanged?: (day: PhotoDay) => void;
}

/**
 * Settings · Photo day: the one fixed day per week the optional progress
 * photo card appears. Same day each week keeps the photos comparable.
 */
export function PhotoDaySettingScreen({ visible, onClose, onChanged }: PhotoDaySettingScreenProps) {
  const [day, setDay] = useState<PhotoDay>("shot_day");

  useEffect(() => {
    if (!visible) return;
    void loadPhotoDay().then(setDay);
  }, [visible]);

  const pick = (next: PhotoDay) => {
    setDay(next);
    void savePhotoDay(next);
    onChanged?.(next);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <Text style={styles.headTitle}>Photo day</Text>
            <View style={styles.backBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.lede}>
              One day a week, the photo card appears under your plan. Same day, same light keeps
              your timeline comparable.
            </Text>

            <View style={styles.group}>
              {OPTIONS.map((option, i) => {
                const on = day === option.value;
                return (
                  <React.Fragment key={option.value}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={option.label}
                      onPress={() => pick(option.value)}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={styles.rowBody}>
                        <Text style={styles.rowLabel}>{option.label}</Text>
                        {option.sub ? <Text style={styles.rowSub}>{option.sub}</Text> : null}
                      </View>
                      <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                    </Pressable>
                    {i < OPTIONS.length - 1 ? <View style={styles.divider} /> : null}
                  </React.Fragment>
                );
              })}
            </View>
          </ScrollView>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  lede: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.muted, paddingHorizontal: 2, paddingBottom: 12 },
  group: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 15 },
  rowPressed: { backgroundColor: "#F4F8F2" },
  rowBody: { flex: 1 },
  rowLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: font.medium, fontSize: 11.5, color: colors.faint, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 15 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faintest, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.emerald },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.emerald },
});

export default PhotoDaySettingScreen;
