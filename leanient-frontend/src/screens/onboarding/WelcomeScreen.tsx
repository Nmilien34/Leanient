import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { RadialGlow } from "../../components/layout/RadialGlow";
import { LogoMark } from "../../components/brand/LogoMark";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface WelcomeScreenProps {
  onStart?: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const auth = useAuth();
  const { height } = useWindowDimensions();
  const floatV = useRef(new Animated.Value(0)).current;
  const accountLabel = auth.user?.email ?? auth.user?.displayName ?? null;

  // logo float (5s, -8px) — matches .welcome .leaf
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatV, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatV, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatV]);

  const floatStyle = {
    transform: [{ translateY: floatV.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />

      {/* welcome glow (emerald + honey, top-right, pulsing) */}
      <RadialGlow
        size={340}
        position={{ top: height * 0.3, right: -110 }}
        pulse
        pulseDuration={6000}
        stops={[
          { offset: 0, color: colors.emerald, opacity: 0.26 },
          { offset: 0.48, color: colors.honey, opacity: 0.14 },
          { offset: 0.72, color: colors.honey, opacity: 0 },
        ]}
      />
      {/* honey wash, bottom-left */}
      <RadialGlow
        size={260}
        position={{ bottom: height * 0.08, left: -90 }}
        stops={[
          { offset: 0, color: colors.honey, opacity: 0.22 },
          { offset: 0.68, color: colors.honey, opacity: 0 },
        ]}
      />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <View style={styles.top}>
            <Text style={styles.wordmark}>Leanient</Text>
            <Animated.View style={[styles.leaf, floatStyle]}>
              <LogoMark size={30} />
            </Animated.View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.headline}>Lose the fat.{"\n"}Keep yourself{"\n"}intact.</Text>
            <Text style={styles.sub}>
              Leanient is built for one thing — making sure the body you have when the weight comes
              off still looks and feels like yours.
            </Text>
          </View>

          <View style={styles.cta}>
            <Button label="Let's start" onPress={onStart} />
            <Text style={styles.cap}>Built for people on GLP-1 medications</Text>
            {accountLabel ? (
              <Text style={styles.account}>
                Signed in as {accountLabel} ·{" "}
                <Text
                  style={styles.logout}
                  accessibilityRole="button"
                  onPress={() => void auth.logout()}
                >
                  Log out
                </Text>
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    fontFamily: font.semibold,
    fontSize: 19,
    letterSpacing: -0.38, // -0.02em * 19
    color: colors.ink,
  },
  leaf: {
    ...Platform.select({
      ios: {
        shadowColor: colors.emeraldDeep,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 8,
        shadowOpacity: 0.3,
      },
      default: {},
    }),
  },
  hero: {},
  headline: {
    fontFamily: font.extrabold,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -1.38, // -0.03em * 46
    color: colors.ink,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: -0.17, // -0.01em * 17
    color: colors.muted,
    maxWidth: 300,
    marginTop: 22,
  },
  cta: {
    gap: 16,
  },
  cap: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.faint,
    textAlign: "center",
  },
  account: {
    fontFamily: font.regular,
    fontSize: 12.5,
    color: colors.faint,
    textAlign: "center",
  },
  logout: {
    fontFamily: font.semibold,
    color: colors.emeraldDeep,
  },
});

export default WelcomeScreen;
