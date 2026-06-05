import type {
  CreateMeasurementLogRequest,
  MeasurementLog,
  PatchMeasurementLogRequest,
} from "@leanient/shared";
import { MeasurementLogModel, type MeasurementLogDocument } from "../models/measurementLog.model";
import { createDailyLogService } from "./logCrud.service";
import { serializeMeasurementLog } from "./serializers";

export const measurementLogService = createDailyLogService<
  MeasurementLogDocument,
  CreateMeasurementLogRequest,
  PatchMeasurementLogRequest,
  MeasurementLog
>({
  model: MeasurementLogModel,
  serialize: serializeMeasurementLog,
  name: "Measurement log",
});
