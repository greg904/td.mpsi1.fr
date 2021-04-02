import { useState, useEffect, StateUpdater } from 'preact/hooks'

export default function useStickyState (key: string): [string | null, StateUpdater<string | null>] {
  const [value, setValue] = useState(() => {
    return localStorage.getItem(key)
  })
  useEffect(() => {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  }, [key, value])
  return [value, setValue]
}
