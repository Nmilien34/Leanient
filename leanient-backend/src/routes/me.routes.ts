import { Router } from "express";
import {
  avatarConfirmRequestSchema,
  avatarUploadIntentRequestSchema,
  patchMeRequestSchema,
  patchUserMedicationProtocolRequestSchema,
  patchUserProfileRequestSchema,
  type AvatarConfirmRequest,
  type AvatarUploadIntentRequest,
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
import {
  confirmAvatarUpload,
  createAvatarUploadIntent,
  getAvatarViewUrl,
} from "../services/avatar.service";

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

router.post(
  "/avatar/upload-intent",
  validateBody(avatarUploadIntentRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as AvatarUploadIntentRequest;
    sendData(res, await createAvatarUploadIntent(req.user!.id, body), 201);
  }),
);

router.post(
  "/avatar",
  validateBody(avatarConfirmRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as AvatarConfirmRequest;
    sendData(res, await confirmAvatarUpload(req.user!.id, body));
  }),
);

router.get(
  "/avatar/view-url",
  asyncHandler(async (req, res) => {
    sendData(res, await getAvatarViewUrl(req.user!.id));
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
