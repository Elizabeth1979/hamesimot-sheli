import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useChildren, useTasks } from '@/lib/queries'
import { useT } from '@/i18n'
import { Button, EmptyState, SegmentedControl, Spinner } from '@/components/ui'
import './parent.css'

export function TasksPage() {
  const t = useT()
  const { data: children } = useChildren()
  const { data: tasks, isPending } = useTasks()
  const [childFilter, setChildFilter] = useState<string>('all')

  const slotLabel = {
    morning: t.myDay.slotMorning,
    afternoon: t.myDay.slotAfternoon,
    evening: t.myDay.slotEvening,
  }

  const visible = (tasks ?? []).filter(
    (task) => childFilter === 'all' || task.child_id === childFilter,
  )

  return (
    <>
      <header className="screen__header">
        <Link className="back-link" to="/parent" aria-label={t.common.back} />
        <h1>{t.nav.tasks}</h1>
      </header>

      <main className="screen__body" id="main">
        {children && children.length > 1 && (
          <SegmentedControl
            ariaLabel={t.taskForm.childLabel}
            value={childFilter}
            onChange={setChildFilter}
            options={[
              { value: 'all', label: t.common.allChildren },
              ...children.map((child) => ({ value: child.id, label: child.name })),
            ]}
          />
        )}

        {isPending ? (
          <Spinner label={t.common.loading} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="📋"
            title={t.taskForm.noTasks}
            action={
              <Link to="/parent/tasks/new">
                <Button variant="secondary">{t.taskForm.addFirst}</Button>
              </Link>
            }
          />
        ) : (
          <ul className="list">
            {visible.map((task) => {
              const child = children?.find((entry) => entry.id === task.child_id)
              return (
                <li key={task.id}>
                  <Link className="list-row list-row--link" to={`/parent/tasks/${task.id}`}>
                    <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
                      {task.icon}
                    </span>
                    <span className="list-row__text">
                      <span className="list-row__title">
                        {task.title}
                        {!task.is_active && ' · ⏸'}
                      </span>
                      <span className="list-row__meta">
                        {child?.name} · {slotLabel[task.time_slot]} · ⭐{task.stars_value}
                        {task.requires_approval && ' · 👍'}
                      </span>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {/*
          A labelled button in the flow, matching the children, routines and rewards
          screens. It replaced a floating button, which overlapped the tab bar, hid the
          last row of the list, and said only "+".
        */}
        {visible.length > 0 && (
          <Link to="/parent/tasks/new" className="block-link">
            <Button fullWidth variant="secondary">
              {t.taskForm.newTitle}
            </Button>
          </Link>
        )}
      </main>
    </>
  )
}

// Default export so the router can code-split this page into its own chunk.
export default TasksPage
