import type { Database } from './database'

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

export type Family = Tables<'families'>
export type Profile = Tables<'profiles'>
export type Child = Tables<'children'>
export type Routine = Tables<'routines'>
export type Task = Tables<'tasks'>
export type ChecklistItem = Tables<'task_checklist_items'>
export type TaskCompletion = Tables<'task_completions'>
export type ChecklistItemCompletion = Tables<'checklist_item_completions'>
export type Reward = Tables<'rewards'>
export type RewardRedemption = Tables<'reward_redemptions'>
export type JournalEntry = Tables<'journal_entries'>
export type Invite = Tables<'invites'>
export type StarBalance = PublicSchema['Views']['child_star_balances']['Row']

export type TaskType = Enums<'task_type'>
export type TimeSlot = Enums<'time_slot'>
export type CompletionStatus = Enums<'completion_status'>
export type RedemptionStatus = Enums<'redemption_status'>
export type MemberRole = Enums<'member_role'>
export type AccountType = Enums<'account_type'>

export const TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening']
export const TASK_TYPES: TaskType[] = ['check', 'checklist', 'timer', 'sport']

/** A task joined with everything the child screens need to render it. */
export type TaskWithDetails = Task & {
  checklist: ChecklistItem[]
}

export type ReminderTimes = {
  morning: string
  afternoon: string
  evening: string
}
