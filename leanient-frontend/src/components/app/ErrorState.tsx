import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface ErrorStateProps {
  /** User-friendly message. Defaults to a calm, non-technical line. Never pass a raw backend string. */
  message?: string;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Inline error block with a retry. The default copy is intentionally generic so
 * raw backend error codes/strings never reach the user; auth (401) redirects are
 * handled upstream, so this is for transient load failures.
 */
export function ErrorState({ message = "Couldn't load this right now.", onRetry, style }: ErrorStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.msg}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
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
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
  },
  msg: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: "center" },
  retry: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(47,184,122,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(47,184,122,0.35)",
  },
  retryPressed: { opacity: 0.7 },
  retryText: { fontFamily: font.semibold, fontSize: 14, color: colors.emeraldDeep },
});

export default ErrorState;
