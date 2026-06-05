import React from "react";
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

let __lg = 0;

interface LogoMarkProps {
  size?: number;
  /** White body (for dark/colored grounds). Default: emerald gradient body. */
  white?: boolean;
}

/**
 * Leanient mark — an injection pen (barrel + dose graduation ticks + needle).
 * Ported 1:1 from design/onboarding.html logoMark().
 */
export function LogoMark({ size = 30, white = false }: LogoMarkProps) {
  const id = `lg${__lg++}`;
  const w = Math.round(size * 0.74);
  const body = white ? "#FFFFFF" : `url(#${id})`;
  const tick = white ? "#239E64" : "#F4FBF7";
  const tickOpacity = white ? 1 : 0.92;

  return (
    <Svg width={w} height={size} viewBox="0 0 36 48" fill="none">
      <Defs>
        <LinearGradient id={id} x1="8" y1="2" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#6FE0A6" />
          <Stop offset="1" stopColor="#23A869" />
        </LinearGradient>
      </Defs>
      {/* barrel */}
      <Rect x="11" y="2" width="14" height="29" rx="7" fill={body} />
      {/* dose graduation ticks */}
      <G stroke={tick} strokeWidth="2" strokeLinecap="round" opacity={tickOpacity}>
        <Path d="M18.5 16h4" />
        <Path d="M18.5 20.5h4" />
        <Path d="M18.5 25h4" />
      </G>
      {/* needle hub + needle */}
      <Rect x="13.8" y="30.5" width="8.4" height="3.4" rx="1.7" fill={body} />
      <Rect x="16.6" y="33.5" width="2.8" height="12.5" rx="1.4" fill={body} />
    </Svg>
  );
}

export default LogoMark;
