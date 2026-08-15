// Generated from the Supabase schema. Regenerate after every migration with:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts
// (Only the `Database` type and `Constants` are kept; convenience aliases live in `db.ts`.)
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      account_deletion_jobs: {
        Row: {
          caller_id: string
          database_deleted: boolean
          family_id: string | null
          remaining_user_ids: string[]
          updated_at: string
        }
        Insert: {
          caller_id: string
          database_deleted?: boolean
          family_id?: string | null
          remaining_user_ids: string[]
          updated_at?: string
        }
        Update: {
          caller_id?: string
          database_deleted?: boolean
          family_id?: string | null
          remaining_user_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      checklist_item_completions: {
        Row: {
          child_id: string
          completed_at: string
          family_id: string
          for_date: string
          id: string
          item_id: string
          task_id: string
        }
        Insert: {
          child_id?: string
          completed_at?: string
          family_id?: string
          for_date: string
          id?: string
          item_id: string
          task_id?: string
        }
        Update: {
          child_id?: string
          completed_at?: string
          family_id?: string
          for_date?: string
          id?: string
          item_id?: string
          task_id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          avatar_color: string
          avatar_emoji: string
          created_at: string
          family_id: string
          id: string
          login_email: string | null
          name: string
          sort_order: number
        }
        Insert: {
          avatar_color?: string
          avatar_emoji?: string
          created_at?: string
          family_id: string
          id?: string
          login_email?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          avatar_color?: string
          avatar_emoji?: string
          created_at?: string
          family_id?: string
          id?: string
          login_email?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          notify_generic_lockscreen: boolean
          parent_pin_hash: string | null
          reminder_times: Json
          reminders_enabled: boolean
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notify_generic_lockscreen?: boolean
          parent_pin_hash?: string | null
          reminder_times?: Json
          reminders_enabled?: boolean
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notify_generic_lockscreen?: boolean
          parent_pin_hash?: string | null
          reminder_times?: Json
          reminders_enabled?: boolean
          timezone?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          id: string
          revoked_at: string | null
          role: Database['public']['Enums']['member_role']
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          family_id: string
          id?: string
          revoked_at?: string | null
          role?: Database['public']['Enums']['member_role']
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          id?: string
          revoked_at?: string | null
          role?: Database['public']['Enums']['member_role']
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          child_id: string
          family_id: string
          for_date: string
          id: string
          mood: number | null
          note: string | null
          updated_at: string
        }
        Insert: {
          child_id: string
          family_id?: string
          for_date: string
          id?: string
          mood?: number | null
          note?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          family_id?: string
          for_date?: string
          id?: string
          mood?: number | null
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database['public']['Enums']['account_type']
          child_id: string | null
          created_at: string
          display_name: string
          family_id: string
          id: string
          role: Database['public']['Enums']['member_role']
        }
        Insert: {
          account_type?: Database['public']['Enums']['account_type']
          child_id?: string | null
          created_at?: string
          display_name: string
          family_id: string
          id: string
          role?: Database['public']['Enums']['member_role']
        }
        Update: {
          account_type?: Database['public']['Enums']['account_type']
          child_id?: string | null
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
          role?: Database['public']['Enums']['member_role']
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          family_id: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          family_id: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          family_id?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          child_id: string
          family_id: string
          id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          reward_id: string | null
          reward_title: string
          star_cost: number
          status: Database['public']['Enums']['redemption_status']
        }
        Insert: {
          child_id: string
          family_id: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          reward_id?: string | null
          reward_title: string
          star_cost: number
          status?: Database['public']['Enums']['redemption_status']
        }
        Update: {
          child_id?: string
          family_id?: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          reward_id?: string | null
          reward_title?: string
          star_cost?: number
          status?: Database['public']['Enums']['redemption_status']
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          family_id: string
          icon: string
          id: string
          is_active: boolean
          sort_order: number
          star_cost: number
          title: string
        }
        Insert: {
          created_at?: string
          family_id: string
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          star_cost: number
          title: string
        }
        Update: {
          created_at?: string
          family_id?: string
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          star_cost?: number
          title?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          child_id: string
          created_at: string
          family_id: string
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          time_slot: Database['public']['Enums']['time_slot']
        }
        Insert: {
          child_id: string
          created_at?: string
          family_id: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          time_slot?: Database['public']['Enums']['time_slot']
        }
        Update: {
          child_id?: string
          created_at?: string
          family_id?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          time_slot?: Database['public']['Enums']['time_slot']
        }
        Relationships: []
      }
      task_checklist_items: {
        Row: {
          family_id: string
          id: string
          sort_order: number
          task_id: string
          title: string
        }
        Insert: {
          family_id: string
          id?: string
          sort_order?: number
          task_id: string
          title: string
        }
        Update: {
          family_id?: string
          id?: string
          sort_order?: number
          task_id?: string
          title?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          child_id: string
          client_id: string
          completed_at: string
          family_id: string
          for_date: string
          id: string
          stars_awarded: number
          status: Database['public']['Enums']['completion_status']
          task_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          child_id?: string
          client_id?: string
          completed_at?: string
          family_id?: string
          for_date: string
          id?: string
          stars_awarded?: number
          status?: Database['public']['Enums']['completion_status']
          task_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          child_id?: string
          client_id?: string
          completed_at?: string
          family_id?: string
          for_date?: string
          id?: string
          stars_awarded?: number
          status?: Database['public']['Enums']['completion_status']
          task_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          child_id: string
          created_at: string
          days_of_week: number[]
          description: string | null
          family_id: string
          icon: string
          id: string
          is_active: boolean
          reps: number | null
          requires_approval: boolean
          rest_seconds: number | null
          routine_id: string | null
          set_seconds: number | null
          sets_count: number | null
          sort_order: number
          stars_value: number
          time_slot: Database['public']['Enums']['time_slot']
          timer_seconds: number | null
          title: string
          type: Database['public']['Enums']['task_type']
        }
        Insert: {
          child_id: string
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          family_id: string
          icon?: string
          id?: string
          is_active?: boolean
          reps?: number | null
          requires_approval?: boolean
          rest_seconds?: number | null
          routine_id?: string | null
          set_seconds?: number | null
          sets_count?: number | null
          sort_order?: number
          stars_value?: number
          time_slot?: Database['public']['Enums']['time_slot']
          timer_seconds?: number | null
          title: string
          type?: Database['public']['Enums']['task_type']
        }
        Update: {
          child_id?: string
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          family_id?: string
          icon?: string
          id?: string
          is_active?: boolean
          reps?: number | null
          requires_approval?: boolean
          rest_seconds?: number | null
          routine_id?: string | null
          set_seconds?: number | null
          sets_count?: number | null
          sort_order?: number
          stars_value?: number
          time_slot?: Database['public']['Enums']['time_slot']
          timer_seconds?: number | null
          title?: string
          type?: Database['public']['Enums']['task_type']
        }
        Relationships: []
      }
    }
    Views: {
      child_star_balances: {
        Row: {
          child_id: string | null
          family_id: string | null
          stars_balance: number | null
          stars_earned: number | null
          stars_spent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite: {
        Args: { invite_code: string; invite_token: string }
        Returns: string
      }
      approve_completion: {
        Args: { p_approve?: boolean; p_completion_id: string }
        Returns: undefined
      }
      create_family: {
        Args: { display_name: string; family_name: string }
        Returns: string
      }
      create_family_with_children: {
        Args: { child_drafts: Json; display_name: string; family_name: string }
        Returns: string
      }
      request_redemption: {
        Args: { p_child_id: string; p_reward_id: string }
        Returns: string
      }
      register_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string; p_user_agent: string }
        Returns: undefined
      }
      resolve_redemption: {
        Args: { p_approve: boolean; p_redemption_id: string }
        Returns: undefined
      }
      save_task_with_checklist: {
        Args: { p_checklist?: string[]; p_task: Json; p_task_id: string | null }
        Returns: string
      }
    }
    Enums: {
      account_type: 'parent' | 'child'
      completion_status: 'done' | 'pending_approval' | 'approved'
      member_role: 'owner' | 'parent'
      redemption_status: 'pending' | 'approved' | 'rejected'
      task_type: 'check' | 'checklist' | 'timer' | 'sport'
      time_slot: 'morning' | 'afternoon' | 'evening'
    }
    CompositeTypes: Record<never, never>
  }
}
