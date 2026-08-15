import {
  jsonResponse,
  requireServiceRole,
  sendToSubscriptions,
  serviceClient,
} from '../_shared/push.ts'

/**
 * Daily slot reminders, invoked by pg_cron every five minutes.
 *
 * Each family stores its own reminder times and time zone, so "07:30" means 07:30 where
 * the family lives. A family is reminded when the current local time falls inside the
 * five-minute window that starts at one of its configured times, and only if that slot
 * actually has unfinished tasks today.
 */
type ReminderTimes = { morning?: string; afternoon?: string; evening?: string }

const SLOT_LABELS: Record<string, string> = {
  morning: 'משימות הבוקר',
  afternoon: 'משימות הצהריים',
  evening: 'משימות הערב',
}

const WINDOW_MINUTES = 5

function localParts(timezone: string, now: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  })

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  )
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: weekdays.indexOf(parts.weekday ?? 'Sun'),
  }
}

function parseMinutes(value: string | undefined): number | null {
  if (!value) return null
  const [hour, minute] = value.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)
  if (!requireServiceRole(request)) return jsonResponse({ error: 'forbidden' }, 403)

  const client = serviceClient()
  const now = new Date()

  const { data: families, error } = await client
    .from('families')
    .select('id, timezone, reminder_times, reminders_enabled')
    .eq('reminders_enabled', true)

  if (error) return jsonResponse({ error: error.message }, 500)

  const dueFamilies: Array<{
    id: string
    slot: 'morning' | 'afternoon' | 'evening'
    dateKey: string
    weekday: number
  }> = []

  for (const family of families ?? []) {
    let local
    try {
      local = localParts(family.timezone || 'Asia/Jerusalem', now)
    } catch {
      local = localParts('Asia/Jerusalem', now)
    }

    const times = (family.reminder_times ?? {}) as ReminderTimes
    const dueSlot = (['morning', 'afternoon', 'evening'] as const).find((slot) => {
      const target = parseMinutes(times[slot])
      if (target === null) return false
      const delta = local.minutes - target
      return delta >= 0 && delta < WINDOW_MINUTES
    })

    if (dueSlot) {
      dueFamilies.push({
        id: family.id,
        slot: dueSlot,
        dateKey: local.dateKey,
        weekday: local.weekday,
      })
    }
  }

  if (dueFamilies.length === 0) return jsonResponse({ notified: 0 })

  const familyIds = dueFamilies.map((family) => family.id)
  const dateKeys = [...new Set(dueFamilies.map((family) => family.dateKey))]
  const [taskResult, completionResult, subscriptionResult] = await Promise.all([
    client
      .from('tasks')
      .select('id, family_id, time_slot, days_of_week')
      .in('family_id', familyIds)
      .eq('is_active', true),
    client
      .from('task_completions')
      .select('family_id, task_id, for_date')
      .in('family_id', familyIds)
      .in('for_date', dateKeys),
    client
      .from('push_subscriptions')
      .select('id, family_id, endpoint, p256dh, auth')
      .in('family_id', familyIds),
  ])

  const batchError = taskResult.error ?? completionResult.error ?? subscriptionResult.error
  if (batchError) return jsonResponse({ error: batchError.message }, 500)

  let notified = 0
  let failedFamilies = 0

  for (const family of dueFamilies) {
    const dueToday = (taskResult.data ?? []).filter(
      (task) =>
        task.family_id === family.id &&
        task.time_slot === family.slot &&
        (task.days_of_week as number[]).includes(family.weekday),
    )
    if (dueToday.length === 0) continue

    const doneIds = new Set(
      (completionResult.data ?? [])
        .filter((row) => row.family_id === family.id && row.for_date === family.dateKey)
        .map((row) => row.task_id),
    )
    const remaining = dueToday.filter((task) => !doneIds.has(task.id)).length
    if (remaining === 0) continue

    const subscriptions = (subscriptionResult.data ?? []).filter(
      (subscription) => subscription.family_id === family.id,
    )
    try {
      const result = await sendToSubscriptions(client, subscriptions, {
        title: SLOT_LABELS[family.slot],
        body: `נשארו ${remaining} משימות`,
        url: '/child',
        tag: `kidtasks-reminder-${family.slot}`,
      })
      notified += result.sent
    } catch {
      failedFamilies += 1
    }
  }

  return jsonResponse({ notified, failedFamilies })
})
