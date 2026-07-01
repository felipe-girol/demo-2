import type { ApiError, ApiResult } from '../types/api.type'
import type { HealthStatus } from '../types/health.type'

/** Base path for all API access. Defaults to `/api` (proxied in dev). */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Abort a request after this many ms so a hung backend cannot block the UI. */
const REQUEST_TIMEOUT_MS = 8000

function toApiError(status: number, message: string): ApiError {
  return { status, message }
}

/**
 * Best-effort parse of a non-2xx JSON body into a meaningful message.
 * Backend errors use `{ errors: string[] }` (validation) or `{ error | message }`.
 * Falls back to the generic status text when the body is missing or unreadable.
 */
async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`
  try {
    const body = (await response.json()) as unknown
    if (body && typeof body === 'object') {
      const { errors, error, message } = body as {
        errors?: unknown
        error?: unknown
        message?: unknown
      }
      if (Array.isArray(errors) && errors.length > 0) {
        return errors.filter((e) => typeof e === 'string').join(', ') || fallback
      }
      if (typeof error === 'string' && error.length > 0) return error
      if (typeof message === 'string' && message.length > 0) return message
    }
    return fallback
  } catch {
    return fallback
  }
}

/**
 * Single typed HTTP entry point. Returns a discriminated `ApiResult<T>` so
 * callers never deal with raw throws. Network errors and timeouts map to
 * status 0; non-2xx responses keep their HTTP status.
 */
export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      return {
        ok: false,
        error: toApiError(response.status, await readErrorMessage(response)),
      }
    }

    // 204 No Content (e.g. DELETE) has no body to parse.
    if (response.status === 204) {
      return { ok: true, data: undefined as T }
    }

    const data = (await response.json()) as T
    return { ok: true, data }
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Request timed out'
        : 'Network error: the service is unreachable'
    return { ok: false, error: toApiError(0, message) }
  } finally {
    clearTimeout(timeout)
  }
}

/** Typed health check used by the layout service indicator. */
export function getHealth(): Promise<ApiResult<HealthStatus>> {
  return request<HealthStatus>('/health')
}
