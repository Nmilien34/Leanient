import React, { useEffect } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/tokens";
import { BackButton } from "../ui/BackButton";

interface ScreenHeaderProps {
  /** 0..1 progress through onboarding. */
  progress: number;
  onBack?: () => void;
  showBack?: boolean;
}

// Module-level so the progress bar is CONTINUOUS across screens. The temporary
// step-machine navigation unmounts/remounts a fresh ScreenHeader per screen; a
// per-instance value would reset to 0 and re-grow on every transition (so going
// back read as "shrink to 0, then grow forward"). Sharing one value means each
// screen animates the bar from its current position to that screen's value —
// forward grows, back shrinks. (react-navigation will own this later.)
const progressFill = new Animated.Value(0);

/** Onboarding header: back chevron + animated progress bar (ported from header()). */
export function ScreenHeader({ progress, onBack, showBack = true }: ScreenHeaderProps) {
  useEffect(() => {
    const anim = Animated.timing(progressFill, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 500,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false, // animating width
    });
    anim.start();
    // Stop on unmount so rapid navigation doesn't leave a stale animation
    // fighting the next screen's transition.
    return () => anim.stop();
  }, [progress]);

  const width = progressFill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.header}>
      {showBack ? <BackButton onPress={onBack} /> : <View style={styles.back} />}
      <View style={styles.track}>
        <Animated.View style={[styles.fillWrap, { width }]}>
          <LinearGradient
            colors={["#6FE0A6", "#2FB87A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sageFill,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sageFill,
    overflow: "hidden",
  },
  fillWrap: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
});

export default ScreenHeader;
