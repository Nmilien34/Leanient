import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  label: string;
  items: FaqItem[];
}

const FAQ: FaqGroup[] = [
  {
    label: "THE BASICS",
    items: [
      {
        q: "Is Leanient a medical app?",
        a: "Leanient is a behavior coach. It reads what you log, weighs it, and tells you the one action that best protects your muscle. It never gives medical advice. Anything about dosing, symptoms, or side effects belongs with your prescriber, and the app will say so every time you ask.",
      },
      {
        q: "Do I need to be on a GLP-1 medication to use it?",
        a: "The app is built around the GLP-1 journey: shot cycles, appetite suppression, and the muscle-loss risk that comes with fast weight loss. The coaching assumes that context, so it works best when you are on one.",
      },
      {
        q: "How much do I need to log?",
        a: "The weekly check-in is the floor. Everything else, meals, workouts, and doses, sharpens the picture. More logging means a more accurate verdict and a coach that knows you better, but a one-minute check-in each week keeps the engine running.",
      },
    ],
  },
  {
    label: "THE VERDICT",
    items: [
      {
        q: "What do the verdict states mean?",
        a: "Keeping muscle means your pace, protein, and training lined up this week. Drifting means the week is recoverable with one correction. Losing muscle means the week needs a real change before pushing harder on weight loss. Each verdict comes with the single next action that helps most.",
      },
      {
        q: "Why does my verdict say still gathering?",
        a: "The engine refuses to guess. Until your first weekly check-in lands, there is no verdict to render. Complete a check-in and your first verdict appears with it.",
      },
      {
        q: "I had a rough week. Did I ruin my progress?",
        a: "The score resets every week, so a rough week costs points, never your progress. The verdict exists to catch a drift early, hand you one fix, and let next week be winnable.",
      },
    ],
  },
  {
    label: "LOGGING",
    items: [
      {
        q: "How accurate is meal scanning?",
        a: "The scan estimates macros from the photo, with protein treated as the number that matters most. Estimates are good for coaching and imperfect by nature. The confidence badge tells you how sure the scan is, and you can adjust the portion before logging.",
      },
      {
        q: "What counts as a resistance session?",
        a: "Any session that loads your muscles: a guided strength workout from the Train tab, dumbbells at home, a gym session, or focused bodyweight work. Duration matters less than the signal. Even fifteen minutes counts toward your weekly target.",
      },
      {
        q: "Why log doses if the app never advises on them?",
        a: "Your shot day shapes your appetite, energy, and best training days. Logging doses lets Home show where you are in your cycle and lets workout recommendations adapt to it. The log tunes your coaching. It never feeds dosing advice.",
      },
    ],
  },
  {
    label: "THE COACH",
    items: [
      {
        q: "What does the coach know about me?",
        a: "Your coach answers from your own data: your verdict, weight trend, protein targets, recent meals and workouts, and dose logging rhythm. That is why its answers cite your numbers instead of generic advice.",
      },
      {
        q: "What will the coach refuse to answer?",
        a: "Anything clinical. Dose changes, symptoms, side effects, and drug interactions get redirected to your prescriber, every time. That boundary is deliberate and permanent.",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        q: "Who can see my data?",
        a: "Your data belongs to your account and is used for one purpose: coaching you. It powers your verdict, your charts, and your coach.",
      },
      {
        q: "What is included in Premium?",
        a: "The coach chat and the stall diagnostic are part of Premium, along with the full coaching loop. The trial gives you everything so you can feel the difference before deciding.",
      },
    ],
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.muted}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}
    >
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

interface FaqScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Help & support · FAQ. Grouped questions with tap-to-expand
 * answers, written in the coach's voice.
 */
export function FaqScreen({ visible, onClose }: FaqScreenProps) {
  const [open, setOpen] = useState<string | null>(null);

  if (!visible) return null;

  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.head}>
          <Pressable accessibilityLabel="Back" onPress={onClose} style={styles.backBtn}>
            <Svg width={10} height={17} viewBox="0 0 10 17" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M8.5 1.5L1.5 8.5l7 7" />
            </Svg>
          </Pressable>
          <Text style={styles.headTitle}>FAQ</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {FAQ.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.groupCard}>
                {group.items.map((item, index) => {
                  const key = `${group.label}-${index}`;
                  const isOpen = open === key;
                  return (
                    <View key={key} style={index > 0 && styles.itemDivider}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.q}
                        onPress={() => toggle(key)}
                        style={styles.qRow}
                      >
                        <Text style={styles.qText}>{item.q}</Text>
                        <Chevron open={isOpen} />
                      </Pressable>
                      {isOpen ? <Text style={styles.aText}>{item.a}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 60 },
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },

  groupLabel: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 },
  groupCard: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 14 },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  qRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 13 },
  qText: { flex: 1, fontFamily: font.semibold, fontSize: 14.5, lineHeight: 20, color: colors.ink },
  aText: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.inkSoft, paddingBottom: 14 },
});

export default FaqScreen;
