import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";
import { onboardingProgress } from "../../onboarding/flowProgress";

interface WelcomeScreenProps {
  onStart?: () => void;
}

const FACES = [
  { initial: "M", tone: "#D9BFA6" },
  { initial: "J", tone: "#B8CBB0" },
  { initial: "R", tone: "#C9B8D6" },
  { initial: "T", tone: "#A9C6C9" },
  { initial: "S", tone: "#D6C6B0" },
];

/**
 * The hook: before asking anything, the app gives. The line types itself,
 * then the 1-in-8 stat lands with its citation and the faces on the same
 * road. Belonging before questions.
 */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <ConvoScreen
      progress={onboardingProgress("welcome")}
      context="Hi. Before anything else, one thing."
      question="You're not doing this alone."
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="I'm ready"
          onPress={onStart}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>I'm ready</Text>
        </Pressable>
      }
    >
      <View style={styles.stat}>
        <Text style={styles.statNum}>
          1 in 8<Text style={{ color: ink.emeraldHi }}>.</Text>
        </Text>
        <Text style={styles.statLine}>American adults has taken a GLP-1. Millions are on this exact road with you.</Text>
        <Text style={styles.statCite}>KFF Health Tracking Poll</Text>
        <View style={styles.faces}>
          {FACES.map((face, i) => (
            <View key={face.initial} style={[styles.face, { backgroundColor: face.tone, marginLeft: i === 0 ? 0 : -8 }]}>
              <Text style={styles.faceText}>{face.initial}</Text>
            </View>
          ))}
          <Text style={styles.facesMore}>15 million+ right now</Text>
        </View>
      </View>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  stat: { paddingTop: 48 },
  statNum: { fontFamily: font.extrabold, fontSize: 56, letterSpacing: -1.96, color: ink.bright },
  statLine: { fontFamily: font.semibold, fontSize: 16.5, lineHeight: 23, color: ink.chipText, marginTop: 10, maxWidth: 300 },
  statCite: { fontFamily: font.medium, fontSize: 12, color: ink.dim, marginTop: 10 },
  faces: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  face: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: ink.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  faceText: { fontFamily: font.bold, fontSize: 12, color: ink.onEmerald },
  facesMore: { fontFamily: font.semibold, fontSize: 12.5, color: ink.soft, marginLeft: 10 },
  cta: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: "rgba(238,244,234,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { backgroundColor: ink.bubbleGround },
  ctaText: { fontFamily: font.bold, fontSize: 16.5, letterSpacing: -0.17, color: ink.bright },
});

export default WelcomeScreen;
