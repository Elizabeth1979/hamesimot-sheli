import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys, useFamily } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/AuthProvider'
import { useLocale, useT } from '@/i18n'
import { useTheme, type ThemePreference } from '@/app/ThemeProvider'
import { clearParentUnlock, hashPin } from '@/lib/pin'
import { exportFamilyData } from '@/lib/export'
import { disablePush, enablePush, isPushEnabled, permissionState, pushSupport } from '@/lib/push'
import {
  Banner,
  Button,
  Card,
  Field,
  SegmentedControl,
  Spinner,
  TextInput,
  Toggle,
} from '@/components/ui'
import { Modal } from '@/components/Modal'
import { PinPad } from '@/components/PinPad'
import type { ReminderTimes, TablesUpdate } from '@/types/db'
import './parent.css'

const DEFAULT_REMINDERS: ReminderTimes = {
  morning: '07:30',
  afternoon: '15:30',
  evening: '19:00',
}

export function SettingsPage() {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const { preference, setPreference } = useTheme()
  const { familyId, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: family, isPending } = useFamily()

  const [pinDialog, setPinDialog] = useState<null | { step: 'first'; value?: string } | { step: 'confirm'; value: string }>(null)
  const [pinError, setPinError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushMessage, setPushMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    void isPushEnabled().then(setPushOn)
  }, [])

  const updateFamily = useMutation({
    mutationFn: async (patch: TablesUpdate<'families'>) => {
      const { error } = await supabase.from('families').update(patch).eq('id', familyId!)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.family })
    },
  })

  if (isPending || !family) {
    return (
      <main className="screen__body" id="main">
        <Spinner label={t.common.loading} />
      </main>
    )
  }

  const reminders = { ...DEFAULT_REMINDERS, ...(family.reminder_times as Partial<ReminderTimes>) }

  async function onPinEntered(pin: string) {
    if (!pinDialog) return
    if (pinDialog.step === 'first') {
      setPinDialog({ step: 'confirm', value: pin })
      setPinError('')
      return
    }
    if (pin !== pinDialog.value) {
      setPinError(t.pin.mismatch)
      setPinDialog({ step: 'first' })
      return
    }
    await updateFamily.mutateAsync({ parent_pin_hash: await hashPin(pin, family!.id) })
    setPinDialog(null)
    setPinError('')
  }

  async function togglePush(next: boolean) {
    setPushMessage('')
    if (!next) {
      await disablePush()
      setPushOn(false)
      return
    }

    const support = pushSupport()
    if (support === 'needs-install') {
      setPushMessage(t.push.iosHint)
      return
    }
    if (support === 'unsupported' || support === 'not-configured') {
      setPushMessage(t.push.unsupported)
      return
    }
    if (permissionState() === 'denied') {
      setPushMessage(t.push.blocked)
      return
    }

    const result = await enablePush()
    if (result === 'ok') {
      setPushOn(true)
      setPushMessage(t.push.enabled)
    } else if (result === 'denied') {
      setPushMessage(t.push.blocked)
    } else {
      setPushMessage(t.push.unsupported)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    setDeleteError('')

    const { error } = await supabase.functions.invoke('delete-account', { body: {} })
    setDeleting(false)

    if (error) {
      setDeleteError(t.errors.generic)
      return
    }

    clearParentUnlock()
    localStorage.clear()
    await signOut()
    void navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="screen__header">
        <h1>{t.settings.title}</h1>
      </header>

      <main className="screen__body" id="main">
        <h2 className="section-title">{t.settings.familySection}</h2>
        <Card className="stack">
          <Field label={t.settings.familyName} htmlFor="familyName">
            <TextInput
              id="familyName"
              defaultValue={family.name}
              maxLength={60}
              onBlur={(event) => {
                const name = event.target.value.trim()
                if (name && name !== family.name) updateFamily.mutate({ name })
              }}
            />
          </Field>
          <Link className="settings-link" to="/parent/invites">
            <span>✉️ {t.invites.title}</span>
            <span aria-hidden="true">›</span>
          </Link>
          <Link className="settings-link" to="/parent/children">
            <span>👶 {t.nav.children}</span>
            <span aria-hidden="true">›</span>
          </Link>
        </Card>

        <h2 className="section-title">{t.pin.setTitle}</h2>
        <Card className="stack">
          <p className="muted">{t.pin.notSecurityNote}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setPinError('')
              setPinDialog({ step: 'first' })
            }}
          >
            {family.parent_pin_hash ? t.pin.change : t.pin.setTitle}
          </Button>
          {family.parent_pin_hash && (
            <Button
              variant="ghost"
              onClick={() => {
                clearParentUnlock()
                updateFamily.mutate({ parent_pin_hash: null })
              }}
            >
              {t.pin.remove}
            </Button>
          )}
        </Card>

        <h2 className="section-title">{t.settings.appearance}</h2>
        <Card className="stack">
          <Field label={t.settings.language}>
            <SegmentedControl
              ariaLabel={t.settings.language}
              value={locale}
              onChange={setLocale}
              options={[
                { value: 'he', label: 'עברית' },
                { value: 'en', label: 'English' },
              ]}
            />
          </Field>
          <Field label={t.settings.theme}>
            <SegmentedControl
              ariaLabel={t.settings.theme}
              value={preference}
              onChange={(value: ThemePreference) => setPreference(value)}
              options={[
                { value: 'system', label: t.settings.themeSystem },
                { value: 'light', label: t.settings.themeLight },
                { value: 'dark', label: t.settings.themeDark },
              ]}
            />
          </Field>
        </Card>

        <h2 className="section-title">{t.settings.notifications}</h2>
        <Card className="stack">
          <Toggle
            label={t.push.enable}
            hint={pushOn ? t.push.enabled : t.push.disabled}
            checked={pushOn}
            onChange={(next) => void togglePush(next)}
          />
          {pushMessage && <Banner tone="info">{pushMessage}</Banner>}
          <p className="muted">{t.push.explainBody}</p>

          <Toggle
            label={t.settings.reminders}
            checked={family.reminders_enabled}
            onChange={(reminders_enabled) => updateFamily.mutate({ reminders_enabled })}
          />

          {(['morning', 'afternoon', 'evening'] as const).map((slot) => (
            <Field
              key={slot}
              label={
                slot === 'morning'
                  ? t.settings.reminderMorning
                  : slot === 'afternoon'
                    ? t.settings.reminderAfternoon
                    : t.settings.reminderEvening
              }
              htmlFor={`reminder-${slot}`}
            >
              <TextInput
                id={`reminder-${slot}`}
                type="time"
                defaultValue={reminders[slot]}
                onBlur={(event) =>
                  updateFamily.mutate({
                    reminder_times: { ...reminders, [slot]: event.target.value },
                  })
                }
              />
            </Field>
          ))}

          <Toggle
            label={t.settings.lockScreenPrivacy}
            hint={t.settings.lockScreenPrivacyHint}
            checked={family.notify_generic_lockscreen}
            onChange={(notify_generic_lockscreen) =>
              updateFamily.mutate({ notify_generic_lockscreen })
            }
          />
        </Card>

        <h2 className="section-title">{t.settings.dataSection}</h2>
        <Card className="stack">
          {exportError && <Banner tone="error">{exportError}</Banner>}
          <Button
            variant="secondary"
            disabled={exporting}
            onClick={() => {
              setExporting(true)
              setExportError('')
              void exportFamilyData()
                .catch(() => setExportError(t.errors.generic))
                .finally(() => setExporting(false))
            }}
          >
            {t.settings.exportData}
          </Button>
          <p className="muted">{t.settings.exportHint}</p>

          <Link className="settings-link" to="/privacy">
            <span>{t.settings.privacyPolicy}</span>
            <span aria-hidden="true">›</span>
          </Link>
          <Link className="settings-link" to="/terms">
            <span>{t.settings.terms}</span>
            <span aria-hidden="true">›</span>
          </Link>
          <Link className="settings-link" to="/install">
            <span>{t.settings.installApp}</span>
            <span aria-hidden="true">›</span>
          </Link>
        </Card>

        <Card className="stack">
          <Button variant="secondary" onClick={() => void signOut()}>
            {t.auth.logout}
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            {t.settings.deleteAccount}
          </Button>
          <p className="muted">{t.settings.deleteAccountHint}</p>
        </Card>
      </main>

      <Modal
        open={pinDialog !== null}
        title={t.pin.setTitle}
        onClose={() => setPinDialog(null)}
      >
        <PinPad
          title={pinDialog?.step === 'confirm' ? t.pin.confirmLabel : t.pin.setTitle}
          subtitle={t.pin.setSubtitle}
          error={pinError}
          onComplete={(pin) => void onPinEntered(pin)}
        />
      </Modal>

      <Modal
        open={deleteOpen}
        title={t.settings.deleteAccount}
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={deleteConfirmText.trim() !== family.name || deleting}
              onClick={() => void deleteAccount()}
            >
              {t.settings.deleteAccountButton}
            </Button>
          </>
        }
      >
        <Banner tone="error">{t.settings.deleteAccountHint}</Banner>
        <Field label={t.settings.deleteAccountConfirm} htmlFor="deleteConfirm" error={deleteError}>
          <TextInput
            id="deleteConfirm"
            value={deleteConfirmText}
            placeholder={family.name}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
          />
        </Field>
      </Modal>
    </>
  )
}

// Default export so the router can code-split this page into its own chunk.
export default SettingsPage
