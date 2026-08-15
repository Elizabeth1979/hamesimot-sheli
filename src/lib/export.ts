import { supabase } from './supabase'

/**
 * Exports everything the family owns as one JSON file. RLS already scopes each query,
 * so this is exactly the data the account can see — nothing more.
 */
export async function exportFamilyData(): Promise<void> {
  const results = await Promise.all([
    supabase.from('families').select('*'),
    supabase.from('profiles').select('id, display_name, role, created_at'),
    supabase.from('children').select('*'),
    supabase.from('routines').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('task_checklist_items').select('*'),
    supabase.from('task_completions').select('*'),
    supabase.from('checklist_item_completions').select('*'),
    supabase.from('rewards').select('*'),
    supabase.from('reward_redemptions').select('*'),
    supabase.from('journal_entries').select('*'),
  ])

  const datasetNames = [
    'families',
    'profiles',
    'children',
    'routines',
    'tasks',
    'checklist items',
    'task completions',
    'checklist completions',
    'rewards',
    'reward redemptions',
    'journal entries',
  ]
  const failedIndex = results.findIndex((result) => result.error)
  if (failedIndex >= 0) {
    throw new Error(`Could not export ${datasetNames[failedIndex]}: ${results[failedIndex].error!.message}`)
  }

  const [
    families,
    profiles,
    children,
    routines,
    tasks,
    checklistItems,
    completions,
    checklistCompletions,
    rewards,
    redemptions,
    journal,
  ] = results

  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    family: families.data?.[0] ?? null,
    parents: profiles.data ?? [],
    children: children.data ?? [],
    routines: routines.data ?? [],
    tasks: tasks.data ?? [],
    checklistItems: checklistItems.data ?? [],
    taskCompletions: completions.data ?? [],
    checklistCompletions: checklistCompletions.data ?? [],
    rewards: rewards.data ?? [],
    rewardRedemptions: redemptions.data ?? [],
    journalEntries: journal.data ?? [],
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `kidtasks-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
