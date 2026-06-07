import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * Pick a fitness glyph for an exercise from its name + muscle groups, so the
 * workout player shows a movement-appropriate icon instead of a generic
 * dumbbell every time. Falls back to the dumbbell when nothing matches.
 */
function pickIcon(name: string, muscleGroups: string[]): IconName {
  const hay = `${name} ${muscleGroups.join(" ")}`.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => hay.includes(k));

  if (has("run", "sprint", "cardio", "hiit", "jump", "jog", "conditioning", "burpee")) {
    return "run-fast";
  }
  if (has("squat", "lunge", "deadlift", "glute", "quad", "hamstring", "calf", "leg", "lower body", "step-up")) {
    return "weight-lifter";
  }
  if (has("plank", "core", "abs", "ab ", "oblique", "crunch", "sit-up", "mobility", "stretch", "yoga", "hollow")) {
    return "yoga";
  }
  if (has("shoulder", "overhead", "delt", "lateral raise", "front raise", "shrug")) {
    return "human-handsup";
  }
  if (has("chest", "push", "row", "back", "pull", "lat", "bicep", "tricep", "arm", "curl", "press")) {
    return "arm-flex";
  }
  return "dumbbell";
}

interface ExerciseIconProps {
  name: string;
  muscleGroups: string[];
  size?: number;
  color?: string;
}

export function ExerciseIcon({ name, muscleGroups, size = 40, color = "#fff" }: ExerciseIconProps) {
  return <MaterialCommunityIcons name={pickIcon(name, muscleGroups)} size={size} color={color} />;
}

export default ExerciseIcon;
