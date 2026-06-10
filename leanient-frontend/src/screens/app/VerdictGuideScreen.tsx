import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ic = (children: React.ReactNode) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

const Icons = {
  scale: ic(<><Path d="M12 3v3M7 6h10l2 13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /><Path d="M9.5 11a2.5 2.5 0 0 0 5 0" /></>),
  protein: ic(<><Path d="M7 3h10v4a5 5 0 0 1-10 0z" /><Path d="M12 12v9M9 21h6" /></>),
  train: ic(<><Path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></>),
  source: ic(<><Path d="M4 6h16M4 12h16M4 18h10" /></>),
  honest: ic(<><Circle cx={12} cy={12} r={9} /><Path d="M12 8v5M12 16.5v.5" /></>),
};

/** The score bands, drawn as a segmented bar with labels. */
function ScoreBands() {
  return (
    <View style={styles.bandsCard}>
      <Text style={styles.bandsEyebrow}>YOUR WEEKLY SCORE, 0 TO 100</Text>
      <View style={styles.bandsBar}>
        <View style={[styles.bandSeg, { flex: 55, backgroundColor: colors.slate }]} />
        <View style={[styles.bandSeg, { flex: 25, backgroundColor: colors.amber }]} />
        <View style={[styles.bandSeg, { flex: 20, backgroundColor: colors.emerald }]} />
      </View>
      <View style={styles.bandsLabels}>
        <View style={styles.bandLabel}>
          <View style={[styles.bandDot, { backgroundColor: colors.slate }]} />
          <Text style={styles.bandText}>Under 55 · Losing muscle</Text>
        </View>
        <View style={styles.bandLabel}>
          <View style={[styles.bandDot, { backgroundColor: colors.amber }]} />
          <Text style={styles.bandText}>55 to 79 · Drifting</Text>
        </View>
        <View style={styles.bandLabel}>
          <View style={[styles.bandDot, { backgroundColor: colors.emerald }]} />
          <Text style={styles.bandText}>80 and up · Keeping muscle</Text>
        </View>
      </View>
    </View>
  );
}

interface FactorProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Factor({ icon, title, children }: FactorProps) {
  return (
    <View style={styles.factor}>
      <View style={styles.iconTile}>{icon}</View>
      <View style={styles.factorText}>
        <Text style={styles.factorTitle}>{title}</Text>
        <Text style={styles.factorBody}>{children}</Text>
      </View>
    </View>
  );
}

interface VerdictGuideScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings · Help & support · How the verdict works. A plain-language,
 * honest walkthrough of the verdict engine: the inputs, the score bands,
 * where the data comes from, and what the verdict is and is not.
 */
export function VerdictGuideScreen({ visible, onClose }: VerdictGuideScreenProps) {
  if (!visible) return null;

  return (
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
          <Text style={styles.headTitle}>How the verdict works</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.h1}>One score, one answer, once a week.</Text>
            <Text style={styles.lede}>
              Every week starts at a score of 100. The engine then looks at three things from your
              own logs and check-in, subtracts points where your muscle was put at risk, and turns
              the result into a verdict with one next action. Nothing is hidden. Here is exactly
              what moves the score.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>THE THREE INPUTS</Text>

          <Factor icon={Icons.scale} title="Weight loss pace">
            Fast loss is where muscle goes. Losing more than about 1 percent of your body weight in
            a week costs points, and more than 2 percent costs more. A steady, conservative pace
            keeps the score whole. If you set your goal pace to aggressive, the engine scores
            protection tighter on purpose.
          </Factor>

          <Factor icon={Icons.protein} title="Protein intake">
            Protein is the raw material your muscle is rebuilt from. Averaging under 90 grams per
            day costs points. Hitting your personal target, which Leanient computes from your sex,
            age, height, and weight, supports retention and keeps the score intact.
          </Factor>

          <Factor icon={Icons.train} title="Resistance training">
            Training is the signal that tells your body the muscle is still needed. A week with no
            resistance sessions costs the most points of any single factor. One session helps, two
            give a useful signal, and three or more protect the week fully. Even short sessions
            count.
          </Factor>

          <ScoreBands />

          <Text style={styles.sectionLabel}>GOOD TO KNOW</Text>

          <Factor icon={Icons.source} title="Where the numbers come from">
            When you log meals and workouts during the week, the engine reads those logs directly.
            When logs are thin, it falls back to what you reported in the weekly check-in. More
            logging means a sharper verdict. Before your first check-in, the verdict shows as
            still gathering, because it refuses to guess without data.
          </Factor>

          <Factor icon={Icons.honest} title="What the verdict is, and is not">
            The verdict is a conservative, explainable estimate built from your behavior. It is a
            coaching signal, with the math kept simple enough to explain in plain language, which
            is exactly what the explanation on your verdict card does. It is never a medical
            measurement. A DEXA scan measures body composition. Leanient estimates risk and tells
            you the one action that lowers it.
          </Factor>

          <View style={styles.footCard}>
            <Text style={styles.footText}>
              A rough week costs points, never your progress. The score resets every week, so the
              next verdict is always winnable. Your next action card tells you where to start.
            </Text>
          </View>
        </ScrollView>
      </ModalSafeArea>
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

  hero: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  h1: { fontFamily: font.extrabold, fontSize: 25, lineHeight: 30, letterSpacing: -0.75, color: colors.ink },
  lede: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: colors.inkSoft },

  sectionLabel: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 2 },

  factor: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 14 },
  iconTile: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.12)" },
  factorText: { flex: 1 },
  factorTitle: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink },
  factorBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.inkSoft, marginTop: 4 },

  bandsCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14 },
  bandsEyebrow: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.95, color: colors.muted },
  bandsBar: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", marginTop: 10, gap: 2 },
  bandSeg: { height: "100%" },
  bandsLabels: { marginTop: 10, gap: 6 },
  bandLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  bandDot: { width: 9, height: 9, borderRadius: 4.5 },
  bandText: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft },

  footCard: { marginHorizontal: 20, marginTop: 22, borderRadius: 16, padding: 14, backgroundColor: "rgba(47,184,122,0.08)", borderWidth: 1, borderColor: "rgba(47,184,122,0.22)" },
  footText: { fontFamily: font.medium, fontSize: 14, lineHeight: 21, color: colors.ink },
});

export default VerdictGuideScreen;
