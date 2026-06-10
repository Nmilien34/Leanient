import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { LogoMark } from "../../components/brand/LogoMark";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { suggestFeatureMailto } from "./helpLinks";

/* ------------------------------------------------------------------ icons */

const ic = (children: React.ReactNode) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

const Icons = {
  verdict: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M8.3 12.4l2.4 2.4 4.9-5.2" /></>),
  checkin: ic(<><Path d="M9 4h6M9 4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" /><Path d="M9.5 13l2 2 3.5-4" /></>),
  focus: ic(<><Circle cx={12} cy={12} r={9} /><Circle cx={12} cy={12} r={4.5} /><Circle cx={12} cy={12} r={1} /></>),
  meal: ic(<><Path d="M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><Circle cx={12} cy={12.5} r={3.5} /></>),
  train: ic(<><Path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></>),
  dose: ic(<><Path d="M12 2v4M9 4h6" /><Path d="M9 6h6v11a3 3 0 0 1-6 0z" /><Path d="M12 17v5" /></>),
  progress: ic(<><Path d="M4 19h16" /><Path d="M5 15l4-4 3 2.5L19 7" /><Path d="M15.5 7H19v3.5" /></>),
  coach: ic(<Path d="M12 3l1.7 6.1L20 11l-6.3 1.9L12 19l-1.7-6.1L4 11l6.3-1.9z" />),
};

function Spark() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

/* ---------------------------------------------------------------- visuals */

/** Miniature of the Home verdict card. */
function VerdictMock() {
  return (
    <View style={styles.mockCard}>
      <Text style={styles.mockEyebrow}>THIS WEEK'S VERDICT</Text>
      <View style={styles.mockPillRow}>
        <View style={styles.mockPill}>
          <Text style={styles.mockPillText}>Keeping your muscle</Text>
        </View>
      </View>
      <View style={styles.mockBarTrack}>
        <View style={styles.mockBarFill} />
      </View>
      <Text style={styles.mockFoot}>Protein on pace · 3 of 3 sessions · weight moving</Text>
    </View>
  );
}

/** Miniature of the Today protein ring. */
function ProteinRingMock() {
  const r = 34;
  const c = 2 * Math.PI * r;
  const progress = 0.66;
  return (
    <View style={[styles.mockCard, styles.mockRowCard]}>
      <Svg width={84} height={84} viewBox="0 0 84 84">
        <Circle cx={42} cy={42} r={r} stroke={colors.line} strokeWidth={8} fill="none" />
        <Circle
          cx={42}
          cy={42}
          r={r}
          stroke={colors.emerald}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * progress} ${c}`}
          transform="rotate(-90 42 42)"
        />
      </Svg>
      <View style={styles.mockRingText}>
        <Text style={styles.mockEyebrow}>PROTEIN TODAY</Text>
        <Text style={styles.mockBig}>92g of 140g</Text>
        <Text style={styles.mockFoot}>Every logged meal fills the ring.</Text>
      </View>
    </View>
  );
}

/** Miniature coach exchange. */
function ChatMock() {
  return (
    <View style={styles.mockChat}>
      <View style={styles.mockUserBubble}>
        <Text style={styles.mockUserText}>Why has the scale been quiet?</Text>
      </View>
      <View style={styles.mockCoachBubble}>
        <View style={styles.mockCoachMark}>
          <View style={styles.mockCoachDot}>
            <Spark />
          </View>
          <Text style={styles.mockCoachLabel}>LEANIENT COACH</Text>
        </View>
        <Text style={styles.mockCoachText}>
          Your protein slipped from 140g to 95g this week and training paused. The medication is
          still working. Let's fix the inputs.
        </Text>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- section */

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  why: string;
  children: React.ReactNode;
  visual?: React.ReactNode;
}

function Section({ icon, title, why, children, visual }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.iconTile}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.whyCard}>
        <Text style={styles.whyLabel}>WHY WE BUILT IT</Text>
        <Text style={styles.whyText}>{why}</Text>
      </View>
      {visual}
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

/* ----------------------------------------------------------------- screen */

interface GettingStartedScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Help & support · Getting started. The in-app guide: why Leanient
 * exists, why each part of the app was built, what it does, and how it helps.
 * Ends with the feature-suggestion invitation.
 */
export function GettingStartedScreen({ visible, onClose }: GettingStartedScreenProps) {
  if (!visible) return null;

  const suggest = () => Linking.openURL(suggestFeatureMailto());

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
          <Text style={styles.headTitle}>Getting started</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* hero */}
          <View style={styles.hero}>
            <LogoMark size={40} />
            <Text style={styles.h1}>Lose the fat.{"\n"}Keep yourself intact.</Text>
            <Text style={styles.lede}>
              On GLP-1 medication, weight comes off fast. Without attention, 25 to 39 percent of
              what you lose can be muscle. Most apps track injections and count calories. Leanient
              coaches the outcome that actually matters: keeping your muscle while the fat goes.
              Here is how each part of the app works toward that, and why it exists.
            </Text>
          </View>

          <Section
            icon={Icons.verdict}
            title="The Weekly Verdict"
            why="A week of logging produces a pile of numbers. You deserve one clear answer."
            visual={<VerdictMock />}
          >
            Every week Leanient weighs your weight change, protein intake, and resistance training,
            then renders a verdict: are you keeping your muscle, and what is the single most
            important thing to do next. It is a conservative estimate built entirely from your own
            logs, with a plain explanation of why you got the result you got. Tap the verdict card
            on Home to read it, and open What changed to see how this week moved against last week.
          </Section>

          <Section
            icon={Icons.checkin}
            title="The weekly check-in"
            why="Trends are only as good as their heartbeat. One short check-in a week keeps yours steady."
          >
            The check-in takes about a minute: your weight, how protein went, how many resistance
            sessions you completed, and how your energy felt. It feeds the verdict, the muscle
            retention chart, and the coach. Do it on the same day each week if you can. Every past
            check-in and its verdict stays browsable under Progress, so you can scroll back through
            your whole journey.
          </Section>

          <Section
            icon={Icons.focus}
            title="Home and Today's Focus"
            why="The hardest question on a GLP-1 journey is what matters today. Home answers it."
            visual={<ProteinRingMock />}
          >
            Home opens with your verdict, your dose cycle position, and a Today's Focus card that
            reads your data and picks the one action with the highest payoff right now: a specific
            meal idea when protein is behind, a short session when training will protect the week,
            or rest when your body needs it. Switch the toggle to Today to see your protein ring
            and everything you have logged. Tap any logged meal to reopen its photo and what the
            coach said about it.
          </Section>

          <Section
            icon={Icons.meal}
            title="Meal scanning"
            why="Appetite suppression makes protein the scarcest resource in your day. Counting it should take seconds."
          >
            Point the camera at your plate and Leanient estimates the macros, with protein accuracy
            treated as the priority. The coach then reads the meal against your day so far. When
            you are on pace, it says so with your real numbers. When the meal leaves you short, it
            proposes a specific swap: an exact addition that closes the protein gap while staying
            inside your calorie ceiling. Log it as is, add the swap, or talk to your coach about it
            right from the result.
          </Section>

          <Section
            icon={Icons.train}
            title="Train"
            why="Resistance training is the strongest lever you have for keeping muscle. Your energy follows your shot cycle, so your training should too."
          >
            The Train tab recommends a session tuned to where you are in your dose week, your
            energy, and how the week is tracking: short mobility on heavy days, strength work when
            you have it in you. The player walks you through each exercise. Hold the dumbbell icon
            for two seconds to complete a set and start your rest. Every session saves to your
            history, and even fifteen minutes counts toward the weekly stimulus your muscle needs.
          </Section>

          <Section
            icon={Icons.dose}
            title="Dose logging"
            why="Your shot day shapes your appetite, your energy, and your best training days. The app plans around it."
          >
            Log each dose as you take it. Home then shows where you are in your cycle, and
            recommendations adapt to it: gentler on the days right after your shot, more ambitious
            when energy returns. Leanient never advises on dosing itself. Amounts, timing, and
            changes belong with your prescriber. The log exists so your coaching fits your real
            week.
          </Section>

          <Section
            icon={Icons.progress}
            title="Progress"
            why="The scale alone hides the thing you most need to see: where the loss is coming from."
          >
            Progress charts your muscle retention trend next to your weight curve, keeps every
            weekly check-in and verdict browsable, and stores your progress photos. The photos
            matter more than they seem. The mirror often shows what the scale misses. And when the
            scale goes quiet, ask the coach from this tab and it will explain why using your own
            numbers.
          </Section>

          <Section
            icon={Icons.coach}
            title="Your coach"
            why="Numbers tell you what happened. A coach explains why, and what to do about it."
            visual={<ChatMock />}
          >
            The Leanient coach is a chat grounded in your actual data: your verdict, weight trend,
            recent meals and workouts, protein targets, and dose logging rhythm. Ask why the scale
            stalled, what to eat tonight, or how to protect your muscle this week, and the answer
            is about you, with your numbers in it. One hard boundary: anything about dose changes,
            symptoms, or side effects gets redirected to your prescriber, where it belongs.
          </Section>

          {/* suggestion CTA */}
          <LinearGradient
            colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.suggestCard}
          >
            <Text style={styles.suggestTitle}>Help us build what's next</Text>
            <Text style={styles.suggestBody}>
              Leanient grows from what its users ask for. The coach chat, meal details, and parts
              of this guide all started as suggestions. If something would make your journey
              easier, tell us what you would like us to build and we will build it.
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Suggest a feature" onPress={suggest}>
              <LinearGradient
                colors={["#4ECF8B", "#2DB87A", "#1F9E63"]}
                locations={[0, 0.56, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.suggestBtn}
              >
                <Text style={styles.suggestBtnText}>Suggest a feature</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
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

  hero: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, gap: 12 },
  h1: { fontFamily: font.extrabold, fontSize: 27, lineHeight: 32, letterSpacing: -0.81, color: colors.ink },
  lede: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: colors.inkSoft },

  section: { paddingHorizontal: 20, paddingTop: 26 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconTile: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.12)" },
  sectionTitle: { fontFamily: font.bold, fontSize: 18, letterSpacing: -0.36, color: colors.ink },
  whyCard: { marginTop: 10, borderLeftWidth: 3, borderLeftColor: colors.emerald, paddingLeft: 12, paddingVertical: 2 },
  whyLabel: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.99, color: colors.emeraldDeep },
  whyText: { fontFamily: font.medium, fontSize: 14.5, lineHeight: 21, color: colors.ink, marginTop: 3 },
  body: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 22, color: colors.inkSoft, marginTop: 12 },

  /* mocks */
  mockCard: { marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14 },
  mockRowCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  mockRingText: { flex: 1, gap: 3 },
  mockEyebrow: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.95, color: colors.muted },
  mockBig: { fontFamily: font.extrabold, fontSize: 19, letterSpacing: -0.38, color: colors.ink },
  mockPillRow: { flexDirection: "row", marginTop: 8 },
  mockPill: { backgroundColor: "rgba(47,184,122,0.14)", borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12 },
  mockPillText: { fontFamily: font.bold, fontSize: 14, color: colors.emeraldDeep },
  mockBarTrack: { height: 7, borderRadius: 4, backgroundColor: colors.line, marginTop: 12, overflow: "hidden" },
  mockBarFill: { width: "78%", height: "100%", borderRadius: 4, backgroundColor: colors.emerald },
  mockFoot: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 8 },

  mockChat: { marginTop: 12, gap: 8 },
  mockUserBubble: { alignSelf: "flex-end", maxWidth: "82%", backgroundColor: colors.emeraldDeep, borderRadius: 16, borderTopRightRadius: 5, paddingHorizontal: 13, paddingVertical: 9 },
  mockUserText: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: "#F4FBF7" },
  mockCoachBubble: { alignSelf: "flex-start", maxWidth: "88%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, borderTopLeftRadius: 5, paddingHorizontal: 13, paddingVertical: 10 },
  mockCoachMark: { flexDirection: "row", alignItems: "center", gap: 6 },
  mockCoachDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  mockCoachLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.6, color: colors.emeraldDeep },
  mockCoachText: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19.5, color: colors.ink, marginTop: 6 },

  /* suggestion CTA */
  suggestCard: { marginHorizontal: 20, marginTop: 30, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 18 },
  suggestTitle: { fontFamily: font.extrabold, fontSize: 20, letterSpacing: -0.4, color: colors.ink },
  suggestBody: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 22, color: colors.inkSoft, marginTop: 8 },
  suggestBtn: { marginTop: 14, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  suggestBtnText: { fontFamily: font.semibold, fontSize: 15, color: "#F4FBF7" },
});

export default GettingStartedScreen;
