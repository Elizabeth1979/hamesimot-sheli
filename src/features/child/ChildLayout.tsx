import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom'
import { useChildren } from '@/lib/queries'
import { useT } from '@/i18n'
import { useAuth } from '@/app/AuthProvider'
import { Spinner } from '@/components/ui'

export function ChildLayout() {
  const t = useT()
  const { profile, signOut } = useAuth()
  const { childId } = useParams()
  const { data: children, isPending } = useChildren()

  if (isPending) {
    return (
      <div className="center-screen">
        <Spinner label={t.common.loading} />
      </div>
    )
  }

  const child = children?.find((entry) => entry.id === childId)
  if (!child) return <Navigate to="/child" replace />

  return (
    <div className="screen">
      <Outlet context={child} />
      <nav className="tabbar" aria-label={t.nav.myDay}>
        <NavLink
          end
          to={`/child/${child.id}`}
          className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}
        >
          <span className="tabbar__icon" aria-hidden="true">
            ☀️
          </span>
          {t.nav.myDay}
        </NavLink>
        <NavLink
          to={`/child/${child.id}/rewards`}
          className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}
        >
          <span className="tabbar__icon" aria-hidden="true">
            🎁
          </span>
          {t.nav.rewards}
        </NavLink>
        <NavLink
          to={`/child/${child.id}/journal`}
          className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}
        >
          <span className="tabbar__icon" aria-hidden="true">
            📔
          </span>
          {t.nav.journal}
        </NavLink>
        {profile?.account_type === 'child' ? (
          <button type="button" className="tabbar__item" onClick={() => void signOut()}>
            <span className="tabbar__icon" aria-hidden="true">
              ↩️
            </span>
            {t.auth.logout}
          </button>
        ) : (
          <NavLink to="/child" className="tabbar__item">
            <span className="tabbar__icon" aria-hidden="true">
              🔄
            </span>
            {t.nav.switchChild}
          </NavLink>
        )}
      </nav>
    </div>
  )
}
