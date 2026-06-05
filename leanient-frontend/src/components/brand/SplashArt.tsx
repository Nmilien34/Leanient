import React from "react";
import { View } from "react-native";
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors } from "../../theme/tokens";

/**
 * GLP-1 hero illustration: medicine vial + syringe.
 * SVG geometry ported 1:1 from design/onboarding.html (.ill-vial / .ill-pen).
 * The vial sits behind, rotated +6°; the syringe in front, rotated -7°.
 */
export function SplashArt() {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      {/* Vial */}
      <Svg
        width={64}
        height={100}
        viewBox="0 0 64 100"
        fill="none"
        style={{ transform: [{ rotate: "6deg" }, { translateY: -2 }], marginRight: -18, zIndex: 0 }}
      >
        <Defs>
          <LinearGradient id="vialB" x1="14" y1="0" x2="50" y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.glassWhite} />
            <Stop offset="1" stopColor={colors.glassTint} />
          </LinearGradient>
        </Defs>
        <Rect x="22" y="2" width="20" height="12" rx="3" fill={colors.emeraldDeep} />
        <Rect x="25" y="13" width="14" height="7" fill={colors.glassEdge} />
        <Rect
          x="14"
          y="19"
          width="36"
          height="78"
          rx="12"
          fill="url(#vialB)"
          stroke={colors.glassEdge}
          strokeWidth="1.5"
        />
        <Path
          d="M16 62h32v23a10 10 0 0 1-10 10H26a10 10 0 0 1-10-10V62Z"
          fill={colors.emerald}
          opacity={0.92}
        />
        <Rect x="18" y="40" width="28" height="16" rx="3" fill={colors.glassWhite} opacity={0.9} />
        <Rect x="22" y="45" width="20" height="2.4" rx="1.2" fill={colors.liquidLabelA} />
        <Rect x="22" y="50" width="13" height="2.4" rx="1.2" fill={colors.liquidLabelB} />
        <Rect x="18.5" y="25" width="3.5" height="62" rx="2" fill={colors.glassWhite} opacity={0.7} />
      </Svg>

      {/* Syringe */}
      <Svg
        width={54}
        height={198}
        viewBox="0 0 54 198"
        fill="none"
        style={{ transform: [{ rotate: "-7deg" }], zIndex: 1 }}
      >
        <Defs>
          <LinearGradient id="penB" x1="19" y1="0" x2="35" y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.glassWhite} />
            <Stop offset="1" stopColor={colors.glassTint} />
          </LinearGradient>
        </Defs>
        {/* plunger thumb rest + rod */}
        <Rect x="15" y="2" width="24" height="6" rx="3" fill={colors.emerald} />
        <Rect x="24" y="8" width="6" height="33" rx="3" fill={colors.emerald} />
        {/* finger flange */}
        <Rect x="11" y="39" width="32" height="7" rx="3.5" fill={colors.emeraldDeep} />
        {/* barrel */}
        <Rect
          x="19"
          y="46"
          width="16"
          height="99"
          rx="4"
          fill="url(#penB)"
          stroke={colors.glassEdge}
          strokeWidth="1.5"
        />
        {/* medication */}
        <Path
          d="M20.2 101H33.8v38a3 3 0 0 1-3 3H23.2a3 3 0 0 1-3-3Z"
          fill={colors.emerald}
          opacity={0.9}
        />
        {/* graduation marks */}
        <G stroke={colors.gradMark} strokeWidth="1.4" strokeLinecap="round">
          <Path d="M29 60h5" />
          <Path d="M30.5 72h3.5" />
          <Path d="M29 84h5" />
          <Path d="M30.5 96h3.5" />
        </G>
        {/* needle hub + needle */}
        <Path d="M22.5 145h9l-1.7 9h-5.6Z" fill={colors.glassEdge} />
        <Rect x="26.2" y="153" width="1.6" height="42" rx="0.8" fill={colors.needle} />
        {/* highlight */}
        <Rect x="21.5" y="52" width="3" height="84" rx="1.5" fill={colors.glassWhite} opacity={0.6} />
      </Svg>
    </View>
  );
}
