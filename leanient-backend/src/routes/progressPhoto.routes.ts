import { Router } from "express";
import {
  progressPhotoConfirmRequestSchema,
  progressPhotoUploadIntentRequestSchema,
  type ProgressPhotoConfirmRequest,
  type ProgressPhotoUploadIntentRequest,
} from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { ValidationError } from "../lib/errors";
import { sendData, sendNoContent } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import {
  confirmProgressPhotoUpload,
  createProgressPhotoUploadIntent,
  deleteProgressPhoto,
  getProgressPhotoViewUrl,
  listProgressPhotos,
} from "../services/progressPhoto.service";

const router = Router();

router.use(requireAuth);

function getRouteId(value: string | string[] | undefined): string {
  if (!value || Array.isArray(value)) {
    throw new ValidationError("Invalid route id");
  }

  return value;
}

router.post(
  "/upload-intent",
  validateBody(progressPhotoUploadIntentRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ProgressPhotoUploadIntentRequest;
    sendData(res, await createProgressPhotoUploadIntent(req.user!.id, body), 201);
  }),
);

router.post(
  "/confirm",
  validateBody(progressPhotoConfirmRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ProgressPhotoConfirmRequest;
    sendData(res, await confirmProgressPhotoUpload(req.user!.id, body));
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    sendData(res, await listProgressPhotos(req.user!.id));
  }),
);

router.get(
  "/:id/view-url",
  asyncHandler(async (req, res) => {
    sendData(res, await getProgressPhotoViewUrl(req.user!.id, getRouteId(req.params.id)));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteProgressPhoto(req.user!.id, getRouteId(req.params.id));
    sendNoContent(res);
  }),
);

export default router;
