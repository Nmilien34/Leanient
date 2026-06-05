import React from "react";
import { Image, Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

/** The "Add this week's photo" capture card. */
export function AddPhotoThumb({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Add photo" onPress={onPress} style={[styles.thumb, styles.add]}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
        <Circle cx={12} cy={13} r={3.2} />
      </Svg>
      <Text style={styles.addText}>Add</Text>
    </Pressable>
  );
}

/**
 * A progress-photo thumbnail. Renders the actual photo (`uri`) when available
 * for that week; otherwise a labelled placeholder (e.g. upload still pending).
 */
export function ProgressPhotoThumb({ uri, label, onPress }: { uri?: string; label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Photo ${label}`} onPress={onPress} style={styles.thumb}>
      {uri ? (
        <Image source={{ uri }} style={styles.img} resizeMode="cover" />
      ) : (
        <LinearGradient colors={["#D7DED2", "#C2CABB"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={["transparent", "rgba(12,16,11,0.55)"]} style={styles.labelStrip}>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 72,
    height: 94,
    borderRadius: 13,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sageFill,
  },
  img: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  add: { borderStyle: "dashed", borderColor: colors.faintest, backgroundColor: colors.card, gap: 6 },
  addText: { fontFamily: font.semibold, fontSize: 10, color: colors.muted },
  labelStrip: { position: "absolute", left: 0, right: 0, bottom: 0, height: 30, justifyContent: "flex-end", paddingHorizontal: 8, paddingBottom: 6 },
  label: { fontFamily: font.bold, fontSize: 11, color: "#FFFFFF" },
});

export default ProgressPhotoThumb;
