import type { AxiosError } from "axios";
import { ERROR_CODES, type ApiError, type ApiErrorResponse } from "@leanient/shared";

/**
 * Turn a thrown error from the API client (which rethrows the raw `AxiosError`)
 * into the shared `ApiError` shape. Screens render off `error.code` (Frontend
 * Contract Discipline, Rule 6) instead of string-matching messages.
 *
 * The backend always responds with `{ error: { code, message, details? } }`
 * (`ApiErrorResponse`); when that envelope is absent (network failure, timeout,
 * non-API error) we synthesize a typed internal error so callers never have to
 * branch on `unknown`.
 */
export function extractApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const apiError = axiosError?.response?.data?.error;
  if (apiError && typeof apiError.code === "string" && typeof apiError.message === "string") {
    return apiError;
  }
  return {
    code: ERROR_CODES.internal,
    message: "Something went wrong. Please try again.",
  };
}

/** Convenience guard for branching UI on a specific backend error code. */
export function isApiErrorCode(error: unknown, code: string): boolean {
  return extractApiError(error).code === code;
}
