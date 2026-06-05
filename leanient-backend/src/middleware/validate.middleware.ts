import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { z } from "zod";
import { ValidationError } from "../lib/errors";

export function validateBody<TSchema extends z.ZodTypeAny>(schema: TSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      next(new ValidationError("Invalid request body", parsed.error.flatten()));
      return;
    }

    req.body = parsed.data as z.infer<TSchema>;
    next();
  };
}
