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
import { linkAppleProvider, signInWithApple, signInWithGoogle, signInWithReviewAccount } from "../services/auth.service";

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

router.post(
  "/apple/link",
  requireAuth,
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
    sendData(res, await linkAppleProvider(req.user!.id, body));
  }),
);

// Demo login for App Store review (guideline 2.1a). Email + password sign-in
// scoped to the seeded demo account; not a general password auth path.
router.post(
  "/demo",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      throw new AppError({ code: "validation", message: "Email and password are required.", statusCode: 400 });
    }
    sendData(res, await signInWithReviewAccount(body.email, body.password));
  }),
);

router.post("/logout", requireAuth, (_req, res) => {
  // Stateless JWT logout is a client-side token discard. Server-side revocation
  // would need a token blacklist or refresh-token session model in v2.
  sendNoContent(res);
});

export default router;
