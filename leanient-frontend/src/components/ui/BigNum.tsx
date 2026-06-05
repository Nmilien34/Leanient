import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface BigNumProps {
  /** The large value (already formatted, e.g. "172" or "1.0"). */
  value: string;
  /** The unit suffix (e.g. "lb", "lb/wk"). */
  unit: string;
  /** Font size of the number (default 76). Unit scales relative to it. */
  size?: number;
  unitSize?: number;
}

/** Large baseline-aligned numeric readout (`.bignum`): thin number + muted unit. */
export function BigNum({ value, unit, size = 76, unitSize = 26 }: BigNumProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.n, { fontSize: size, lineHeight: size * 1.05, letterSpacing: -0.03 * size }]}>
        {value}
      </Text>
      <Text style={[styles.u, { fontSize: unitSize }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 6 },
  n: {
    fontFamily: font.light,
    fontWeight: "300",
    color: colors.ink,
  },
  u: {
    fontFamily: font.medium,
    color: colors.muted,
  },
});

export default BigNum;
