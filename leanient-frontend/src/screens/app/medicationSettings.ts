import type { PatchUserMedicationProtocolRequest, UserMedicationProtocol } from "@leanient/shared";

/**
 * Persist a medication-schedule edit: PATCH /me/medication, then run the context
 * refresh so the rest of the app (Home, Medication screen) reflects the change.
 * The protocol is part of home data, so refreshHomeData is the right mechanism.
 *
 * Pure orchestrator (testable without rendering); the edit-sheet UI + error
 * handling lives in MedicationScreen. Rejection propagates so the caller can
 * surface the error and keep the sheet open without losing the user's input.
 */
export interface PersistMedicationEditDeps {
  patchMedicationProtocol(
    body: PatchUserMedicationProtocolRequest,
  ): Promise<UserMedicationProtocol>;
  refresh(): Promise<void>;
}

export async function persistMedicationEdit(
  updates: PatchUserMedicationProtocolRequest,
  deps: PersistMedicationEditDeps,
): Promise<void> {
  await deps.patchMedicationProtocol(updates);
  await deps.refresh();
}
