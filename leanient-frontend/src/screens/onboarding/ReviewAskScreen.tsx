import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { Button } from "../../components/ui/Button";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

/** App Store Connect app id (see eas.json ascAppId) → the write-review sheet. */
const WRITE_REVIEW_URL = "https://apps.apple.com/app/id6778920696?action=write-review";

interface ReviewAskScreenProps {
  onContinue?: () => void;
}

function BigStar() {
  return (
    <Svg width={38} height={38} viewBox="0 0 24 24" fill={colors.amber} stroke={colors.amber} strokeWidth={1.8} strokeLinejoin="round">
      <Path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
    </Svg>
  );
}

/**
 * Frame 17 of the onboarding conversation: the post-purchase review ask, at
 * peak excitement before the app opens. The recent review mirrors the fear
 * they named; the frame is helping the next person find this. "Not now" is
 * the quiet escape hatch so nobody is held hostage at the door.
 */
export function ReviewAskScreen({ onContinue }: ReviewAskScreenProps) {
  const rate = () => {
    if (Platform.OS === "ios") {
      void Linking.openURL(WRITE_REVIEW_URL).catch(() => {});
    }
    onContinue?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>
            Welcome <Text style={styles.h1Em}>in.</Text>
          </Text>
          <Text style={styles.sub}>Your plan starts today.</Text>

          <View style={styles.stars}>
            {[0, 1, 2, 3, 4].map((i) => (
              <BigStar key={i} />
            ))}
          </View>

          <Text style={styles.favor}>One small favor before we start.</Text>
          <Text style={styles.why}>
            A rating helps the next person find this. The one still searching Facebook groups at midnight.
          </Text>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewQuote}>
              "I was terrified of losing muscle at my age. Six weeks in, my verdict says I kept it. I wish I'd found
              this on day one."
            </Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewStars}>★★★★★</Text>
              <Text style={styles.reviewWho}>Recent review</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button label="Rate Leanient" onPress={rate} />
            <Text style={styles.ctaSub}>Takes five seconds, means the world</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Not now" hitSlop={10} onPress={onContinue}>
              <Text style={styles.notNow}>Not now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 44, paddingBottom: 16 },
  h1: { fontFamily: font.extrabold, fontSize: 28, letterSpacing: -0.7, color: colors.ink, textAlign: "center" },
  h1Em: { color: colors.emeraldDeep },
  sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.muted, textAlign: "center", marginTop: 4 },
  stars: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 28 },
  favor: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, textAlign: "center", marginTop: 24 },
  why: {
    fontFamily: font.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 10,
  },
  reviewCard: {
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCDDD5",
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  reviewQuote: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 19, letterSpacing: -0.1, color: colors.ink },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewStars: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1, color: colors.amber },
  reviewWho: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted },
  footer: { marginTop: "auto", paddingTop: 24, gap: 10, alignItems: "center" },
  ctaSub: { fontFamily: font.medium, fontSize: 12, color: colors.faint },
  notNow: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, textDecorationLine: "underline", padding: 4 },
});

export default ReviewAskScreen;
