import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type {
  LeanientFocusArea,
  WorkoutCategory,
  WorkoutDifficulty,
  WorkoutEquipment,
  WorkoutEnergyPhase,
  WorkoutExercise,
  WorkoutIntensity,
} from "@leanient/shared";

export interface WorkoutDocument extends Document<Types.ObjectId> {
  slug: string;
  title: string;
  shortDescription: string;
  // LEGACY: kept for compatibility with existing /workouts/recommended consumers.
  // Deprecate once /training/today fully replaces that endpoint.
  focus: LeanientFocusArea;
  // LEGACY: kept for compatibility with existing /workouts/recommended consumers.
  // Deprecate once /training/today fully replaces that endpoint.
  energyPhase: WorkoutEnergyPhase;
  durationMinutes: number;
  // LEGACY: kept for compatibility with existing /workouts/recommended consumers.
  // The recommendation engine uses intensity and category instead.
  difficulty: WorkoutDifficulty;
  equipment: WorkoutEquipment;
  intensity: WorkoutIntensity;
  muscleGroups: string[];
  category: WorkoutCategory;
  exercises: WorkoutExercise[];
  safetyNotes: string[];
  tags: string[];
  version: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workoutExerciseSchema = new Schema<WorkoutExercise>(
  {
    name: { type: String, required: true, trim: true },
    sets: { type: Number, required: true, min: 1 },
    reps: { type: String, required: true, trim: true },
    restSeconds: { type: Number, required: true, min: 0 },
    muscleGroups: { type: [String], default: [] },
    notes: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const workoutSchema = new Schema<WorkoutDocument>(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    focus: {
      type: String,
      enum: ["losing_muscle", "ozempic_face", "strength", "energy", "side_effects", "confidence"],
      required: true,
      index: true,
    },
    energyPhase: {
      type: String,
      enum: ["shot_day", "low_energy", "steady_energy", "high_energy"],
      required: true,
      index: true,
    },
    durationMinutes: { type: Number, required: true, min: 1 },
    difficulty: { type: String, enum: ["beginner", "intermediate"], required: true },
    equipment: {
      type: String,
      enum: ["none", "bodyweight", "dumbbells", "minimal", "gym", "gentle"],
      required: true,
      index: true,
    },
    intensity: {
      type: String,
      enum: ["easy", "moderate", "hard", "recovery"],
      required: true,
      index: true,
    },
    muscleGroups: { type: [String], default: [] },
    category: {
      type: String,
      enum: ["strength", "mobility", "recovery", "conditioning"],
      required: true,
      index: true,
    },
    exercises: { type: [workoutExerciseSchema], default: [] },
    safetyNotes: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    version: { type: Number, required: true, default: 1 },
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

workoutSchema.index({ active: 1, category: 1, intensity: 1 });

export const WorkoutModel = mongoose.model<WorkoutDocument>("Workout", workoutSchema);
