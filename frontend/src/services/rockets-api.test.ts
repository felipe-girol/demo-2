import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createRocket,
  deleteRocket,
  listRockets,
  updateRocket,
} from './rockets-api'
import type { CreateRocketDto, Rocket } from '../types/rocket.type'

const sampleRocket: Rocket = {
  id: 'r1',
  name: 'Falcon',
  range: 'orbital',
  capacity: 5,
}

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('rockets-api', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('listRockets issues GET /api/rockets', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([sampleRocket]),
    })

    const result = await listRockets()

    expect(fetchMock).toHaveBeenCalledWith('/api/rockets', expect.any(Object))
    expect(result).toEqual({ ok: true, data: [sampleRocket] })
  })

  it('createRocket POSTs the dto as JSON', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve(sampleRocket),
    })
    const dto: CreateRocketDto = { name: 'Falcon', range: 'orbital', capacity: 5 }

    const result = await createRocket(dto)

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/rockets')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify(dto))
    expect(result).toEqual({ ok: true, data: sampleRocket })
  })

  it('updateRocket PUTs to /api/rockets/:id', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...sampleRocket, capacity: 7 }),
    })

    const result = await updateRocket('r1', { capacity: 7 })

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/rockets/r1')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ capacity: 7 }))
    expect(result.ok).toBe(true)
  })

  it('deleteRocket DELETEs /api/rockets/:id and resolves void on 204', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    })

    const result = await deleteRocket('r1')

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/rockets/r1')
    expect(init.method).toBe('DELETE')
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('surfaces a validation error body from create', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ errors: ['name is required'] }),
    })

    const result = await createRocket({ name: '', range: 'orbital', capacity: 5 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(400)
      expect(result.error.message).toBe('name is required')
    }
  })
})
