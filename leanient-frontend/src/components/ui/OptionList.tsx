import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

function Check() {
  return (
    <Svg width={12} height={9} viewBox="0 0 12 9" fill="none">
      <Path d="M1 4.5L4.2 7.5L11 1" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface OptionRowProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  multi: boolean;
  onPress: () => void;
}

function OptionRow({ label, sublabel, selected, multi, onPress }: OptionRowProps) {
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current; // JS-driven (color/opacity)
  const pressScale = useRef(new Animated.Value(1)).current; // native-driven

  useEffect(() => {
    Animated.timing(sel, {
      toValue: selected ? 1 : 0,
      duration: 180,
      easing: EASE,
      useNativeDriver: false,
    }).start();
  }, [sel, selected]);

  const pressTo = (to: number) =>
    Animated.timing(pressScale, { toValue: to, duration: 120, useNativeDriver: true }).start();

  const labelColor = sel.interpolate({ inputRange: [0, 1], outputRange: [colors.ink, "#FFFFFF"] });
  const subColor = sel.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, "rgba(255,255,255,0.92)"] });
  const checkOpacity = sel;
  const checkScale = sel.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const ringOpacity = sel.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        accessibilityRole={multi ? "checkbox" : "radio"}
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => pressTo(0.985)}
        onPressOut={() => pressTo(1)}
        style={styles.row}
      >
        {/* selected gradient fill */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: sel }]}>
          <LinearGradient
            colors={["#4ECF8B", "#2DB87A", "#1F9E63"]}
            locations={[0, 0.58, 1]}
            start={{ x: 0.18, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {/* glass edge (fades out when selected) */}
        <Animated.View pointerEvents="none" style={[styles.edge, { opacity: ringOpacity }]} />
        {/* top inner highlight when selected */}
        <Animated.View pointerEvents="none" style={[styles.topHi, { opacity: sel }]} />

        <View style={styles.textCol}>
          <Animated.Text style={[styles.label, { color: labelColor }]}>{label}</Animated.Text>
          {sublabel ? (
            <Animated.Text style={[styles.sublabel, { color: subColor }]}>{sublabel}</Animated.Text>
          ) : null}
        </View>

        <View style={styles.trailing}>
          {multi ? (
            <Animated.View style={[styles.ring, { opacity: ringOpacity }]} />
          ) : null}
          <Animated.View
            style={[styles.tick, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}
          >
            <Check />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export interface OptionListProps {
  options: string[];
  /** Optional per-option second line (aligned by index with `options`). */
  sublabels?: (string | undefined)[];
  multi?: boolean;
  /** Single: selected index or null. Multi: array of selected indices. */
  selected: number | number[] | null;
  onSelect: (index: number) => void;
}

export function OptionList({ options, sublabels, multi = false, selected, onSelect }: OptionListProps) {
  const isSelected = (i: number) =>
    multi ? Array.isArray(selected) && selected.includes(i) : selected === i;

  return (
    <View style={styles.list}>
      {options.map((label, i) => (
        <OptionRow
          key={label}
          label={label}
          sublabel={sublabels?.[i]}
          multi={multi}
          selected={isSelected(i)}
          onPress={() => onSelect(i)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 11 },
  row: {
    minHeight: 60,
    borderRadius: 19,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
    backgroundColor: colors.glass,
    // soft glass shadow
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  topHi: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  textCol: { flex: 1 },
  label: {
    fontFamily: font.medium,
    fontSize: 16,
    letterSpacing: -0.16,
  },
  sublabel: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.08,
    marginTop: 2,
  },
  trailing: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.faintest,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(62,94,65,1)",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.5,
    elevation: 3,
  },
});

export default OptionList;
