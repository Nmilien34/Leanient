import type { Response } from "express";
import type { ApiResponse } from "@leanient/shared";

export function sendData<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiResponse<T> = { data };
  res.status(statusCode).json(body);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
