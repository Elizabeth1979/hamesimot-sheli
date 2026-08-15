import { idbAdd, idbAll, idbClear, idbCount, idbDelete, idbUpdate } from './idb'
import { supabase } from './supabase'

/**
 * Offline write queue.
 *
 * Child-mode writes never go straight to the network: they are appended here and replayed
 * in order once a connection exists. Every operation is written to be idempotent on the
 * server (unique constraints plus ignore-on-conflict), so replaying a batch twice — which
 * happens whenever a flush dies mid-way — cannot create duplicate completions.
 */

export type OutboxOperation =
  | { kind: 'completion.add'; taskId: string; forDate: string; clientId: string }
  | { kind: 'completion.remove'; taskId: string; forDate: string }
  | { kind: 'checklist.add'; itemId: string; forDate: string }
  | { kind: 'checklist.remove'; itemId: string; forDate: string }
  | { kind: 'journal.save'; childId: string; forDate: string; mood: number | null; note: string }

export type OutboxEntry = {
  seq: number
  op: OutboxOperation
  createdAt: number
  attempts: number
  lastError?: string
  /** Requires an explicit retry or discard; never silently removed. */
  deadLetter?: boolean
}

export type SyncState = {
  pending: number
  syncing: boolean
  failed: boolean
}

type Listener = (state: SyncState) => void

const listeners = new Set<Listener>()
let state: SyncState = { pending: 0, syncing: false, failed: false }

function publish(next: Partial<SyncState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener(state)
}

export function subscribeToSync(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export function getSyncState(): SyncState {
  return state
}

async function refreshPendingCount() {
  const entries = await idbAll<OutboxEntry>()
  publish({
    pending: entries.length,
    failed: entries.some((entry) => entry.deadLetter),
  })
}

export async function enqueue(op: OutboxOperation): Promise<void> {
  await idbAdd({ op, createdAt: Date.now(), attempts: 0 })
  await refreshPendingCount()
  void flushOutbox()
}

async function applyOperation(op: OutboxOperation): Promise<void> {
  switch (op.kind) {
    case 'completion.add': {
      // The DB trigger fills in family/child/stars/status from the task definition.
      const { error } = await supabase.from('task_completions').upsert(
        { task_id: op.taskId, for_date: op.forDate, client_id: op.clientId },
        { onConflict: 'task_id,for_date', ignoreDuplicates: true },
      )
      if (error) throw error
      return
    }
    case 'completion.remove': {
      const { error } = await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', op.taskId)
        .eq('for_date', op.forDate)
      if (error) throw error
      return
    }
    case 'checklist.add': {
      const { error } = await supabase
        .from('checklist_item_completions')
        .upsert(
          { item_id: op.itemId, for_date: op.forDate },
          { onConflict: 'item_id,for_date', ignoreDuplicates: true },
        )
      if (error) throw error
      return
    }
    case 'checklist.remove': {
      const { error } = await supabase
        .from('checklist_item_completions')
        .delete()
        .eq('item_id', op.itemId)
        .eq('for_date', op.forDate)
      if (error) throw error
      return
    }
    case 'journal.save': {
      const { error } = await supabase.from('journal_entries').upsert(
        { child_id: op.childId, for_date: op.forDate, mood: op.mood, note: op.note },
        { onConflict: 'child_id,for_date' },
      )
      if (error) throw error
      return
    }
  }
}

/** Network blips deserve a retry; a rejected row never will and must not block the queue. */
function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  if (/failed to fetch|network|timeout|fetch failed/i.test(message)) return true
  const code = (error as { code?: string } | null)?.code
  // Postgres constraint/permission errors are permanent; missing code means transport failure.
  if (!code) return true
  return code.startsWith('08') || code === '57014'
}

const MAX_ATTEMPTS = 8
let inFlight: Promise<void> | null = null

/**
 * Drains the queue. Concurrent callers share the one in-flight run rather than
 * returning early, so `await flushOutbox()` always means "syncing has settled".
 */
export function flushOutbox(): Promise<void> {
  if (inFlight) return inFlight
  if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve()

  inFlight = runFlush().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function runFlush(): Promise<void> {
  publish({ syncing: true })
  let sawFailure = false

  try {
    // Strict insertion order: a "remove" queued after an "add" must not overtake it.
    for (;;) {
      const entries = await idbAll<OutboxEntry>()
      const entry = entries[0]
      if (!entry) break
      // A permanent failure preserves strict operation order until the user decides
      // whether to retry it or discard it.
      if (entry.deadLetter) {
        sawFailure = true
        break
      }

      try {
        await applyOperation(entry.op)
        await idbDelete(entry.seq)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const attempts = entry.attempts + 1

        if (!isRetryable(error) || attempts >= MAX_ATTEMPTS) {
          await idbUpdate<OutboxEntry>(entry.seq, {
            attempts,
            lastError: message,
            deadLetter: true,
          })
          sawFailure = true
          break
        }

        await idbUpdate<OutboxEntry>(entry.seq, { attempts, lastError: message })
        sawFailure = true
        break
      }
    }
  } finally {
    const pending = await idbCount()
    publish({ syncing: false, pending, failed: sawFailure })
  }
}

export async function clearFailedFlag(): Promise<void> {
  await refreshPendingCount()
}

export async function retryFailedOperations(): Promise<void> {
  const entries = await idbAll<OutboxEntry>()
  for (const entry of entries) {
    if (entry.deadLetter) {
      await idbUpdate<OutboxEntry>(entry.seq, {
        attempts: 0,
        lastError: undefined,
        deadLetter: false,
      })
    }
  }
  await refreshPendingCount()
  await flushOutbox()
}

export async function discardFailedOperations(): Promise<void> {
  const entries = await idbAll<OutboxEntry>()
  for (const entry of entries) {
    if (entry.deadLetter) await idbDelete(entry.seq)
  }
  await refreshPendingCount()
  await flushOutbox()
}

export async function pendingOperations(): Promise<OutboxEntry[]> {
  return idbAll<OutboxEntry>()
}

/**
 * Wipes the queue. Called on sign-out as well as between tests: the queue is keyed to
 * the browser, not the account, so operations left behind by one parent would otherwise
 * be replayed under whoever signs in next. RLS rejects them, but the first parent then
 * loses those completions silently and the second sees a sync failure that is not theirs.
 */
export async function resetOutbox(): Promise<void> {
  await idbClear()
  state = { pending: 0, syncing: false, failed: false }
}

let started = false

export function startOutboxWorker(): () => void {
  if (started) return () => {}
  started = true

  const onOnline = () => void flushOutbox()
  const onVisible = () => {
    if (document.visibilityState === 'visible') void flushOutbox()
  }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  const interval = window.setInterval(() => void flushOutbox(), 30_000)

  void refreshPendingCount().then(() => flushOutbox())

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(interval)
    started = false
  }
}
