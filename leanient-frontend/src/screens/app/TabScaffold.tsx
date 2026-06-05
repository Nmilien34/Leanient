import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

/**
 * Placeholder for a tab screen that isn't built yet. Keeps the tab navigable +
 * on-brand so the tab bar is genuinely clickable/dynamic now; each is replaced
 * with its real screen next (one-by-one).
 */
export function TabScaffold({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.head}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.soon}>Coming next</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  head: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: font.extrabold, fontSize: 26, letterSpacing: -0.65, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 120 },
  soon: { fontFamily: font.medium, fontSize: 14, color: colors.faint },
});

export default TabScaffold;
