import type { PatchUserMedicationProtocolRequest } from "@leanient/shared";
import { NotFoundError } from "../lib/errors";
import { MedicationCatalogItemModel } from "../models/medicationCatalogItem.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { serializeMedicationCatalogItem, serializeMedicationProtocol } from "./serializers";

export async function listMedicationCatalog(): Promise<
  ReturnType<typeof serializeMedicationCatalogItem>[]
> {
  const medications = await MedicationCatalogItemModel.find({ active: true }).sort({
    displayOrder: 1,
    genericName: 1,
  });

  return medications.map(serializeMedicationCatalogItem);
}

export async function getMedicationProtocol(
  userId: string,
): Promise<ReturnType<typeof serializeMedicationProtocol>> {
  const protocol = await UserMedicationProtocolModel.findOne({ userId });

  if (!protocol) {
    throw new NotFoundError("Medication protocol not found");
  }

  return serializeMedicationProtocol(protocol);
}

export async function patchMedicationProtocol(
  userId: string,
  patch: PatchUserMedicationProtocolRequest,
): Promise<ReturnType<typeof serializeMedicationProtocol>> {
  const protocol = await UserMedicationProtocolModel.findOneAndUpdate(
    { userId },
    { $set: patch },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!protocol) {
    throw new NotFoundError("Medication protocol not found");
  }

  return serializeMedicationProtocol(protocol);
}
