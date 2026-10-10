import { NextResponse } from "next/server";

export type ErrorCode =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "conflict"
  | "rate_limited"
  | "dependency_unavailable";

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: unknown;
  };
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  unavailable: 404,
  conflict: 409,
  rate_limited: 429,
  dependency_unavailable: 503,
};

const RETRYABLE_BY_CODE: Record<ErrorCode, number> = {
  validation: 0,
  unauthenticated: 0,
  forbidden: 0,
  unavailable: 0,
  conflict: 0,
  rate_limited: 1,
  dependency_unavailable: 1,
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      retryable: RETRYABLE_BY_CODE[code] === 1,
      ...(details === undefined ? {} : { details }),
    },
  };
  return NextResponse.json(body, { status: STATUS_BY_CODE[code] });
}

export function okResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/** Safe generic message for object-level denials (avoids existence leaks). */
export function deniedMessage(): string {
  return "Not found or unavailable.";
}
