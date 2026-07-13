import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Typewriter } from "./Typewriter";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

export interface ConvoOption<T> {
  label: string;
  /** Optional second line; the chip stretches into a card row to hold it. */
  sub?: string;
  value: T;
}

/** The conversation's filled action button (Continue on multi-select screens). */
export function ConvoButton({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed]}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

interface ConvoScreenProps<T> {
  /** Real position in the flow: (step index + 1) / step count. */
  progress: number;
  onBack?: () => void;
  /** The coach acknowledging the previous answer; rendered dim, above the question. */
  context?: string;
  question: string;
  /** Reassurance line under the question, fades in once typing lands. */
  sub?: string;
  /** Single-select chips. Tap = spoken answer: bubble + typing dots, then auto-advance. */
  options?: ConvoOption<T>[];
  onAnswer?: (value: T) => void;
  /** Custom body (multi-select, pickers); revealed after the question types. */
  children?: ReactNode;
  /** Pinned below the body (Continue for multi-select screens). */
  footer?: ReactNode;
}

/** Soft emerald glow spots on the ink ground (the design's blurred blobs). */
function Ground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, { width: 220, height: 220, top: "6%", left: -70 }]} />
      <View style={[styles.blob, { width: 170, height: 170, top: "42%", right: -60 }]} />
      <View style={[styles.blob, { width: 140, height: 140, bottom: "10%", left: "20%" }]} />
    </View>
  );
}

/** The coach-is-typing bubble: three dots breathing in sequence. */
function TypingDots() {
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [beat]);
  const dot = (base: number) => ({
    opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [base, Math.min(1, base + 0.45)] }),
  });
  return (
    <View style={styles.typing}>
      <Animated.View style={[styles.typingDot, dot(0.55)]} />
      <Animated.View style={[styles.typingDot, dot(0.4)]} />
      <Animated.View style={[styles.typingDot, dot(0.25)]} />
    </View>
  );
}

