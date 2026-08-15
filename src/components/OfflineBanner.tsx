import { useEffect, useState } from 'react'
import {
  discardFailedOperations,
  retryFailedOperations,
  subscribeToSync,
  type SyncState,
} from '@/lib/outbox'
import { useT } from '@/i18n'
import './OfflineBanner.css'

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}

export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>({ pending: 0, syncing: false, failed: false })
  useEffect(() => subscribeToSync(setState), [])
  return state
}

export function OfflineBanner() {
  const online = useOnlineStatus()
  const sync = useSyncState()
  const t = useT()
  const [justSynced, setJustSynced] = useState(false)

  // Show a short confirmation when a backlog finishes, then get out of the way.
  useEffect(() => {
    if (sync.syncing && sync.pending > 0) {
      setJustSynced(true)
      return
    }
    if (justSynced && sync.pending === 0 && !sync.syncing) {
      const timer = window.setTimeout(() => setJustSynced(false), 2500)
      return () => window.clearTimeout(timer)
    }
  }, [sync.syncing, sync.pending, justSynced])

  if (!online) {
    return (
      <div className="sync-bar sync-bar--offline" role="status">
        {t.offline.banner}
      </div>
    )
  }

  if (sync.failed) {
    return (
      <div className="sync-bar sync-bar--error" role="alert">
        {t.offline.failed}
        <button type="button" onClick={() => void retryFailedOperations()}>
          {t.offline.retry}
        </button>
        <button type="button" onClick={() => void discardFailedOperations()}>
          {t.offline.discard}
        </button>
      </div>
    )
  }

  if (sync.pending > 0) {
    return (
      <div className="sync-bar" role="status">
        {sync.syncing ? t.offline.syncing : t.offline.pending(sync.pending)}
      </div>
    )
  }

  if (justSynced) {
    return (
      <div className="sync-bar sync-bar--success" role="status">
        {t.offline.synced}
      </div>
    )
  }

  return null
}
