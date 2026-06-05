import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

export interface SettingRowConfig {
  key: string;
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  /** Calm slate styling for muted actions (e.g. Sign out). */
  danger?: boolean;
  /** Red styling for destructive actions (e.g. Delete account). */
  destructive?: boolean;
}

function SettingRow({ icon, label, value, onPress, danger, destructive }: Omit<SettingRowConfig, "key">) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, danger && styles.iconDanger, destructive && styles.iconDestructive]}>{icon}</View>
      <Text style={[styles.label, danger && styles.labelDanger, destructive && styles.labelDestructive]}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <Text style={[styles.chev, destructive && styles.chevDestructive]}>›</Text>
    </Pressable>
  );
}

/** A grouped settings card with dividers between rows (matches `.setgroup`). */
export function SettingGroup({ rows }: { rows: SettingRowConfig[] }) {
  return (
    <View style={styles.group}>
      {rows.map((r, i) => (
        <View key={r.key}>
          <SettingRow icon={r.icon} label={r.label} value={r.value} onPress={r.onPress} danger={r.danger} destructive={r.destructive} />
          {i < rows.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14, paddingHorizontal: 15 },
  pressed: { backgroundColor: colors.sageFill },
  icon: { width: 33, height: 33, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  iconDanger: { backgroundColor: "rgba(86,97,89,0.12)" },
  iconDestructive: { backgroundColor: "rgba(194,85,78,0.10)" },
  label: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  labelDanger: { color: colors.slate },
  labelDestructive: { color: "#C2554E" },
  value: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  chev: { fontFamily: font.regular, fontSize: 20, color: colors.faintest },
  chevDestructive: { color: "rgba(194,85,78,0.5)" },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 15 },
});

export default SettingGroup;
