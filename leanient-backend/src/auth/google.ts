import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { AuthError } from "../lib/errors";
import { withTimeout } from "../lib/timeout";
import type { ProviderIdentity } from "./identity";

const googleClient = new OAuth2Client(env.google.clientId);

export async function verifyGoogleIdToken(idToken: string): Promise<ProviderIdentity> {
  try {
    const ticket = await withTimeout(
      googleClient.verifyIdToken({
        idToken,
        // Array form so additional client IDs (web, Android) can be added later without code changes.
        audience: [env.google.clientId],
      }),
      5000,
      "Google ID token verification",
    );

    const payload = ticket.getPayload();

    if (!payload?.sub) {
      throw new AuthError("Google ID token is missing a subject");
    }

    return {
      provider: "google",
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError("Google sign-in could not be verified");
  }
}
