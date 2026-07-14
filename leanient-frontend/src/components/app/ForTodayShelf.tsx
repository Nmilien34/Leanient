import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { LibraryRead } from "../../screens/app/libraryContent";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

type ShelfRead = LibraryRead & { matchesToday: boolean };

const WaveIcon = ({ amber }: { amber: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={amber ? colors.amberDeep : colors.emeraldDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 15c2.5 0 2.5-6 5-6s2.5 8 5 8 2.5-10 5-10 2.5 5 3 5" />
  </Svg>
);

/** The reader: a full-height sheet, title + coach-voice paragraphs. */
function ReadSheet({ read, onClose }: { read: ShelfRead | null; onClose: () => void }) {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!read) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [read, slide]);
  if (!read) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: slide }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }]}
        >
          <View style={styles.grab} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.readBody}>
            <View style={styles.readMeta}>
              <View style={[styles.chip, read.amber ? styles.chipAm : styles.chipEm]}>
                <Text style={[styles.chipText, read.amber ? styles.chipTextAm : styles.chipTextEm]}>{read.minutes} min</Text>
              </View>
              {read.matchesToday ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>matches today</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.readTitle}>{read.title}</Text>
            {read.paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
            <Text style={styles.readFoot}>From your coach · sourced in Sources & citations</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ForTodayShelfProps {
  /** Two reads picked for today's cycle day. */
  reads: ShelfRead[];
  /** "DAY 5" / "SHOT DAY" for the header eyebrow. */
  dayLabel: string;
  amber: boolean;
}

/**
 * The For-today shelf (frame 07): the library's answer to the belonging need,
 * two reads picked by cycle day. Tapping opens the reader sheet in place.
 */
export function ForTodayShelf({ reads, dayLabel, amber }: ForTodayShelfProps) {
  const [open, setOpen] = useState<ShelfRead | null>(null);
  if (!reads.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>
          FOR TODAY · <Text style={amber ? styles.eyebrowAm : styles.eyebrowEm}>{dayLabel}</Text>
        </Text>
      </View>
      <View style={styles.row}>
        {reads.map((read) => (
          <Pressable
            key={read.key}
            accessibilityRole="button"
            accessibilityLabel={`Read ${read.title}, ${read.minutes} minutes`}
            onPress={() => setOpen(read)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={[styles.img, read.amber ? styles.imgSun : styles.imgMint]}>
              <View style={styles.glyph}>
                <WaveIcon amber={read.amber} />
              </View>
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={2}>
                {read.title}
              </Text>
              <View style={styles.meta}>
                <View style={[styles.chip, read.amber ? styles.chipAm : styles.chipEm]}>
                  <Text style={[styles.chipText, read.amber ? styles.chipTextAm : styles.chipTextEm]}>{read.minutes} min</Text>
                </View>
                {read.matchesToday ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>matches today</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      <ReadSheet read={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, paddingBottom: 2 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  eyebrowEm: { color: colors.emeraldDeep },
  eyebrowAm: { color: colors.amberDeep },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  // mock .readcard: r18, image block h78, body 11/13
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  img: { height: 78, alignItems: "center", justifyContent: "center" },
  imgMint: { backgroundColor: "#DFF0E6" },
  imgSun: { backgroundColor: "#F5E8D2" },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(252,252,250,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  body: { paddingHorizontal: 13, paddingTop: 11, paddingBottom: 13 },
  title: { fontFamily: font.bold, fontSize: 13.5, lineHeight: 18, letterSpacing: -0.16, color: colors.ink },
  meta: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  chip: { backgroundColor: colors.sageFill, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  chipEm: { backgroundColor: "rgba(47,184,122,0.12)" },
  chipAm: { backgroundColor: "rgba(227,166,94,0.16)" },
  chipText: { fontFamily: font.bold, fontSize: 11, color: colors.muted },
  chipTextEm: { color: colors.emeraldDeep },
  chipTextAm: { color: colors.amberDeep },
  // reader sheet
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(12,16,11,0.55)" },
  sheet: {
    maxHeight: "86%",
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: colors.faintest, alignSelf: "center", marginTop: 6, marginBottom: 14 },
  readBody: { paddingBottom: 40 },
  readMeta: { flexDirection: "row", gap: 6 },
  readTitle: { fontFamily: font.extrabold, fontSize: 23, lineHeight: 28, letterSpacing: -0.58, color: colors.ink, marginTop: 10 },
  paragraph: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, letterSpacing: -0.1, color: colors.inkSoft, marginTop: 14 },
  readFoot: { fontFamily: font.medium, fontSize: 12, color: colors.faint, marginTop: 18 },
});

export default ForTodayShelf;
