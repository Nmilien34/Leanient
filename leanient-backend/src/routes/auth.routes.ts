import { Router } from "express";
import {
  appleSignInRequestSchema,
  googleSignInRequestSchema,
  type AppleSignInRequest,
  type GoogleSignInRequest,
} from "@leanient/shared";
import { isAppleSignInAvailable } from "../auth/apple";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import { sendData, sendNoContent } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import { signInWithApple, signInWithGoogle } from "../services/auth.service";

const router = Router();

router.post(
  "/google",
  validateBody(googleSignInRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as GoogleSignInRequest;
    const authResponse = await signInWithGoogle(body.idToken);
    sendData(res, authResponse);
  }),
);

router.post(
  "/apple",
  validateBody(appleSignInRequestSchema),
  asyncHandler(async (req, res) => {
    if (!isAppleSignInAvailable()) {
      throw new AppError({
        code: "APPLE_SIGN_IN_NOT_AVAILABLE",
        message: "Apple Sign-In is not currently available.",
        statusCode: 503,
      });
    }

    const body = req.body as AppleSignInRequest;
    const authResponse = await signInWithApple(body);
    sendData(res, authResponse);
  }),
);

router.post("/logout", requireAuth, (_req, res) => {
  // Stateless JWT logout is a client-side token discard. Server-side revocation
  // would need a token blacklist or refresh-token session model in v2.
  sendNoContent(res);
});

export default router;
