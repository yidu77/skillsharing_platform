import { useState, useEffect } from 'react'

/**
 * useDebounce — returns a debounced copy of `value` that only updates
 * after `delay` ms of inactivity.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(search, 350)
 */
export default function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
