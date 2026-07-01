/** A normalized error surfaced by the typed API client. */
export type ApiError = {
  /** HTTP status code, or 0 for network/timeout failures. */
  status: number
  message: string
}

/**
 * Discriminated result returned by every API call so callers branch on `ok`
 * instead of catching thrown errors.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }
