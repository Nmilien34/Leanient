import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface EmptyStateProps {
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A calm empty-state block. Copy should coach, not apologize (brand voice). Used
 * per section when a fetch succeeded but the data is genuinely empty.
 */
export function EmptyState({ title, message, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
  },
  title: { fontFamily: font.bold, fontSize: 15, color: colors.ink, textAlign: "center" },
  msg: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.muted, textAlign: "center" },
});

export default EmptyState;
