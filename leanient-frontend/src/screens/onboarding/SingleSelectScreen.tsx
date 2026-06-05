import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { OptionList } from "../../components/ui/OptionList";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import type { Option } from "../../onboarding/options";

export interface SingleSelectScreenProps<T> {
  /** 0..1 onboarding progress for the header bar. */
  progress: number;
  title: string;
  sub: string;
  /** Each option pairs display copy with the shared-typed value it maps to. */
  options: Option<T>[];
  onBack?: () => void;
  /** Fires shortly after a choice (with the typed value) so the select animation is visible. */
  onAnswer?: (value: T) => void;
}

/**
 * Reusable single-select onboarding screen: header (progress + back), title/sub,
 * an animated option list, and select → auto-advance. Powers GLP / Journey / Fear / Training.
 * Generic over the selected value type so callers get the shared enum value back,
 * never a display label or index.
 */
export function SingleSelectScreen<T>({
  progress,
  title,
  sub,
  options,
  onBack,
  onAnswer,
}: SingleSelectScreenProps<T>) {
  const [selected, setSelected] = useState<number | null>(null);
  const rise = useRef(new Animated.Value(0)).current;
  const advanced = useRef(false);

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 520,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [rise]);

  const handleSelect = (index: number) => {
    if (advanced.current) return;
    setSelected(index);
    advanced.current = true;
    setTimeout(() => onAnswer?.(options[index].value), 300);
  };

  const riseStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <View style={styles.root}>
      <ScreenGround />
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={progress} onBack={onBack} />
        <Animated.View style={[styles.flex, riseStyle]}>
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleblock}>
              <Text style={styles.h1}>{title}</Text>
              <Text style={styles.sub}>{sub}</Text>
            </View>
            <View style={{ height: 26 }} />
            <OptionList
              options={options.map((o) => o.label)}
              sublabels={options.map((o) => o.sub)}
              selected={selected}
              onSelect={handleSelect}
            />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 38 },
  titleblock: { gap: 12 },
  h1: {
    fontFamily: font.extrabold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.75, // -0.025em * 30
    color: colors.ink,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.16,
    color: colors.muted,
  },
});

export default SingleSelectScreen;
