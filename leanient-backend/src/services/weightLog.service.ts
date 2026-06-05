import type { CreateWeightLogRequest } from "@leanient/shared";
import { WeightLogModel } from "../models/weightLog.model";
import { serializeWeightLog } from "./serializers";

export async function createManualWeightLog(userId: string, body: CreateWeightLogRequest) {
  const weightLog = await WeightLogModel.create({
    userId,
    value: body.value,
    unit: body.unit,
    measuredAt: new Date(body.measuredAt),
    source: "manual",
  });

  return serializeWeightLog(weightLog);
}

export async function listWeightLogs(userId: string) {
  const logs = await WeightLogModel.find({ userId }).sort({ measuredAt: 1 });
  return logs.map(serializeWeightLog);
}
