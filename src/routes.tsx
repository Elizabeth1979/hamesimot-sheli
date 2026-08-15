import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { useAuth } from './app/AuthProvider'
import { Spinner } from './components/ui'
import { useT } from './i18n'

/*
 * Child mode and the sign-in screens load up front: a child opening the app should not
 * wait on a second download to see their day. Everything a parent uses — the dashboard,
 * the editors, settings — and the static legal pages are split into their own chunks and
 * fetched on the way in, so a phone left in child mode never downloads them at all.
 */
import { LoginPage } from './features/auth/LoginPage'
import { SignupPage } from './features/auth/SignupPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { OnboardingPage } from './features/family/OnboardingPage'
import { JoinPage } from './features/invites/JoinPage'

import { ChildPickerPage } from './features/child/ChildPickerPage'
import { ChildLayout } from './features/child/ChildLayout'
import { MyDayPage } from './features/child/MyDayPage'
import { TaskDetailPage } from './features/child/TaskDetailPage'
import { RoutinePlayPage } from './features/child/RoutinePlayPage'
import { ChildRewardsPage } from './features/child/ChildRewardsPage'
import { ChildJournalPage } from './features/child/ChildJournalPage'

const ParentLayout = lazy(() => import('./features/parent/ParentLayout'))
const DashboardPage = lazy(() => import('./features/parent/DashboardPage'))
const ChildrenPage = lazy(() => import('./features/parent/ChildrenPage'))
const TasksPage = lazy(() => import('./features/parent/TasksPage'))
const TaskFormPage = lazy(() => import('./features/parent/TaskFormPage'))
const RoutinesPage = lazy(() => import('./features/parent/RoutinesPage'))
const RewardsPage = lazy(() => import('./features/parent/RewardsPage'))
const ParentJournalPage = lazy(() => import('./features/parent/ParentJournalPage'))
const ProgressPage = lazy(() => import('./features/parent/ProgressPage'))
const InvitesPage = lazy(() => import('./features/parent/InvitesPage'))
const SettingsPage = lazy(() => import('./features/parent/SettingsPage'))

const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const DeleteAccountRequestPage = lazy(() => import('./pages/DeleteAccountRequestPage'))
const InstallPage = lazy(() => import('./pages/InstallPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function FullScreenLoader() {
  const t = useT()
  return (
    <div className="center-screen">
      <Spinner label={t.common.loading} />
    </div>
  )
}

/** Signed in, and the account already belongs to a family. */
function RequireFamily({ children }: { children: ReactNode }) {
  const { session, loading, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || (session && profileLoading)) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

/** Parent screens are never reachable from an independently signed-in child account. */
function RequireParent({ children }: { children: ReactNode }) {
  const { session, loading, profile, profileLoading } = useAuth()

  if (loading || (session && profileLoading)) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/onboarding" replace />
  if (profile.account_type === 'child' && profile.child_id) {
    return <Navigate to={`/child/${profile.child_id}`} replace />
  }
  return <>{children}</>
}

function RedirectHome() {
  const { session, loading, profile, profileLoading } = useAuth()

  if (loading || (session && profileLoading)) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/onboarding" replace />
  if (profile.account_type === 'child' && profile.child_id) {
    return <Navigate to={`/child/${profile.child_id}`} replace />
  }
  return <Navigate to="/child" replace />
}

export function AppRoutes() {
  return (
    // Covers the split-out chunks while they download; eager routes never suspend.
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<RedirectHome />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/join/:code" element={<JoinPage />} />

        <Route
          path="/child"
          element={
            <RequireFamily>
              <ChildPickerPage />
            </RequireFamily>
          }
        />
        <Route
          path="/child/:childId"
          element={
            <RequireFamily>
              <ChildLayout />
            </RequireFamily>
          }
        >
          <Route index element={<MyDayPage />} />
          <Route path="rewards" element={<ChildRewardsPage />} />
          <Route path="journal" element={<ChildJournalPage />} />
        </Route>
        <Route
          path="/child/:childId/task/:taskId"
          element={
            <RequireFamily>
              <TaskDetailPage />
            </RequireFamily>
          }
        />
        <Route
          path="/child/:childId/routine/:routineId"
          element={
            <RequireFamily>
              <RoutinePlayPage />
            </RequireFamily>
          }
        />

        <Route
          path="/parent"
          element={
            <RequireParent>
              <ParentLayout />
            </RequireParent>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="children" element={<ChildrenPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/new" element={<TaskFormPage />} />
          <Route path="tasks/:taskId" element={<TaskFormPage />} />
          <Route path="routines" element={<RoutinesPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="journal" element={<ParentJournalPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="invites" element={<InvitesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/delete-account" element={<DeleteAccountRequestPage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
