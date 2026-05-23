import { useState, useEffect, useRef } from 'react'

export function useTimerState() {
  const [state, setState] = useState(null)
  const cleanupRef = useRef(null)

  useEffect(() => {
    // Load initial state
    if (window.api) {
      window.api.getState().then(setState)
      cleanupRef.current = window.api.onState(setState)
    }
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  return state
}
