import React from "react";
import { Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { PRIVACY_URL, TERMS_URL } from "../../config";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface SubscriptionLegalProps {
  style?: StyleProp<ViewStyle>;
  /** Lighter text for use on tinted/sheet backgrounds. */
  muted?: boolean;
}

/**
 * The auto-renewal disclosure + Terms of Use / Privacy Policy links required on
 * any screen that sells an auto-renewable subscription (App Store guideline
 * 3.1.2). The links open in the browser; the URLs live in config so they update
 * in one place.
 */
export function SubscriptionLegal({ style, muted }: SubscriptionLegalProps) {
  return (
    <View style={style}>
      <Text style={[styles.disclosure, muted && styles.disclosureMuted]}>
        Payment is charged to your Apple ID at confirmation. The subscription renews automatically unless cancelled at
        least 24 hours before the period ends. Manage or cancel anytime in your App Store settings.
      </Text>
      <View style={styles.links}>
        <Pressable accessibilityRole="link" accessibilityLabel="Terms of Use" onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
          <Text style={styles.link}>Terms of Use</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
          <Text style={styles.link}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disclosure: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, color: colors.faint, textAlign: "center" },
  disclosureMuted: { color: colors.muted },
  links: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  link: { fontFamily: font.semibold, fontSize: 12, color: colors.emeraldDeep },
  dot: { fontFamily: font.regular, fontSize: 12, color: colors.faint },
});

export default SubscriptionLegal;
