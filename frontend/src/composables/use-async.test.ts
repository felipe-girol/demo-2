import { describe, expect, it, vi } from 'vitest'
import { useAsync } from './use-async'
import type { ApiResult } from '../types/api.type'

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data }
}

function fail<T>(status: number, message: string): ApiResult<T> {
  return { ok: false, error: { status, message } }
}

describe('useAsync', () => {
  it('starts idle with no data, error, or loading', () => {
    const { data, error, loading } = useAsync<number>()

    expect(data.value).toBeNull()
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('stores data and clears loading on a successful loader', async () => {
    const { data, error, loading, run } = useAsync<string>()

    await run(() => Promise.resolve(ok('payload')))

    expect(data.value).toBe('payload')
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('toggles loading true while the loader is in flight', async () => {
    const { loading, run } = useAsync<string>()

    const pending = run(() => Promise.resolve(ok('x')))
    expect(loading.value).toBe(true)

    await pending
    expect(loading.value).toBe(false)
  })

  it('captures the normalized error from a failing loader', async () => {
    const { data, error, run } = useAsync<string>()

    await run(() => Promise.resolve(fail(500, 'boom')))

    expect(data.value).toBeNull()
    expect(error.value).toEqual({ status: 500, message: 'boom' })
  })

  it('clears a previous error when a later run succeeds', async () => {
    const { error, run } = useAsync<string>()

    await run(() => Promise.resolve(fail(500, 'boom')))
    expect(error.value).not.toBeNull()

    await run(() => Promise.resolve(ok('recovered')))
    expect(error.value).toBeNull()
  })

  it('re-invokes the last loader on retry', async () => {
    const { run, retry } = useAsync<string>()
    const loader = vi.fn().mockResolvedValue(ok('value'))

    await run(loader)
    await retry()

    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('does nothing on retry when no loader has run', async () => {
    const { retry, loading, data } = useAsync<string>()

    await retry()

    expect(loading.value).toBe(false)
    expect(data.value).toBeNull()
  })
})
