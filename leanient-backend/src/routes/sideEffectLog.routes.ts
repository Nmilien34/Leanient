import { createSideEffectLogRequestSchema, patchSideEffectLogRequestSchema } from "@leanient/shared";
import { sideEffectLogService } from "../services/sideEffectLog.service";
import { createLogRouter } from "./logRoutes.factory";

export default createLogRouter({
  createSchema: createSideEffectLogRequestSchema,
  patchSchema: patchSideEffectLogRequestSchema,
  service: sideEffectLogService,
});
