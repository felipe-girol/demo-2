import { ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import type { ApiError, ApiResult } from '../types/api.type'

/** A loader returning the shared `ApiResult` contract. */
type Loader<T> = () => Promise<ApiResult<T>>

export type UseAsync<T> = {
  data: Ref<T | null>
  error: Ref<ApiError | null>
  loading: Ref<boolean>
  /** Run a loader, tracking loading/data/error and remembering it for retry. */
  run: (loader: Loader<T>) => Promise<void>
  /** Re-run the most recent loader (e.g. from an error-state retry button). */
  retry: () => Promise<void>
}

/**
 * Drives the shared loading / error / empty state primitives uniformly for any
 * `ApiResult`-returning loader, so feature screens stay declarative.
 */
export function useAsync<T>(): UseAsync<T> {
  const data = ref(null) as Ref<T | null>
  const error = ref<ApiError | null>(null)
  const loading = ref(false)
  const lastLoader = shallowRef<Loader<T> | null>(null)

  async function run(loader: Loader<T>): Promise<void> {
    lastLoader.value = loader
    loading.value = true
    error.value = null

    const result = await loader()
    if (result.ok) {
      data.value = result.data
    } else {
      error.value = result.error
    }
    loading.value = false
  }

  async function retry(): Promise<void> {
    if (lastLoader.value) {
      await run(lastLoader.value)
    }
  }

  return { data, error, loading, run, retry }
}
