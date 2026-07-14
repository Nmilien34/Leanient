import React, { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { loadCoachStyle, saveCoachStyle, type CoachStyle } from "./settingsPrefs";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const PREVIEWS: Record<CoachStyle, { title: string; sample: string; sub: string }> = {
  gentle: {
    title: "Gentle",
    sample: "“Day 5 tonight. Hunger is normal, and you've beaten it before. Protein early.”",
    sub: "Reassurance first, then the move.",
  },
  straight: {
    title: "Straight",
    sample: "“Day 5. Hunger window tonight. 79g before 2pm. Walk after dinner.”",
    sub: "The move, no cushioning.",
  },
};

interface CoachStyleScreenProps {
  visible: boolean;
  onClose: () => void;
  /** Reports the saved choice so the hub row updates in place. */
  onChanged?: (style: CoachStyle) => void;
}

/**
 * Settings · Coach style: pick the voice. Same plan, same math, your kind of
 * voice. Stored on device; copy surfaces read it as they adopt the pref.
 */
export function CoachStyleScreen({ visible, onClose, onChanged }: CoachStyleScreenProps) {
  const [style, setStyle] = useState<CoachStyle>("gentle");

  useEffect(() => {
    if (!visible) return;
    void loadCoachStyle().then(setStyle);
  }, [visible]);

  const pick = (next: CoachStyle) => {
    setStyle(next);
    void saveCoachStyle(next);
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
            <Text style={styles.headTitle}>Coach style</Text>
            <View style={styles.backBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.lede}>How should I talk to you? Same plan, same math, your kind of voice.</Text>

            {(Object.keys(PREVIEWS) as CoachStyle[]).map((key) => {
              const preview = PREVIEWS[key];
              const on = style === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={preview.title}
                  onPress={() => pick(key)}
                  style={[styles.card, on && styles.cardOn]}
                >
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>{preview.title}</Text>
                    {on ? (
                      <View style={styles.check}>
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 12.5l5 5 9-11" />
                        </Svg>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.sample}>
                    <Text style={styles.sampleText}>{preview.sample}</Text>
                  </View>
                  <Text style={styles.cardSub}>{preview.sub}</Text>
                </Pressable>
              );
            })}

            <Text style={styles.note}>Your daily plan and verdict stay identical. Only the voice changes.</Text>
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
  card: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  cardOn: {
    borderColor: colors.emerald,
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    shadowOpacity: 0.16,
    elevation: 3,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontFamily: font.extrabold, fontSize: 16.5, letterSpacing: -0.25, color: colors.ink },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center" },
  sample: { backgroundColor: colors.sageFill, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11, marginTop: 8 },
  sampleText: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.muted },
  cardSub: { fontFamily: font.medium, fontSize: 12, color: colors.faint, marginTop: 8 },
  note: { fontFamily: font.medium, fontSize: 12, lineHeight: 17, color: colors.faint, paddingHorizontal: 2, paddingTop: 6 },
});

export default CoachStyleScreen;
