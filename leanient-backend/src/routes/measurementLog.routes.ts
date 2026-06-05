import { createMeasurementLogRequestSchema, patchMeasurementLogRequestSchema } from "@leanient/shared";
import { measurementLogService } from "../services/measurementLog.service";
import { createLogRouter } from "./logRoutes.factory";

export default createLogRouter({
  createSchema: createMeasurementLogRequestSchema,
  patchSchema: patchMeasurementLogRequestSchema,
  service: measurementLogService,
});
