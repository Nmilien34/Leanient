import React from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface Source {
  label: string;
  url: string;
}

interface SourceSection {
  claim: string;
  body: string;
  sources: Source[];
}

/**
 * The research behind Leanient's health information, with tappable links to each
 * primary source (FDA labels and peer-reviewed trials). Surfaced so the medical
 * claims in the app are citable and verifiable (App Store guideline 1.4.1).
 */
const SECTIONS: SourceSection[] = [
  {
    claim: "Muscle loss on GLP-1 medications",
    body: "Clinical trials estimate that roughly 25% to 39% of the weight lost on GLP-1 medications can come from lean mass, not fat. Leanient's weekly muscle-retention estimate is built on this research.",
    sources: [
      { label: "STEP-1 body-composition analysis (Endocrine Society)", url: "https://academic.oup.com/jes/article/5/Supplement_1/A16/6240360" },
      { label: "STEP-1 trial (New England Journal of Medicine)", url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2032183" },
      { label: "SURMOUNT-1 body composition (Diabetes, Obesity & Metabolism, 2025)", url: "https://dom-pubs.onlinelibrary.wiley.com/doi/10.1111/dom.16275" },
      { label: "Lean-mass changes review (Neeland, 2024)", url: "https://dom-pubs.onlinelibrary.wiley.com/doi/10.1111/dom.15728" },
    ],
  },
  {
    claim: "Protein and resistance training to protect muscle",
    body: "Guidance for people on GLP-1 medications suggests roughly 1.2 to 1.6 grams of protein per kilogram of body weight per day, paired with regular resistance training, to help preserve muscle during weight loss. Leanient's protein targets and workouts follow this range.",
    sources: [
      { label: "Protein and resistance-training guidance (The Obesity Society, multi-society summary)", url: "https://www.clinicalnutritioncenter.com/research-updates/protein-glp1-muscle-preservation-denver" },
      { label: "GLP-1 protein guidance review (Fella Health)", url: "https://www.fellahealth.com/guide/how-much-protein-to-eat-on-glp-1" },
    ],
  },
  {
    claim: "Medication dosing and titration",
    body: "Shot-cycle reminders and titration steps follow each medication's FDA prescribing information.",
    sources: [
      { label: "Ozempic (semaglutide) FDA label", url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/209637s020s021lbl.pdf" },
      { label: "Wegovy (semaglutide) prescribing information", url: "https://www.novo-pi.com/wegovy.pdf" },
      { label: "Mounjaro (tirzepatide) FDA label", url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/215866s000lbl.pdf" },
      { label: "Zepbound (tirzepatide) FDA label", url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/217806s003lbl.pdf" },
    ],
  },
];

interface SourcesScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function SourcesScreen({ visible, onClose }: SourcesScreenProps) {
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
            <Text style={styles.headTitle}>Sources & citations</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.intro}>
              Leanient is a wellness and coaching app. It is not a medical device, and nothing in the app is medical
              advice. The estimates and guidance draw on the research below. Always talk to your clinician about your
              medication, dosing, and care.
            </Text>

            {SECTIONS.map((section) => (
              <View key={section.claim} style={styles.card}>
                <Text style={styles.claim}>{section.claim}</Text>
                <Text style={styles.body}>{section.body}</Text>
                <Text style={styles.sourcesLabel}>SOURCES</Text>
                {section.sources.map((source) => (
                  <Pressable
                    key={source.url}
                    accessibilityRole="link"
                    accessibilityLabel={source.label}
                    onPress={() => Linking.openURL(source.url)}
                    style={({ pressed }) => [styles.sourceRow, pressed && styles.sourceRowPressed]}
                  >
                    <Text style={styles.sourceText}>{source.label}</Text>
                    <Text style={styles.sourceChev}>›</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 32, paddingHorizontal: 20 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  intro: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 8, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, marginTop: 14 },
  claim: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.2, color: colors.ink },
  body: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft, marginTop: 6 },
  sourcesLabel: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.7, color: colors.faint, marginTop: 14, marginBottom: 2 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  sourceRowPressed: { opacity: 0.6 },
  sourceText: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, lineHeight: 18, color: colors.emeraldDeep },
  sourceChev: { fontFamily: font.semibold, fontSize: 17, color: colors.faint },
});

export default SourcesScreen;
