/**
 * Onboarding conversation palette — the dark "ink" ground the coach talks on,
 * ported 1:1 from design/onboarding-v2.html (.screen.dark). The main app stays
 * on the paper tokens; only the onboarding conversation lives here.
 */
export const ink = {
  ground: "#101F19",
  groundDeep: "#0E1A15",
  groundGlow: "rgba(111,224,166,0.10)",
  // text
  bright: "#EEF4EA",
  dim: "rgba(238,244,234,0.32)",
  soft: "rgba(238,244,234,0.55)",
  faint: "rgba(238,244,234,0.45)",
  // chrome
  hairline: "rgba(238,244,234,0.18)",
  chipBorder: "rgba(238,244,234,0.22)",
  chipText: "rgba(238,244,234,0.85)",
  bubbleGround: "rgba(238,244,234,0.10)",
  bubbleLine: "rgba(238,244,234,0.14)",
  // accents (shared emerald family, on-ink variants)
  emerald: "#2FB87A",
  emeraldHi: "#6FE0A6",
  onEmerald: "#0E1A15",
} as const;
