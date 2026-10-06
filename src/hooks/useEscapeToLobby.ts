import { useNavigate } from '@tanstack/react-router'
import { useEffect, useEffectEvent } from 'react'

/** Esc leaves the play view. Global key listener = external system, so an Effect is right. */
export function useEscapeToLobby() {
  const navigate = useNavigate()
  const leave = useEffectEvent(() => void navigate({ to: '/' }))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
