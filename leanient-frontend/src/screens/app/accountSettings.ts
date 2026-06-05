import type { PatchMeRequest, User } from "@leanient/shared";

/**
 * Persist an Account edit: PATCH /me, then apply the returned User to AuthContext
 * so the app reflects the change. The name (displayName) lives on the signed-in
 * User, not on the home-data profile, so the refresh mechanism here is
 * AuthContext.updateCachedUser, not refreshHomeData.
 *
 * Kept as a small pure orchestrator so the network contract is testable without
 * rendering the screen (the edit-sheet UI + error handling lives in AccountScreen).
 * Rejection propagates so the caller can surface the error and keep the sheet open.
 */
export interface PersistAccountEditDeps {
  patchMe(body: PatchMeRequest): Promise<User>;
  applyUser(user: User): Promise<unknown>;
}

export async function persistAccountEdit(
  updates: PatchMeRequest,
  deps: PersistAccountEditDeps,
): Promise<User> {
  const updated = await deps.patchMe(updates);
  await deps.applyUser(updated);
  return updated;
}
