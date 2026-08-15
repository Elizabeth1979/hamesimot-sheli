import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys, useChecklistItems, useChildren, useRoutines, useTasks } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { useT } from '@/i18n'
import {
  Button,
  Card,
  Field,
  SegmentedControl,
  Spinner,
  TextArea,
  TextInput,
  Toggle,
} from '@/components/ui'
import { EmojiPicker, TASK_EMOJIS } from '@/components/AvatarPicker'
import { ConfirmDialog } from '@/components/Modal'
import type { TaskType, TimeSlot } from '@/types/db'
import './parent.css'

/** How a single set is measured: a rep count, or a countdown in seconds. */
type SetMode = 'reps' | 'time'

type Draft = {
  childId: string
  routineId: string
  title: string
  description: string
  icon: string
  type: TaskType
  timeSlot: TimeSlot
  days: number[]
  timerMinutes: number
  setsCount: number
  setMode: SetMode
  setSeconds: number
  reps: number
  restSeconds: number
  stars: number
  requiresApproval: boolean
  isActive: boolean
  checklist: string[]
}

const EMPTY: Draft = {
  childId: '',
  routineId: '',
  title: '',
  description: '',
  icon: '✅',
  type: 'check',
  timeSlot: 'morning',
  days: [0, 1, 2, 3, 4, 5, 6],
  timerMinutes: 2,
  setsCount: 3,
  setMode: 'reps',
  setSeconds: 30,
  reps: 10,
  restSeconds: 30,
  stars: 1,
  requiresApproval: false,
  isActive: true,
  checklist: [],
}

