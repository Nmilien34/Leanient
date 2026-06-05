import type {
  CreateSideEffectLogRequest,
  PatchSideEffectLogRequest,
  SideEffectLog,
} from "@leanient/shared";
import { SideEffectLogModel, type SideEffectLogDocument } from "../models/sideEffectLog.model";
import { createDailyLogService } from "./logCrud.service";
import { serializeSideEffectLog } from "./serializers";

export const sideEffectLogService = createDailyLogService<
  SideEffectLogDocument,
  CreateSideEffectLogRequest,
  PatchSideEffectLogRequest,
  SideEffectLog
>({
  model: SideEffectLogModel,
  serialize: serializeSideEffectLog,
  name: "Side effect log",
});
