import { Router } from "express";
import {
  leanientFocusAreaSchema,
  workoutCategorySchema,
  workoutEnergyPhaseSchema,
} from "@leanient/shared";
import { NotFoundError, ValidationError } from "../lib/errors";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { getUserProfile } from "../services/userProfile.service";
import {
  getRecommendedWorkouts,
  getWorkoutBySlug,
  listWorkoutsForUser,
} from "../services/workout.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = req.query.category ? workoutCategorySchema.safeParse(req.query.category) : undefined;

    if (category && !category.success) {
      throw new ValidationError("Invalid workout category", category.error.flatten());
    }

    const profile = await getUserProfile(req.user!.id);
    sendData(
      res,
      await listWorkoutsForUser(profile.equipmentAccess, {
        ...(category?.success ? { category: category.data } : {}),
      }),
    );
  }),
);

router.get(
  "/recommended",
  asyncHandler(async (req, res) => {
    const focus = req.query.focus ? leanientFocusAreaSchema.safeParse(req.query.focus) : undefined;
    const energyPhase = req.query.energyPhase
      ? workoutEnergyPhaseSchema.safeParse(req.query.energyPhase)
      : undefined;

    if (focus && !focus.success) {
      throw new ValidationError("Invalid workout focus", focus.error.flatten());
    }

    if (energyPhase && !energyPhase.success) {
      throw new ValidationError("Invalid workout energy phase", energyPhase.error.flatten());
    }

    sendData(
      res,
      await getRecommendedWorkouts({
        focus: focus?.success ? focus.data : undefined,
        energyPhase: energyPhase?.success ? energyPhase.data : undefined,
      }),
    );
  }),
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const workout = await getWorkoutBySlug(slug);

    if (!workout) {
      throw new NotFoundError("Workout not found");
    }

    sendData(res, workout);
  }),
);

export default router;
