import type { ApiResult } from '../types/api.type'
import type { CreateRocketDto, Rocket, UpdateRocketDto } from '../types/rocket.type'
import { request } from './api-client'

/** JSON headers for write operations. */
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** `GET /api/rockets` — list the whole fleet. */
export function listRockets(): Promise<ApiResult<Rocket[]>> {
  return request<Rocket[]>('/rockets')
}

/** `POST /api/rockets` — create a rocket, returns the created entity. */
export function createRocket(dto: CreateRocketDto): Promise<ApiResult<Rocket>> {
  return request<Rocket>('/rockets', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(dto),
  })
}

/** `PUT /api/rockets/:id` — update a rocket, returns the updated entity. */
export function updateRocket(
  id: string,
  dto: UpdateRocketDto,
): Promise<ApiResult<Rocket>> {
  return request<Rocket>(`/rockets/${id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(dto),
  })
}

/** `DELETE /api/rockets/:id` — remove a rocket (204 No Content on success). */
export function deleteRocket(id: string): Promise<ApiResult<void>> {
  return request<void>(`/rockets/${id}`, { method: 'DELETE' })
}
