import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, describeError } from '@/lib/supabase'
import { useAuth } from '@/app/AuthProvider'
import { useT } from '@/i18n'
import { Banner, Button, Field, PasswordInput, TextInput } from '@/components/ui'
import { AuthShell } from './AuthShell'

export function LoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  // Set by links that need auth first, e.g. a co-parent opening an invite.
  const next = searchParams.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  useEffect(() => {
    if (session) void navigate(destination, { replace: true })
  }, [destination, navigate, session])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)

    if (signInError) {
      const code = describeError(signInError)
      setError(code === 'invalid_credentials' ? t.auth.invalidCredentials : t.errors.generic)
      return
    }
    void navigate(destination, { replace: true })
  }

  async function sendMagicLink() {
    setBusy(true)
    setError('')
    setMagicLinkSent(false)

    const redirectUrl = new URL('/login', window.location.origin)
    if (destination !== '/') redirectUrl.searchParams.set('next', destination)

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectUrl.toString(),
      },
    })
    setBusy(false)

    if (magicLinkError) {
      setError(t.errors.generic)
      return
    }
    setMagicLinkSent(true)
  }

  return (
    <AuthShell
      title={t.auth.loginTitle}
      footer={
        <Link to={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>
          {t.auth.noAccount}
        </Link>
      }
    >
      {magicLinkSent && <Banner tone="success">{t.auth.magicLinkSent}</Banner>}
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <Field label={t.auth.email} htmlFor="email">
          <TextInput
            id="email"
            type="email"
            className="input--ltr"
            dir="ltr"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={t.auth.password} htmlFor="password" error={error}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Button type="submit" fullWidth size="lg" disabled={busy}>
          {busy ? t.common.loading : t.auth.login}
        </Button>
      </form>
      <div className="auth__divider"><span>{t.auth.or}</span></div>
      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={busy || !email.trim()}
        onClick={() => void sendMagicLink()}
      >
        {busy ? t.common.loading : t.auth.sendMagicLink}
      </Button>
      <p className="auth__hint muted">
        {email.trim() ? t.auth.magicLinkHint : t.auth.magicLinkEnterEmail}
      </p>
    </AuthShell>
  )
}
