import { beforeEach, describe, expect, it, vi } from 'vitest'

// The queue talks to Supabase; the tests care about ordering, idempotency and
// failure handling, so the client is replaced with a recording fake.
const calls: { table: string; op: string; payload?: unknown }[] = []
let failNext: { times: number; error: unknown } = { times: 0, error: null }

function maybeFail() {
  if (failNext.times > 0) {
    failNext.times -= 1
    return { error: failNext.error }
  }
  return { error: null }
}

vi.mock('./supabase', () => {
  const builder = (table: string) => ({
    upsert: (payload: unknown) => {
      const result = maybeFail()
      if (!result.error) calls.push({ table, op: 'upsert', payload })
      return Promise.resolve(result)
    },
    delete: () => {
      const chain = {
        eq: () => chain,
        then: (resolve: (value: { error: unknown }) => void) => {
          const result = maybeFail()
          if (!result.error) calls.push({ table, op: 'delete' })
          return Promise.resolve(result).then(resolve)
        },
      }
      return chain
    },
  })
  return { supabase: { from: (table: string) => builder(table) } }
})

const { enqueue, flushOutbox, pendingOperations, resetOutbox, getSyncState } = await import('./outbox')

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })
}

/** Queue work the way a child does while offline: nothing reaches the network yet. */
async function queueOffline(...ops: Parameters<typeof enqueue>[0][]) {
  setOnline(false)
  for (const op of ops) await enqueue(op)
  setOnline(true)
}

describe('offline outbox', () => {
  beforeEach(async () => {
    calls.length = 0
    failNext = { times: 0, error: null }
    setOnline(true)
    await resetOutbox()
  })

  it('replays queued operations in the order they were made', async () => {
    await queueOffline(
      { kind: 'completion.add', taskId: 't1', forDate: '2026-08-01', clientId: 'c1' },
      { kind: 'completion.remove', taskId: 't1', forDate: '2026-08-01' },
      { kind: 'completion.add', taskId: 't1', forDate: '2026-08-01', clientId: 'c2' },
    )
    await flushOutbox()

    expect(calls.map((call) => call.op)).toEqual(['upsert', 'delete', 'upsert'])
    expect(await pendingOperations()).toHaveLength(0)
  })

  it('drains the queue exactly once even if flush is called concurrently', async () => {
    await queueOffline({ kind: 'completion.add', taskId: 't1', forDate: '2026-08-01', clientId: 'c1' })
    await Promise.all([flushOutbox(), flushOutbox(), flushOutbox()])

    expect(calls.filter((call) => call.op === 'upsert')).toHaveLength(1)
    expect(getSyncState().pending).toBe(0)
  })

  it('sends completions with only the client-owned fields, letting the DB derive the rest', async () => {
    await queueOffline({ kind: 'completion.add', taskId: 't9', forDate: '2026-08-01', clientId: 'abc' })
    await flushOutbox()

    expect(calls[0].payload).toEqual({ task_id: 't9', for_date: '2026-08-01', client_id: 'abc' })
  })

  it('keeps an operation queued when the network fails, and retries later', async () => {
    await queueOffline({ kind: 'checklist.add', itemId: 'i1', forDate: '2026-08-01' })
    failNext = { times: 1, error: new Error('Failed to fetch') }
    await flushOutbox()

    expect(await pendingOperations()).toHaveLength(1)
    expect(calls).toHaveLength(0)

    await flushOutbox()
    expect(await pendingOperations()).toHaveLength(0)
    expect(calls).toHaveLength(1)
  })

  it('preserves a permanently rejected operation until the user retries it', async () => {
    await queueOffline(
      { kind: 'journal.save', childId: 'c1', forDate: '2026-08-01', mood: 9, note: '' },
      { kind: 'completion.add', taskId: 't2', forDate: '2026-08-01', clientId: 'c3' },
    )
    failNext = { times: 1, error: Object.assign(new Error('violates check constraint'), { code: '23514' }) }
    await flushOutbox()

    const queued = await pendingOperations()
    expect(queued).toHaveLength(2)
    expect(queued[0].deadLetter).toBe(true)
    expect(calls).toHaveLength(0)
    expect(getSyncState().failed).toBe(true)

    const { retryFailedOperations } = await import('./outbox')
    await retryFailedOperations()
    expect(await pendingOperations()).toHaveLength(0)
    expect(calls.map((call) => call.table)).toEqual(['journal_entries', 'task_completions'])
  })
})