/** One answer chip, staggering into view once the question has finished typing. */
function Chip({ label, sub, index, revealed, onPress }: { label: string; sub?: string; index: number; revealed: boolean; onPress: () => void }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!revealed) return;
    Animated.timing(rise, {
      toValue: 1,
      duration: 300,
      delay: index * 70,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [revealed, index, rise]);
  return (
    <Animated.View
      style={{
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.chip, sub != null && styles.chipWide, pressed && styles.chipPressed]}
      >
        <Text style={styles.chipText}>{label}</Text>
        {sub ? <Text style={styles.chipSub}>{sub}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

/** How long the sent bubble + typing dots hold before the flow advances. */
const ACKNOWLEDGE_MS = 950;

/**
 * A conversation turn: back + hairline progress, the coach's dim recap of the
 * last answer, the question typing itself with haptic ticks, and answers that
 * behave like speech — a tapped chip dissolves the others, glides in as a sent
 * message, the coach's typing dots appear, and the flow advances on its own.
 * Multi-select screens pass children + footer instead of options.
 */
export function ConvoScreen<T>({ progress, onBack, context, question, sub, options, onAnswer, children, footer }: ConvoScreenProps<T>) {
  // Rule 1: nothing is pre-rendered. The dim recap types first (fast, silent),
  // the question types second, and only then does the answer area reveal.
  const [contextDone, setContextDone] = useState(!context);
  const [typed, setTyped] = useState(false);
  const [picked, setPicked] = useState<ConvoOption<T> | null>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  const questionDim = useRef(new Animated.Value(1)).current;
  const sentPop = useRef(new Animated.Value(0)).current;
  const advanced = useRef(false);

  useEffect(() => {
    if (!typed) return;
    Animated.timing(reveal, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [typed, reveal]);

  const handlePick = (option: ConvoOption<T>) => {
    if (advanced.current) return;
    advanced.current = true;
    // Haptics grammar: a warm tap the moment they speak, the success thump
    // when the sent bubble lands.
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 220);
    }
    setPicked(option);
    // The question steps back once it has been answered; the answer glides in
    // as a sent message.
    Animated.timing(questionDim, { toValue: 0.45, duration: 240, useNativeDriver: true }).start();
    Animated.spring(sentPop, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
    setTimeout(() => onAnswer?.(option.value), ACKNOWLEDGE_MS);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Ground />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={onBack}>
              <Svg width={11} height={18} viewBox="0 0 10 17" fill="none" stroke={ink.bright} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M8.5 1.5L1.5 8.5l7 7" />
              </Svg>
            </Pressable>
          ) : (
            <View style={{ width: 11 }} />
          )}
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {context ? (
            <Typewriter
              text={context}
              speed={14}
              delay={120}
              caret={false}
              haptic={false}
              style={styles.context}
              onDone={() => setContextDone(true)}
            />
          ) : null}
          <Animated.View style={{ opacity: questionDim }}>
            <Typewriter text={question} start={contextDone} delay={300} style={styles.question} onDone={() => setTyped(true)} />
          </Animated.View>
          {sub ? <Animated.Text style={[styles.sub, { opacity: reveal }]}>{sub}</Animated.Text> : null}

          {options && !picked ? (
            <View style={styles.chips}>
              {options.map((option, i) => (
                <Chip key={option.label} label={option.label} sub={option.sub} index={i} revealed={typed} onPress={() => handlePick(option)} />
              ))}
            </View>
          ) : null}

          {picked ? (
            <View style={styles.answered}>
              <Animated.View
                style={[
                  styles.sent,
                  {
                    opacity: sentPop,
                    transform: [
                      { translateY: sentPop.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                      { scale: sentPop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                    ],
                  },
                ]}
              >
                <Text style={styles.sentText}>{picked.label}</Text>
              </Animated.View>
              <TypingDots />
            </View>
          ) : null}

          {children ? <Animated.View style={{ opacity: reveal }}>{children}</Animated.View> : null}
        </ScrollView>

        {footer ? <Animated.View style={[styles.footer, { opacity: reveal }]}>{footer}</Animated.View> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ink.ground },
  safe: { flex: 1 },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: ink.groundGlow },
  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 8 },
  track: { flex: 1, height: 2, borderRadius: 1, backgroundColor: ink.hairline },
  fill: { height: 2, borderRadius: 1, backgroundColor: ink.bright },
  body: { paddingHorizontal: 30, paddingTop: 40, paddingBottom: 30, flexGrow: 1 },
  context: { fontFamily: font.bold, fontSize: 27, lineHeight: 34, letterSpacing: -0.68, color: ink.dim, marginBottom: 30 },
  question: { fontFamily: font.extrabold, fontSize: 31, lineHeight: 38, letterSpacing: -0.87, color: ink.bright },
  sub: { fontFamily: font.medium, fontSize: 14.5, lineHeight: 21, color: ink.soft, marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingTop: 26 },
  chip: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: ink.chipBorder },
  chipPressed: { backgroundColor: ink.bubbleGround },
  chipText: { fontFamily: font.semibold, fontSize: 15, color: ink.chipText },
  chipWide: { alignSelf: "stretch", flexGrow: 1, borderRadius: 18, paddingVertical: 14 },
  chipSub: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17, color: ink.soft, marginTop: 3 },
  button: { height: 54, borderRadius: 27, backgroundColor: ink.emerald, alignItems: "center", justifyContent: "center" },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { backgroundColor: ink.bubbleGround },
  buttonText: { fontFamily: font.bold, fontSize: 16.5, letterSpacing: -0.17, color: ink.onEmerald },
  buttonTextDisabled: { color: ink.faint },
  answered: { alignItems: "flex-start", paddingTop: 26 },
  sent: {
    alignSelf: "flex-end",
    backgroundColor: ink.emerald,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderBottomRightRadius: 7,
    shadowColor: ink.emerald,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    shadowOpacity: 0.25,
    elevation: 4,
  },
  sentText: { fontFamily: font.bold, fontSize: 16, color: ink.onEmerald },
  typing: {
    alignSelf: "flex-start",
    marginTop: 18,
    backgroundColor: ink.bubbleGround,
    borderWidth: 1,
    borderColor: ink.bubbleLine,
    borderRadius: 20,
    borderTopLeftRadius: 7,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ink.soft },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
});

export default ConvoScreen;
