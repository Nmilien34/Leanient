import React, { useEffect, useRef, useState, useReducer } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, Modal } from "react-native";
import { ModalSafeArea } from "../layout/ModalSafeArea";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle, G, Path } from "react-native-svg";
import type { Workout } from "@leanient/shared";
import { ExerciseIcon } from "./ExerciseIcon";
import { font } from "../../theme/fonts";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// Hold-to-complete: hold the dumbbell this long and the exercise logs itself.
const HOLD_MS = 2000;
const RING_RADIUS = 96;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
import {
  completedExerciseCount,
  initSession,
  selectExerciseSegmentFills,
  selectView,
  sessionReducer,
  type CompletedWorkout,
} from "../../screens/app/workoutSession";

function Dumbbell() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
      <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
    </Svg>
  );
}

function Spark() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

function percentWidth(value: number): `${number}%` {
  return `${Math.min(100, Math.max(0, value * 100))}%` as `${number}%`;
}

interface PlayerInnerProps {
  workout: Workout;
  restCue: string;
  onClose: () => void;
  onComplete: (summary: CompletedWorkout) => void;
}

/** Mounted fresh each time the player opens, so session state always resets. */
function PlayerInner({ workout, restCue, onClose, onComplete }: PlayerInnerProps) {
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initSession>, a: Parameters<typeof sessionReducer>[1]) => sessionReducer(s, a, workout),
    undefined,
    initSession,
  );
  const view = selectView(state, workout);

  // Wall-clock elapsed for the session, counted while not complete → the "Time" tile.
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  useEffect(() => {
    if (state.phase === "complete") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // Rest countdown: tick once a second while resting; the reducer auto-advances at 0.
  useEffect(() => {
    if (state.phase !== "resting") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // Hand the completed-session summary (screen 21) back to the parent.
  useEffect(() => {
    if (state.phase !== "complete") return;
    onComplete({
      workoutId: workout.id,
      title: workout.title,
      durationMinutes: workout.durationMinutes,
      exercisesCompleted: completedExerciseCount(state, workout),
      exercisesTotal: workout.exercises.length,
      elapsedSeconds: elapsedRef.current,
    });
  }, [state, workout, onComplete]);

  // Hold-to-complete the dumbbell: the ring and top segment fill over HOLD_MS, then the exercise logs.
  const hold = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    holdAnim.current?.stop();
    hold.setValue(0);
    setHolding(false);
  }, [state.exerciseIndex, state.phase, state.set, hold]);

  const startHold = () => {
    setHolding(true);
    hold.setValue(0);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    const anim = Animated.timing(hold, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false, // animating SVG strokeDashoffset
    });
    holdAnim.current = anim;
    anim.start(({ finished }) => {
      setHolding(false);
      if (finished) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        dispatch({ type: "DONE" });
      }
    });
  };

  const cancelHold = () => {
    holdAnim.current?.stop();
    setHolding(false);
    Animated.timing(hold, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  if (state.phase === "complete") return null;

  const resting = state.phase === "resting";
  const segmentFills = selectExerciseSegmentFills(state, workout, 0);
  const activeSegmentBase = segmentFills[view.exerciseIndex] ?? 0;
  const activeSegmentTarget =
    state.phase === "active"
      ? (selectExerciseSegmentFills(state, workout, 1)[view.exerciseIndex] ?? activeSegmentBase)
      : activeSegmentBase;
  const activeSegmentWidth = hold.interpolate({
    inputRange: [0, 1],
    outputRange: [percentWidth(activeSegmentBase), percentWidth(activeSegmentTarget)],
  });

  return (
    <LinearGradient colors={["#142a1e", "#0b120d"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.root}>
      <StatusBar style="light" />
      <ModalSafeArea style={styles.safe}>
        {/* top bar */}
        <View style={styles.top}>
          <Pressable accessibilityLabel="Close workout" onPress={onClose} style={styles.x}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#EAF3EC" strokeWidth={2.2} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
          <Text style={styles.title}>{view.headerTitle}</Text>
          <Text style={styles.count}>{view.progressLabel}</Text>
        </View>

        {/* exercise progress segments */}
        <View style={styles.seg}>
          {Array.from({ length: view.total }, (_, i) => {
            const isCurrent = i === view.exerciseIndex;
            const fillWidth =
              isCurrent && state.phase === "active"
                ? activeSegmentWidth
                : percentWidth(segmentFills[i] ?? 0);

            return (
              <View key={i} style={[styles.segItem, isCurrent && styles.segCurrentTrack]}>
                <Animated.View style={[styles.segFill, { width: fillWidth }]} />
              </View>
            );
          })}
        </View>

        {/* stage */}
        <View style={styles.stage}>
          {resting ? (
            <>
              <Text style={styles.eyebrow}>REST</Text>
              <Text style={styles.timer}>{view.restLabel}</Text>
              <Text style={styles.cue}>{restCue}</Text>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={view.isFinalSet ? "Hold to finish workout" : "Hold to complete exercise"}
                onPressIn={startHold}
                onPressOut={cancelHold}
                style={styles.disc}
              >
                {/* progress ring that fills while held */}
                <Svg width={200} height={200} style={StyleSheet.absoluteFill}>
                  <Circle cx={100} cy={100} r={RING_RADIUS} stroke="rgba(127,227,171,0.18)" strokeWidth={5} fill="none" />
                  <G rotation={-90} origin="100, 100">
                    <AnimatedCircle
                      cx={100}
                      cy={100}
                      r={RING_RADIUS}
                      stroke="#7FE3AB"
                      strokeWidth={5}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={hold.interpolate({
                        inputRange: [0, 1],
                        outputRange: [RING_CIRCUMFERENCE, 0],
                      })}
                    />
                  </G>
                </Svg>
                <LinearGradient
                  colors={holding ? ["#8FF0BC", "#1F9E63"] : ["#6FE0A6", "#23A869"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={[styles.discIcon, holding && styles.discIconHolding]}
                >
                  <ExerciseIcon name={view.current.name} muscleGroups={view.current.muscleGroups} size={40} />
                </LinearGradient>
                <Text style={styles.holdCaption}>
                  {holding ? "Keep holding..." : view.isFinalSet ? "Hold to finish" : "Hold to complete"}
                </Text>
              </Pressable>
              <Text style={[styles.eyebrow, styles.eyebrowSpace]}>{view.current.eyebrow}</Text>
              <Text style={styles.name}>{view.current.name}</Text>
              <Text style={styles.reps}>{view.current.reps}</Text>
              {view.current.cue ? <Text style={styles.cue}>{view.current.cue}</Text> : null}
            </>
          )}
        </View>

        {/* next up */}
        {view.nextUp ? (
          <View style={styles.next}>
            <View style={styles.nextIcon}>{resting ? <Dumbbell /> : <Spark />}</View>
            <View style={styles.flex}>
              <Text style={styles.nextLabel}>{view.nextUp.label}</Text>
              <Text style={styles.nextText}>{view.nextUp.text}</Text>
            </View>
          </View>
        ) : null}

        {/* foot */}
        <View style={styles.foot}>
          {resting ? (
            <>
              <View style={styles.restRow}>
                <Pressable accessibilityRole="button" accessibilityLabel="Add 20 seconds" onPress={() => dispatch({ type: "ADD_REST" })} style={styles.pill}>
                  <Text style={styles.pillText}>+20s</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Skip rest" onPress={() => dispatch({ type: "SKIP_REST" })} style={[styles.pill, styles.pillAccent]}>
                  <Text style={[styles.pillText, styles.pillAccentText]}>Skip rest</Text>
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="End workout" onPress={() => dispatch({ type: "END" })} style={styles.subRowCenter}>
                <Text style={styles.end}>End workout</Text>
              </Pressable>
            </>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="End workout" onPress={() => dispatch({ type: "END" })} style={styles.subRowCenter}>
              <Text style={styles.end}>End workout</Text>
            </Pressable>
          )}
        </View>
      </ModalSafeArea>
    </LinearGradient>
  );
}

interface WorkoutPlayerProps {
  visible: boolean;
  workout: Workout;
  /** Shot-cycle-aware rest cue (screen 20); defaults to a neutral line. */
  restCue?: string;
  onClose: () => void;
  /** Fired when the session ends (finished or ended early) with a summary → completion, screen 21. */
  onComplete?: (summary: CompletedWorkout) => void;
}

/**
 * The in-session workout player (screen 19 + rest state, screen 20). All session
 * logic lives in the pure `workoutSession` reducer; this renders the active and
 * resting states from it. Walks the workout's exercises; nothing is hardcoded.
 */
export function WorkoutPlayer({ visible, workout, restCue, onClose, onComplete }: WorkoutPlayerProps) {
  const hasExercises = workout.exercises.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      {visible && hasExercises ? (
        <PlayerInner
          workout={workout}
          restCue={restCue ?? "Breathe and shake out the arms. You've got the next set."}
          onClose={onClose}
          onComplete={onComplete ?? onClose}
        />
      ) : null}
    </Modal>
  );
}

const ACCENT = "#7FE3AB";
const LIGHT = "#EAF3EC";

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6 },
  x: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.bold, fontSize: 13, color: LIGHT },
  count: { fontFamily: font.bold, fontSize: 13, color: ACCENT, minWidth: 36, textAlign: "right" },
  seg: { flexDirection: "row", gap: 5, paddingHorizontal: 20, paddingTop: 16 },
  segItem: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  segCurrentTrack: { backgroundColor: "rgba(127,227,171,0.22)" },
  segFill: { height: "100%", borderRadius: 3, backgroundColor: "#2FB87A" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  disc: { width: 200, height: 200, borderRadius: 100, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(127,227,171,0.06)" },
  discIcon: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  discIconHolding: { transform: [{ scale: 1.06 }] },
  eyebrow: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1.4, color: ACCENT },
  eyebrowSpace: { marginTop: 26 },
  name: { fontFamily: font.extrabold, fontSize: 27, letterSpacing: -0.54, color: "#F4FBF6", marginTop: 10, textAlign: "center" },
  reps: { fontFamily: font.semibold, fontSize: 16, color: "#B9CCBE", marginTop: 8 },
  cue: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 18, color: "#9FB6A4", marginTop: 14, textAlign: "center", maxWidth: 290 },
  timer: { fontFamily: font.extrabold, fontSize: 62, letterSpacing: -1.2, color: "#F4FBF6", marginTop: 14 },
  next: { flexDirection: "row", alignItems: "center", gap: 11, marginHorizontal: 20, padding: 13, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  nextIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(127,227,171,0.14)" },
  flex: { flex: 1 },
  nextLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.8, color: ACCENT },
  nextText: { fontFamily: font.bold, fontSize: 14.5, color: LIGHT, marginTop: 2 },
  foot: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  holdCaption: { fontFamily: font.semibold, fontSize: 11.5, letterSpacing: 0.4, color: "rgba(244,251,246,0.72)", marginTop: 10 },
  subRowCenter: { alignItems: "center", paddingVertical: 14 },
  end: { fontFamily: font.semibold, fontSize: 14, color: "#D8A0A0" },
  restRow: { flexDirection: "row", gap: 11 },
  pill: { flex: 1, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  pillAccent: { backgroundColor: "rgba(127,227,171,0.14)", borderColor: "rgba(127,227,171,0.4)" },
  pillText: { fontFamily: font.bold, fontSize: 15, color: LIGHT },
  pillAccentText: { color: ACCENT },
});

export default WorkoutPlayer;
