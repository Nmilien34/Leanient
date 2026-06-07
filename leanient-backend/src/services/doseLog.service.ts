import type { CreateDoseLogRequest, DoseLog, PatchDoseLogRequest } from "@leanient/shared";
import { DoseLogModel, type DoseLogDocument } from "../models/doseLog.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { ValidationError } from "../lib/errors";
import { createDailyLogService } from "./logCrud.service";
import { serializeDoseLog } from "./serializers";

const baseDoseLogService = createDailyLogService<
  DoseLogDocument,
  CreateDoseLogRequest,
  PatchDoseLogRequest,
  DoseLog
>({
  model: DoseLogModel,
  serialize: serializeDoseLog,
  name: "Dose log",
});

export const doseLogService = {
  ...baseDoseLogService,

  async create(userId: string, body: CreateDoseLogRequest): Promise<DoseLog> {
    const protocol = await UserMedicationProtocolModel.findOne({ userId, active: true });

    if (!protocol) {
      throw new ValidationError("Medication protocol not found");
    }

    return baseDoseLogService.create(userId, {
      ...body,
      medicationProtocolId: protocol._id.toString(),
    });
  },
};
