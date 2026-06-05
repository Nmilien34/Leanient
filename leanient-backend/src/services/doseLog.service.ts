import type { CreateDoseLogRequest, DoseLog, PatchDoseLogRequest } from "@leanient/shared";
import { DoseLogModel, type DoseLogDocument } from "../models/doseLog.model";
import { createDailyLogService } from "./logCrud.service";
import { serializeDoseLog } from "./serializers";

export const doseLogService = createDailyLogService<
  DoseLogDocument,
  CreateDoseLogRequest,
  PatchDoseLogRequest,
  DoseLog
>({
  model: DoseLogModel,
  serialize: serializeDoseLog,
  name: "Dose log",
});
