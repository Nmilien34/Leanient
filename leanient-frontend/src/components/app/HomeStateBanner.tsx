import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { HomeBanner } from "../../screens/app/homeLayout";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface HomeStateBannerProps {
  banner: HomeBanner;
  /** Tapping nudges into the lowest-friction logging path. */
  onPress?: () => void;
}

/**
 * Contextual banner above the Today cards for special states (currently the
 * lapsed "welcome back" re-engage). Keeps the stale score from leading and
 * points the returning user straight at logging.
 */
export function HomeStateBanner({ banner, onPress }: HomeStateBannerProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${banner.title}. ${banner.message}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.icon}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" />
        </Svg>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{banner.title}</Text>
        <Text style={styles.message}>{banner.message}</Text>
      </View>
      {onPress ? <Text style={styles.chev}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 8, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  body: { flex: 1 },
  title: { fontFamily: font.bold, fontSize: 15, letterSpacing: -0.2, color: colors.ink },
  message: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 2 },
  chev: { fontFamily: font.semibold, fontSize: 20, color: colors.faint },
});

export default HomeStateBanner;
