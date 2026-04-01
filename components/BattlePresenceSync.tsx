'use client'

import * as React from 'react'
import { BATTLE_HEARTBEAT_INTERVAL_MS } from '@/lib/battle/constants'

export function BattlePresenceSync() {
  React.useEffect(() => {
    const heartbeat = () => {
      fetch('/api/battle/presence', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => undefined)
    }

    heartbeat()
    const intervalId = window.setInterval(heartbeat, BATTLE_HEARTBEAT_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return null
}
