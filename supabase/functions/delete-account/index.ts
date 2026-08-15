import { serviceClient } from '../_shared/push.ts'
import {
  authenticatedUser,
  browserJsonResponse as respond,
  preflightResponse,
} from '../_shared/browser.ts'

type DeletionJob = {
  caller_id: string
  family_id: string | null
  remaining_user_ids: string[]
  database_deleted: boolean
}

function userAlreadyGone(error: { message?: string; status?: number } | null): boolean {
  return Boolean(error && (error.status === 404 || /not found/i.test(error.message ?? '')))
}

/** Resumable deletion of a family and every Auth identity attached to it. */
Deno.serve(async (request: Request) => {
  const preflight = preflightResponse(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405)

  const user = await authenticatedUser(request)
  if (!user) return respond({ error: 'unauthorized' }, 401)

  const admin = serviceClient()
  const { data: existingJob, error: jobLookupError } = await admin
    .from('account_deletion_jobs')
    .select('caller_id, family_id, remaining_user_ids, database_deleted')
    .eq('caller_id', user.id)
    .maybeSingle()
  if (jobLookupError) return respond({ error: 'lookup_failed' }, 500)

  let job = existingJob as DeletionJob | null

  if (!job) {
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('family_id, account_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) return respond({ error: 'lookup_failed' }, 500)

    // A signup that never reached onboarding has no family data to coordinate.
    if (!profile) {
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error && !userAlreadyGone(error)) return respond({ error: 'account_delete_failed' }, 500)
      return respond({ deleted: 'user' })
    }
    if (profile.account_type !== 'parent') {
      return respond({ error: 'parent_account_required' }, 403)
    }

    const { data: members, error: membersError } = await admin
      .from('profiles')
      .select('id')
      .eq('family_id', profile.family_id)
    if (membersError) return respond({ error: 'lookup_failed' }, 500)

    const { data: createdJob, error: createJobError } = await admin
      .from('account_deletion_jobs')
      .insert({
        caller_id: user.id,
        family_id: profile.family_id,
        remaining_user_ids: (members ?? []).map((member) => member.id),
      })
      .select('caller_id, family_id, remaining_user_ids, database_deleted')
      .single()
    if (createJobError) return respond({ error: 'delete_prepare_failed' }, 500)
    job = createdJob as DeletionJob
  }

  let remaining = [...job.remaining_user_ids]

  // Other identities go first. The caller remains authenticated and can safely retry.
  for (const memberId of remaining.filter((id) => id !== user.id)) {
    const { error } = await admin.auth.admin.deleteUser(memberId)
    if (error && !userAlreadyGone(error)) {
      return respond({ error: 'account_delete_failed' }, 500)
    }

    remaining = remaining.filter((id) => id !== memberId)
    const { error: progressError } = await admin
      .from('account_deletion_jobs')
      .update({ remaining_user_ids: remaining, updated_at: new Date().toISOString() })
      .eq('caller_id', user.id)
    if (progressError) return respond({ error: 'delete_progress_failed' }, 500)
  }

  if (!job.database_deleted && job.family_id) {
    const { error } = await admin.from('families').delete().eq('id', job.family_id)
    if (error) return respond({ error: 'database_delete_failed' }, 500)

    const { error: progressError } = await admin
      .from('account_deletion_jobs')
      .update({
        database_deleted: true,
        remaining_user_ids: [user.id],
        updated_at: new Date().toISOString(),
      })
      .eq('caller_id', user.id)
    if (progressError) return respond({ error: 'delete_progress_failed' }, 500)
    remaining = [user.id]
  }

  if (remaining.includes(user.id)) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error && !userAlreadyGone(error)) return respond({ error: 'account_delete_failed' }, 500)
  }

  // The service-role request remains valid after caller deletion, so cleanup can finish.
  const { error: cleanupError } = await admin
    .from('account_deletion_jobs')
    .delete()
    .eq('caller_id', user.id)
  if (cleanupError) console.error('account deletion job cleanup failed', user.id)

  return respond({ deleted: 'family' })
})
