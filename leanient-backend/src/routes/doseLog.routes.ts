import { createDoseLogRequestSchema, patchDoseLogRequestSchema } from "@leanient/shared";
import { doseLogService } from "../services/doseLog.service";
import { createLogRouter } from "./logRoutes.factory";

export default createLogRouter({
  createSchema: createDoseLogRequestSchema,
  patchSchema: patchDoseLogRequestSchema,
  service: doseLogService,
});
