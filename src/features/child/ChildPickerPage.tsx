import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useChildren } from '@/lib/queries'
import { useAuth } from '@/app/AuthProvider'
import { useMode } from '@/app/ModeProvider'
import { useT } from '@/i18n'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { Avatar } from '@/components/AvatarPicker'
import './child.css'

export function ChildPickerPage() {
  const t = useT()
  const navigate = useNavigate()
  const { selectChild } = useMode()
  const { session, profile, signOut } = useAuth()
  const { data: children, isPending } = useChildren()

  function open(childId: string) {
    selectChild(childId)
    void navigate(`/child/${childId}`)
  }

  if (profile?.account_type === 'child' && profile.child_id) {
    return <Navigate to={`/child/${profile.child_id}`} replace />
  }

  return (
    <main className="picker-screen" id="main">
      <h1>{t.childPicker.title}</h1>
      <p className="muted">{t.childPicker.subtitle}</p>

      {isPending ? (
        <Spinner label={t.common.loading} />
      ) : children && children.length > 0 ? (
        <ul className="picker-grid">
          {children.map((child) => (
            <li key={child.id}>
              <button type="button" className="picker-card" onClick={() => open(child.id)}>
                <Avatar emoji={child.avatar_emoji} color={child.avatar_color} size="lg" />
                <span className="picker-card__name">{child.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="👶"
          title={t.childPicker.noChildren}
          action={
            <Link to="/parent/children">
              <Button variant="secondary">{t.childPicker.addFirstChild}</Button>
            </Link>
          }
        />
      )}

      <Link to="/parent" className="picker-parent-link">
        {t.childPicker.parentButton}
      </Link>

      {/*
        Sign-out lives here rather than only in parent settings: that screen sits behind
        the PIN, and a gate meant to keep children out should never be the only way for
        an adult to leave their own account. Showing the address also makes it obvious
        which parent a shared device is signed in as.
      */}
      <footer className="picker-account">
        <span>
          {t.auth.signedInAs} <bdi>{session?.user.email}</bdi>
        </span>
        <button type="button" className="picker-account__signout" onClick={() => void signOut()}>
          {t.auth.logout}
        </button>
      </footer>
    </main>
  )
}
