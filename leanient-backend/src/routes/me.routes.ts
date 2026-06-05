import { Router } from "express";
import {
  patchMeRequestSchema,
  patchUserMedicationProtocolRequestSchema,
  patchUserProfileRequestSchema,
  type PatchMeRequest,
  type PatchUserMedicationProtocolRequest,
  type PatchUserProfileRequest,
} from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import { getUserById, serializeUser, updateUserProfile } from "../services/user.service";
import { getUserProfile, patchUserProfile } from "../services/userProfile.service";
import { getMedicationProtocol, patchMedicationProtocol } from "../services/medication.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.user!.id);
    sendData(res, serializeUser(user));
  }),
);

router.patch(
  "/",
  validateBody(patchMeRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as PatchMeRequest;
    const user = await updateUserProfile(req.user!.id, body);
    sendData(res, serializeUser(user));
  }),
);

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    sendData(res, await getUserProfile(req.user!.id));
  }),
);

router.patch(
  "/profile",
  validateBody(patchUserProfileRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as PatchUserProfileRequest;
    sendData(res, await patchUserProfile(req.user!.id, body));
  }),
);

router.get(
  "/medication",
  asyncHandler(async (req, res) => {
    sendData(res, await getMedicationProtocol(req.user!.id));
  }),
);

router.patch(
  "/medication",
  validateBody(patchUserMedicationProtocolRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as PatchUserMedicationProtocolRequest;
    sendData(res, await patchMedicationProtocol(req.user!.id, body));
  }),
);

export default router;
