import {
  jsonResponse,
  requireServiceRole,
  sendToSubscriptions,
  serviceClient,
  subscriptionsForFamily,
  type PushPayload,
} from '../_shared/push.ts'

/**
 * Fan-out for family events. Called by database triggers via pg_net, never by a browser.
 *
 * When the family has `notify_generic_lockscreen` on (the default), payloads deliberately
 * omit children's names so nothing personal shows on a locked screen.
 */
type EventBody = {
  event: 'completion_pending' | 'completion_approved' | 'redemption_requested' | 'task_created'
  family_id: string
  child_name?: string
  title?: string
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)
  if (!requireServiceRole(request)) return jsonResponse({ error: 'forbidden' }, 403)

  const body = (await request.json().catch(() => null)) as EventBody | null
  if (!body?.family_id || !body.event) return jsonResponse({ error: 'bad request' }, 400)

  const client = serviceClient()

  const { data: family, error: familyError } = await client
    .from('families')
    .select('notify_generic_lockscreen')
    .eq('id', body.family_id)
    .maybeSingle()
  if (familyError) return jsonResponse({ error: familyError.message }, 500)

  const generic = family?.notify_generic_lockscreen ?? true
  const who = generic ? 'אחד הילדים' : (body.child_name ?? '')
  const what = generic ? '' : (body.title ?? '')

  const payloads: Record<EventBody['event'], PushPayload> = {
    completion_pending: {
      title: 'משימה ממתינה לאישור',
      body: generic ? 'יש משימה חדשה שמחכה לאישור שלכם' : `${who} סיימ/ה: ${what}`,
      url: '/parent',
      tag: 'kidtasks-approval',
    },
    completion_approved: {
      title: 'המשימה אושרה',
      body: generic ? 'משימה אושרה' : `${what} אושרה`,
      url: '/child',
      tag: 'kidtasks-approved',
    },
    redemption_requested: {
      title: 'בקשת פרס',
      body: generic ? 'יש בקשת פרס שמחכה לאישור' : `${who} מבקש/ת: ${what}`,
      url: '/parent',
      tag: 'kidtasks-reward',
    },
    task_created: {
      title: 'משימה חדשה',
      body: generic ? 'נוספה משימה חדשה' : `נוספה המשימה: ${what}`,
      url: '/child',
      tag: 'kidtasks-new-task',
    },
  }

  try {
    const subscriptions = await subscriptionsForFamily(client, body.family_id)
    const result = await sendToSubscriptions(client, subscriptions, payloads[body.event])

    return jsonResponse(result)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'push failed' }, 500)
  }
})
