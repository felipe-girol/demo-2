import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getHealth, request } from './api-client'
import type { HealthStatus } from '../types/health.type'

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api-client request', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns ok with parsed data on a 2xx response', async () => {
    const payload = { hello: 'world' }
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.resolve(payload) })

    const result = await request<typeof payload>('/thing')

    expect(result).toEqual({ ok: true, data: payload })
  })

  it('targets the configured base path', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })

    await request('/thing')

    expect(fetchMock).toHaveBeenCalledWith('/api/thing', expect.any(Object))
  })

  it('returns a normalized error keeping the HTTP status on non-2xx', async () => {
    mockFetchOnce({ ok: false, status: 404, json: () => Promise.resolve({}) })

    const result = await request('/missing')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(404)
    }
  })

  it('maps a validation { errors: string[] } body into the error message', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ errors: ['name is required', 'capacity invalid'] }),
    })

    const result = await request('/rockets')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(400)
      expect(result.error.message).toBe('name is required, capacity invalid')
    }
  })

  it('maps an { error } body into the error message', async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Rocket not found' }),
    })

    const result = await request('/rockets/x')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe('Rocket not found')
    }
  })

  it('maps a { message } body into the error message', async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Unprocessable' }),
    })

    const result = await request('/rockets')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe('Unprocessable')
    }
  })

  it('falls back to a generic message when the error body is unreadable', async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })

    const result = await request('/rockets')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe('Request failed (500)')
    }
  })

  it('returns ok with undefined data on a 204 No Content response', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    })

    const result = await request<void>('/rockets/x', { method: 'DELETE' })

    expect(fetchMock).toHaveBeenCalled()
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('maps a network failure to status 0', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await request('/thing')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(0)
    }
  })

  it('maps an aborted (timeout) request to a timeout error', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    const fetchMock = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', fetchMock)

    const result = await request('/thing')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(0)
      expect(result.error.message).toContain('timed out')
    }
  })
})

describe('getHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests /health and returns the typed status', async () => {
    const health: HealthStatus = { status: 'ok', timestamp: '2026-06-28T00:00:00.000Z' }
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(health),
    })

    const result = await getHealth()

    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.any(Object))
    expect(result).toEqual({ ok: true, data: health })
  })
})