export function TaskFormPage() {
  const t = useT()
  const navigate = useNavigate()
  const { taskId } = useParams()
  const queryClient = useQueryClient()

  const { data: children } = useChildren()
  const { data: routines } = useRoutines()
  const { data: tasks, isPending: tasksPending } = useTasks()
  const { data: allItems } = useChecklistItems()

  const editing = Boolean(taskId)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Seed once: from the existing task when editing, or from the first child when creating.
  useEffect(() => {
    if (loaded) return
    if (editing) {
      const task = tasks?.find((entry) => entry.id === taskId)
      if (!task) return
      setDraft({
        childId: task.child_id,
        routineId: task.routine_id ?? '',
        title: task.title,
        description: task.description ?? '',
        icon: task.icon,
        type: task.type,
        timeSlot: task.time_slot,
        days: [...task.days_of_week].sort(),
        timerMinutes: Math.max(1, Math.round((task.timer_seconds ?? 120) / 60)),
        setsCount: task.sets_count ?? 3,
        // Whichever column the task was saved with decides the mode it opens in.
        setMode: task.reps != null ? 'reps' : 'time',
        setSeconds: task.set_seconds ?? 30,
        reps: task.reps ?? 10,
        restSeconds: task.rest_seconds ?? 30,
        stars: task.stars_value,
        requiresApproval: task.requires_approval,
        isActive: task.is_active,
        checklist: (allItems ?? [])
          .filter((item) => item.task_id === task.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => item.title),
      })
      setLoaded(true)
      return
    }
    if (children && children.length > 0) {
      setDraft((current) => ({ ...current, childId: children[0].id }))
      setLoaded(true)
    }
  }, [loaded, editing, taskId, tasks, allItems, children])

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const payload = {
        child_id: value.childId,
        routine_id: value.routineId || null,
        title: value.title.trim(),
        description: value.description.trim() || null,
        icon: value.icon,
        type: value.type,
        time_slot: value.timeSlot,
        days_of_week: value.days.length > 0 ? value.days : [0, 1, 2, 3, 4, 5, 6],
        timer_seconds: value.type === 'timer' ? value.timerMinutes * 60 : null,
        sets_count: value.type === 'sport' ? value.setsCount : null,
        // Exactly one of these is set for a sport task; the DB constraint enforces it.
        set_seconds: value.type === 'sport' && value.setMode === 'time' ? value.setSeconds : null,
        reps: value.type === 'sport' && value.setMode === 'reps' ? value.reps : null,
        rest_seconds: value.type === 'sport' ? value.restSeconds : null,
        stars_value: value.stars,
        requires_approval: value.requiresApproval,
        is_active: value.isActive,
      }

      const steps = value.checklist.map((title) => title.trim()).filter(Boolean)
      const { error } = await supabase.rpc('save_task_with_checklist', {
        p_task_id: taskId ?? null,
        p_task: payload,
        p_checklist: value.type === 'checklist' ? steps : [],
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.tasks })
      void queryClient.invalidateQueries({ queryKey: keys.checklistItems })
      void navigate('/parent/tasks')
    },
  })

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId!)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.tasks })
      void navigate('/parent/tasks')
    },
  })

  if (editing && tasksPending) {
    return (
      <main className="screen__body" id="main">
        <Spinner label={t.common.loading} />
      </main>
    )
  }

  function toggleDay(day: number) {
    setDraft((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((value) => value !== day)
        : [...current.days, day].sort(),
    }))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.childId) return
    save.mutate(draft)
  }

  const childRoutines = (routines ?? []).filter((routine) => routine.child_id === draft.childId)

  return (
    <>
      <header className="screen__header">
        <Link className="back-link" to="/parent/tasks" aria-label={t.common.back} />
        <h1>{editing ? t.taskForm.editTitle : t.taskForm.newTitle}</h1>
      </header>

      <main className="screen__body" id="main">
        <form onSubmit={onSubmit} noValidate>
          <Field label={t.taskForm.titleLabel} htmlFor="title">
            <TextInput
              id="title"
              required
              maxLength={80}
              placeholder={t.taskForm.titlePlaceholder}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </Field>

          <Field label={t.taskForm.iconLabel}>
            <EmojiPicker
              label={t.taskForm.iconLabel}
              options={TASK_EMOJIS}
              value={draft.icon}
              onChange={(icon) => setDraft({ ...draft, icon })}
            />
          </Field>

          {children && children.length > 0 && (
            <Field label={t.taskForm.childLabel}>
              <SegmentedControl
                ariaLabel={t.taskForm.childLabel}
                value={draft.childId}
                onChange={(childId) => setDraft({ ...draft, childId, routineId: '' })}
                options={children.map((child) => ({ value: child.id, label: child.name }))}
              />
            </Field>
          )}

          <Field label={t.taskForm.typeLabel}>
            <SegmentedControl
              ariaLabel={t.taskForm.typeLabel}
              value={draft.type}
              onChange={(type) => setDraft({ ...draft, type })}
              options={[
                { value: 'check', label: t.task.typeCheck },
                { value: 'checklist', label: t.task.typeChecklist },
                { value: 'timer', label: t.task.typeTimer },
                { value: 'sport', label: t.task.typeSport },
              ]}
            />
          </Field>

          {draft.type === 'checklist' && (
            <Field label={t.taskForm.checklistLabel}>
              <div className="stack--tight stack">
                {draft.checklist.map((step, index) => (
                  <div className="row" key={index}>
                    <TextInput
                      aria-label={`${t.taskForm.stepPlaceholder} ${index + 1}`}
                      placeholder={t.taskForm.stepPlaceholder}
                      value={step}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          checklist: draft.checklist.map((value, position) =>
                            position === index ? event.target.value : value,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={t.common.delete}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          checklist: draft.checklist.filter((_, position) => position !== index),
                        })
                      }
                    >
                      🗑️
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraft({ ...draft, checklist: [...draft.checklist, ''] })}
                >
                  {t.taskForm.addStep}
                </Button>
              </div>
            </Field>
          )}

          {draft.type === 'timer' && (
            <Field label={`${t.taskForm.timerLabel} (${t.common.minutes})`} htmlFor="timerMinutes">
              <TextInput
                id="timerMinutes"
                type="number"
                min={1}
                max={120}
                value={draft.timerMinutes}
                onChange={(event) =>
                  setDraft({ ...draft, timerMinutes: Number(event.target.value) })
                }
              />
            </Field>
          )}

          {draft.type === 'sport' && (
            <Card className="stack">
              <Field label={t.taskForm.setsLabel} htmlFor="sets">
                <TextInput
                  id="sets"
                  type="number"
                  min={1}
                  max={50}
                  value={draft.setsCount}
                  onChange={(event) =>
                    setDraft({ ...draft, setsCount: Number(event.target.value) })
                  }
                />
              </Field>
              {/* A set is measured one way or the other: seconds for a plank, reps for squats. */}
              <Field label={t.taskForm.setModeLabel}>
                <SegmentedControl
                  ariaLabel={t.taskForm.setModeLabel}
                  value={draft.setMode}
                  onChange={(next) => setDraft({ ...draft, setMode: next as SetMode })}
                  options={[
                    { value: 'reps', label: t.taskForm.setModeReps },
                    { value: 'time', label: t.taskForm.setModeTime },
                  ]}
                />
              </Field>

              {draft.setMode === 'reps' ? (
                <Field label={t.taskForm.repsLabel} htmlFor="reps">
                  <TextInput
                    id="reps"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    value={draft.reps}
                    onChange={(event) => setDraft({ ...draft, reps: Number(event.target.value) })}
                  />
                </Field>
              ) : (
                <Field
                  label={`${t.taskForm.setSecondsLabel} (${t.common.seconds})`}
                  htmlFor="setSeconds"
                >
                  <TextInput
                    id="setSeconds"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={3600}
                    value={draft.setSeconds}
                    onChange={(event) =>
                      setDraft({ ...draft, setSeconds: Number(event.target.value) })
                    }
                  />
                </Field>
              )}
              <Field
                label={`${t.taskForm.restSecondsLabel} (${t.common.seconds})`}
                htmlFor="restSeconds"
              >
                <TextInput
                  id="restSeconds"
                  type="number"
                  min={0}
                  max={1800}
                  value={draft.restSeconds}
                  onChange={(event) =>
                    setDraft({ ...draft, restSeconds: Number(event.target.value) })
                  }
                />
              </Field>
            </Card>
          )}

          <Field label={t.taskForm.slotLabel}>
            <SegmentedControl
              ariaLabel={t.taskForm.slotLabel}
              value={draft.timeSlot}
              onChange={(timeSlot) => setDraft({ ...draft, timeSlot })}
              options={[
                { value: 'morning', label: t.myDay.slotMorning },
                { value: 'afternoon', label: t.myDay.slotAfternoon },
                { value: 'evening', label: t.myDay.slotEvening },
              ]}
            />
          </Field>

          <Field label={t.taskForm.daysLabel} hint={t.taskForm.everyDay}>
            <div className="day-picker">
              {t.days.short.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={draft.days.includes(day)}
                  aria-label={t.days.long[day]}
                  className={draft.days.includes(day) ? 'is-active' : ''}
                  onClick={() => toggleDay(day)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {childRoutines.length > 0 && (
            <Field label={t.taskForm.routineLabel}>
              <SegmentedControl
                ariaLabel={t.taskForm.routineLabel}
                value={draft.routineId}
                onChange={(routineId) => setDraft({ ...draft, routineId })}
                options={[
                  { value: '', label: t.taskForm.noRoutine },
                  ...childRoutines.map((routine) => ({ value: routine.id, label: routine.name })),
                ]}
              />
            </Field>
          )}

          <Field label={t.taskForm.starsLabel} htmlFor="stars">
            <TextInput
              id="stars"
              type="number"
              min={0}
              max={20}
              value={draft.stars}
              onChange={(event) => setDraft({ ...draft, stars: Number(event.target.value) })}
            />
          </Field>

          <Field label={t.taskForm.descriptionLabel} htmlFor="description">
            <TextArea
              id="description"
              maxLength={400}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </Field>

          <Card className="stack">
            <Toggle
              label={t.taskForm.approvalLabel}
              hint={t.taskForm.approvalHint}
              checked={draft.requiresApproval}
              onChange={(requiresApproval) => setDraft({ ...draft, requiresApproval })}
            />
            <Toggle
              label={t.taskForm.activeLabel}
              checked={draft.isActive}
              onChange={(isActive) => setDraft({ ...draft, isActive })}
            />
          </Card>

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={save.isPending || !draft.title.trim() || !draft.childId}
            style={{ marginBlockStart: 'var(--space-4)' }}
          >
            {t.common.save}
          </Button>

          {editing && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => setConfirmDelete(true)}
              style={{ marginBlockStart: 'var(--space-2)', color: 'var(--red-500)' }}
            >
              {t.common.delete}
            </Button>
          )}
        </form>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title={t.common.delete}
        body={t.taskForm.deleteConfirm}
        confirmLabel={t.common.delete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  )
}

// Default export so the router can code-split this page into its own chunk.
export default TaskFormPage
