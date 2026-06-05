import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

type IconProps = { color: string };
const HomeIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 11l8-7 8 7M6 10v9h12v-9" />
  </Svg>
);
const TrainIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
  </Svg>
);
const ProgressIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 19V5M4 19h16M7 14l4-4 3 2 5-6" />
  </Svg>
);
const ProfileIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={8} r={3.5} />
    <Path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </Svg>
);

const ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  Home: HomeIcon,
  Train: TrainIcon,
  Progress: ProgressIcon,
  Profile: ProfileIcon,
};

interface TabBarProps extends BottomTabBarProps {
  onQuickLog?: () => void;
}

/** Custom bottom tab bar: glass blur, 4 tabs + center floating "+" (quick-log). */
export function TabBar({ state, navigation, onQuickLog }: TabBarProps) {
  const routes = state.routes;
  // Render order: Home, Train, (+), Progress, Profile.
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const color = focused ? colors.emeraldDeep : colors.faint;
    const Icon = ICONS[route.name] ?? HomeIcon;
    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={route.name}
        onPress={onPress}
        style={styles.tab}
      >
        <Icon color={color} />
        <Text style={[styles.tl, { color }]}>{route.name}</Text>
      </Pressable>
    );
  };

  return (
    <BlurView intensity={24} tint="light" style={styles.bar}>
      <View style={styles.barInner}>
        {left.map(renderTab)}
        <Pressable accessibilityRole="button" accessibilityLabel="Log something" onPress={onQuickLog} style={styles.plusWrap}>
          <LinearGradient colors={["#4ECF8B", "#1F9E63"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.plus}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
              <Path d="M12 5v14M5 12h14" />
            </Svg>
          </LinearGradient>
        </Pressable>
        {right.map(renderTab)}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: "rgba(252,252,250,0.85)",
  },
  barInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 12,
    paddingBottom: 30,
    paddingHorizontal: 18,
  },
  tab: { flex: 1, alignItems: "center", gap: 4 },
  tl: { fontFamily: font.semibold, fontSize: 10.5 },
  plusWrap: { width: 58, marginTop: -26, alignItems: "center" },
  plus: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    shadowOpacity: 0.7,
    elevation: 10,
  },
});

export default TabBar;
