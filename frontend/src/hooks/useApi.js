import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useApi — lightweight hook for calling an async API function.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(skillsAPI.getMyTeaching)
 *
 *   // With params (pass a factory function):
 *   const { data } = useApi(() => usersAPI.getById(id), [id])
 *
 * Options:
 *   immediate  — run on mount (default true)
 *   initialData — value used before the first successful fetch (default null)
 */
export default function useApi(apiFn, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  // Track whether the component is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFn(...args)
      if (mountedRef.current) setData(res.data)
      return res.data
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Something went wrong.'
      if (mountedRef.current) setError(message)
      throw err
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute()
  }, [execute]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: execute }
}
