import { serviceClient } from '../_shared/push.ts'
import {
  authenticatedUser,
  browserJsonResponse as respond,
  preflightResponse,
} from '../_shared/browser.ts'

type RequestBody = {
  child_id?: string
  email?: string
  password?: string
}

Deno.serve(async (request: Request) => {
  const preflight = preflightResponse(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405)

  const user = await authenticatedUser(request)
  if (!user) return respond({ error: 'unauthorized' }, 401)

  const body = (await request.json().catch(() => null)) as RequestBody | null
  const childId = body?.child_id?.trim()
  const email = body?.email?.trim().toLowerCase() ?? ''
  const password = body?.password ?? ''
  if (!childId) return respond({ error: 'invalid_request' }, 400)

  const admin = serviceClient()
  const { data: parent, error: parentError } = await admin
    .from('profiles')
    .select('family_id, account_type')
    .eq('id', user.id)
    .maybeSingle()
  if (parentError) return respond({ error: 'lookup_failed' }, 500)
  if (!parent || parent.account_type !== 'parent') return respond({ error: 'parent_required' }, 403)

  const { data: child, error: childError } = await admin
    .from('children')
    .select('id, family_id, name, login_email')
    .eq('id', childId)
    .eq('family_id', parent.family_id)
    .maybeSingle()
  if (childError) return respond({ error: 'lookup_failed' }, 500)
  if (!child) return respond({ error: 'child_not_found' }, 404)

  const { data: childProfile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('child_id', childId)
    .maybeSingle()
  if (profileError) return respond({ error: 'lookup_failed' }, 500)

  // Clearing the optional email revokes the child's independent account.
  if (!email) {
    const { error: clearError } = await admin
      .from('children')
      .update({ login_email: null })
      .eq('id', childId)
      .eq('family_id', parent.family_id)
    if (clearError) return respond({ error: 'account_update_failed' }, 500)

    if (childProfile) {
      const { error } = await admin.auth.admin.deleteUser(childProfile.id)
      if (error) {
        const { error: rollbackError } = await admin
          .from('children')
          .update({ login_email: child.login_email })
          .eq('id', childId)
          .eq('family_id', parent.family_id)
        if (rollbackError) console.error('child login removal rollback failed', childId)
        return respond({ error: 'account_delete_failed' }, 500)
      }
    }
    return respond({ email: null })
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) return respond({ error: 'invalid_email' }, 400)
  if (!childProfile && password.length < 8) return respond({ error: 'weak_password' }, 400)
  if (password && password.length < 8) return respond({ error: 'weak_password' }, 400)

  if (childProfile) {
    // Reserve the email in the database first. If Auth rejects the update, compensate
    // back to the prior value so the two systems never report a successful divergence.
    const { error: reserveError } = await admin
      .from('children')
      .update({ login_email: email })
      .eq('id', childId)
      .eq('family_id', parent.family_id)
    if (reserveError) {
      const duplicate = /unique/i.test(reserveError.message)
      return respond({ error: duplicate ? 'email_in_use' : 'account_update_failed' }, duplicate ? 409 : 500)
    }

    const attributes: { email: string; email_confirm: boolean; password?: string } = {
      email,
      email_confirm: true,
    }
    if (password) attributes.password = password
    const { error: authError } = await admin.auth.admin.updateUserById(childProfile.id, attributes)
    if (authError) {
      const { error: rollbackError } = await admin
        .from('children')
        .update({ login_email: child.login_email })
        .eq('id', childId)
        .eq('family_id', parent.family_id)
      if (rollbackError) console.error('child login update rollback failed', childId)
      const duplicate = /already|registered|exists/i.test(authError.message)
      return respond({ error: duplicate ? 'email_in_use' : 'account_update_failed' }, duplicate ? 409 : 500)
    }
    return respond({ email })
  }

  const { count: childAccountCount, error: countError } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', parent.family_id)
    .eq('account_type', 'child')
  if (countError) return respond({ error: 'lookup_failed' }, 500)
  if ((childAccountCount ?? 0) >= 20) return respond({ error: 'account_limit_reached' }, 409)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: child.name },
  })
  if (createError || !created.user) {
    const duplicate = /already|registered|exists/i.test(createError?.message ?? '')
    return respond({ error: duplicate ? 'email_in_use' : 'account_create_failed' }, duplicate ? 409 : 500)
  }

  const { error: linkError } = await admin.from('profiles').insert({
    id: created.user.id,
    family_id: child.family_id,
    display_name: child.name,
    role: 'parent',
    account_type: 'child',
    child_id: child.id,
  })
  if (linkError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(created.user.id)
    if (cleanupError) console.error('child login creation cleanup failed', created.user.id)
    return respond({ error: 'account_create_failed' }, 500)
  }

  const { error: emailError } = await admin
    .from('children')
    .update({ login_email: email })
    .eq('id', child.id)
  if (emailError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(created.user.id)
    if (cleanupError) console.error('child login creation cleanup failed', created.user.id)
    return respond({ error: /unique/i.test(emailError.message) ? 'email_in_use' : 'account_create_failed' }, 500)
  }

  return respond({ email }, 201)
})
