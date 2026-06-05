/**
 * Leanient design tokens — ported 1:1 from design/onboarding.html (:root).
 * Palette: clean warm paper + bright "game" emerald accent.
 */
export const colors = {
  // grounds
  paper: "#F3F2ED",
  card: "#FCFCFA",
  // splash mint gradient stops
  splashTop: "#F4FAF6",
  splashMid: "#E5F3EB",
  splashBottom: "#D4EBDE",
  // text
  ink: "#17191B",
  inkSoft: "#3A3D3A",
  muted: "#6E6F6A",
  faint: "#9A9B95",
  faintest: "#CBCBC4",
  line: "#E4E3DD",
  sageFill: "#ECECE6", // back button + progress track ground
  sageSoft: "#E7E7E1",
  glass: "rgba(255,255,255,0.55)", // glass option rows (approximates backdrop-blur)
  glassLine: "rgba(255,255,255,0.75)",
  // emerald accent family
  emeraldHi: "#6FE0A6",
  emerald: "#2FB87A",
  emeraldDeep: "#1F9E63",
  honey: "#E3A65E",
  // verdict state accents (drift = amber, losing-muscle = slate). Never red.
  amber: "#E3A65E",
  amberDeep: "#C8843A",
  slate: "#566159",
  // illustration (vial + syringe)
  glassWhite: "#FFFFFF",
  glassTint: "#E7F2EB",
  glassEdge: "#CFE6D7",
  needle: "#A9BFB2",
  gradMark: "#BFD9C8",
  liquidLabelA: "#9AD9B6",
  liquidLabelB: "#D2E7D9",
} as const;

export type ColorToken = keyof typeof colors;
