import React from "react";
import { DefaultTheme, NavigationContainer, type Theme } from "@react-navigation/native";
import { MainTabs } from "./MainTabs";
import { colors } from "../theme/tokens";

// Light theme so the scene/background behind the translucent tab bar is paper,
// not the default dark fallback (which showed through as a black strip).
const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.paper,
    card: colors.paper,
  },
};

/** Root of the main (post-onboarding) app. */
export function RootApp() {
  return (
    <NavigationContainer theme={navTheme}>
      <MainTabs />
    </NavigationContainer>
  );
}

export default RootApp;
