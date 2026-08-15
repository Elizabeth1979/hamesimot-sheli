import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys, useChildren } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/AuthProvider'
import { useT } from '@/i18n'
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  PasswordInput,
  Spinner,
  TextInput,
} from '@/components/ui'
import { Avatar, CHILD_COLORS, CHILD_EMOJIS, ColorPicker, EmojiPicker } from '@/components/AvatarPicker'
import { ConfirmDialog, Modal } from '@/components/Modal'
import type { Child } from '@/types/db'
import './parent.css'

type Draft = {
  id?: string
  name: string
  emoji: string
  color: string
  loginEmail: string
  password: string
  hadLogin: boolean
}

class CreatedChildLoginError extends Error {
  constructor(readonly childId: string) {
    super('Child was created, but its login could not be configured')
  }
}

const validEmail = (value: string) => !value || /^\S+@\S+\.\S+$/.test(value.trim())

export function ChildrenPage() {
  const t = useT()
  const { familyId } = useAuth()
  const queryClient = useQueryClient()
  const { data: children, isPending } = useChildren()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [toDelete, setToDelete] = useState<Child | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: keys.children })
  }

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      let childId = value.id
      if (value.id) {
        const { error } = await supabase
          .from('children')
          .update({ name: value.name.trim(), avatar_emoji: value.emoji, avatar_color: value.color })
          .eq('id', value.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('children')
          .insert({
            family_id: familyId!,
            name: value.name.trim(),
            avatar_emoji: value.emoji,
            avatar_color: value.color,
            sort_order: children?.length ?? 0,
          })
          .select('id')
          .single()
        if (error) throw error
        childId = data.id
      }

      const currentEmail = children?.find((child) => child.id === value.id)?.login_email ?? ''
      const loginChanged = value.loginEmail.trim().toLowerCase() !== currentEmail
      if (loginChanged || value.password) {
        const { error } = await supabase.functions.invoke('manage-child-login', {
          body: {
            child_id: childId,
            email: value.loginEmail.trim(),
            password: value.password,
          },
        })
        if (error) {
          if (!value.id && childId) throw new CreatedChildLoginError(childId)
          throw error
        }
      }
    },
    onSuccess: () => {
      setDraft(null)
      invalidate()
    },
    onError: (error) => {
      if (error instanceof CreatedChildLoginError) {
        setDraft((current) => (current ? { ...current, id: error.childId } : current))
        invalidate()
      }
    },
  })

  const remove = useMutation({
    mutationFn: async (childId: string) => {
      const child = children?.find((entry) => entry.id === childId)
      if (child?.login_email) {
        const { error } = await supabase.functions.invoke('manage-child-login', {
          body: { child_id: childId, email: '' },
        })
        if (error) throw error
      }
      const { error } = await supabase.from('children').delete().eq('id', childId)
      if (error) throw error
    },
    onSuccess: () => {
      setToDelete(null)
      invalidate()
      void queryClient.invalidateQueries({ queryKey: keys.tasks })
    },
  })

  return (
    <>
      <header className="screen__header">
        <Link className="back-link" to="/parent" aria-label={t.common.back} />
        <h1>{t.children.title}</h1>
      </header>

      <main className="screen__body" id="main">
        {isPending ? (
          <Spinner label={t.common.loading} />
        ) : children && children.length > 0 ? (
          <ul className="list">
            {children.map((child) => (
              <li key={child.id}>
                <Card className="list-row">
                  <Avatar emoji={child.avatar_emoji} color={child.avatar_color} />
                  <span className="list-row__text list-row__title">{child.name}</span>
                  {child.login_email && <span className="muted">{t.children.loginEnabled}</span>}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setDraft({
                        id: child.id,
                        name: child.name,
                        emoji: child.avatar_emoji,
                        color: child.avatar_color,
                        loginEmail: child.login_email ?? '',
                        password: '',
                        hadLogin: Boolean(child.login_email),
                      })
                    }
                  >
                    {t.common.edit}
                  </Button>
                  <Button variant="ghost" onClick={() => setToDelete(child)}>
                    🗑️
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="👶" title={t.children.empty} />
        )}

        <Button
          fullWidth
          variant="secondary"
          onClick={() =>
            setDraft({
              name: '',
              emoji: CHILD_EMOJIS[(children?.length ?? 0) % CHILD_EMOJIS.length],
              color: CHILD_COLORS[(children?.length ?? 0) % CHILD_COLORS.length],
              loginEmail: '',
              password: '',
              hadLogin: false,
            })
          }
        >
          {t.children.addTitle}
        </Button>
      </main>

      <Modal
        open={draft !== null}
        title={draft?.id ? t.children.editTitle : t.children.addTitle}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={
                !draft?.name.trim()
                || save.isPending
                || !validEmail(draft?.loginEmail ?? '')
                || Boolean(draft?.loginEmail && !draft.hadLogin && draft.password.length < 8)
                || Boolean(draft?.password && draft.password.length < 8)
              }
              onClick={() => draft && save.mutate(draft)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {draft && (
          <>
            <div className="row row--center">
              <Avatar emoji={draft.emoji} color={draft.color} size="lg" />
            </div>
            <Field label={t.children.nameLabel} htmlFor="childName">
              <TextInput
                id="childName"
                value={draft.name}
                maxLength={40}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label={t.common.emoji}>
              <EmojiPicker
                label={t.common.emoji}
                options={CHILD_EMOJIS}
                value={draft.emoji}
                onChange={(emoji) => setDraft({ ...draft, emoji })}
              />
            </Field>
            <Field label={t.common.color}>
              <ColorPicker
                label={t.common.color}
                value={draft.color}
                onChange={(color) => setDraft({ ...draft, color })}
              />
            </Field>
            <h3 className="section-title">{t.children.loginSection}</h3>
            <p className="muted">{t.children.loginHint}</p>
            <Field
              label={t.children.loginEmail}
              htmlFor="childLoginEmail"
              hint={draft.hadLogin ? t.children.loginRemoveHint : undefined}
            >
              <TextInput
                id="childLoginEmail"
                type="email"
                className="input--ltr"
                dir="ltr"
                autoComplete="off"
                value={draft.loginEmail}
                onChange={(event) => setDraft({ ...draft, loginEmail: event.target.value })}
              />
            </Field>
            {draft.loginEmail && (
              <Field
                label={t.children.loginPassword}
                htmlFor="childLoginPassword"
                hint={
                  draft.hadLogin
                    ? t.children.loginPasswordEditHint
                    : t.children.loginPasswordNewHint
                }
              >
                <PasswordInput
                  id="childLoginPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required={!draft.hadLogin}
                  value={draft.password}
                  onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                />
              </Field>
            )}
            {save.isError && <Banner tone="error">{t.children.loginSaveError}</Banner>}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        destructive
        title={t.children.deleteConfirmTitle}
        body={toDelete ? t.children.deleteConfirmBody(toDelete.name) : ''}
        confirmLabel={t.common.delete}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  )
}

// Default export so the router can code-split this page into its own chunk.
export default ChildrenPage
