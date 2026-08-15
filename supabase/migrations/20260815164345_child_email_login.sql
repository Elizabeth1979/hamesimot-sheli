-- Optional, independently authenticated child accounts.
-- Parents continue to see their whole family; a child identity is restricted to the
-- single child row it is linked to, including in SECURITY DEFINER RPCs.

create type public.account_type as enum ('parent', 'child');

alter table public.children
  add column login_email text;

create unique index children_login_email_unique
  on public.children (lower(login_email))
  where login_email is not null;

alter table public.children
  add constraint children_login_email_normalized
  check (login_email is null or login_email = lower(btrim(login_email)));

alter table public.profiles
  add column account_type public.account_type not null default 'parent',
  add column child_id uuid unique references public.children (id) on delete cascade,
  add constraint profiles_account_link_check check (
    (account_type = 'parent' and child_id is null)
    or (account_type = 'child' and child_id is not null)
  );

-- A UUID identifies a row, but it does not prove that two referenced rows belong to the
-- same tenant. Composite keys make that invariant impossible to bypass through the API.
create unique index children_id_family_unique on public.children (id, family_id);
create unique index profiles_id_family_unique on public.profiles (id, family_id);
create unique index routines_id_family_unique on public.routines (id, family_id);
create unique index tasks_id_family_unique on public.tasks (id, family_id);
create unique index checklist_items_id_family_unique
  on public.task_checklist_items (id, family_id);
create unique index rewards_id_family_unique on public.rewards (id, family_id);

alter table public.profiles
  add constraint profiles_child_family_fkey
  foreign key (child_id, family_id) references public.children (id, family_id);
alter table public.routines
  add constraint routines_child_family_fkey
  foreign key (child_id, family_id) references public.children (id, family_id);
alter table public.tasks
  add constraint tasks_child_family_fkey
  foreign key (child_id, family_id) references public.children (id, family_id),
  add constraint tasks_routine_family_fkey
  foreign key (routine_id, family_id) references public.routines (id, family_id);
alter table public.task_checklist_items
  add constraint checklist_items_task_family_fkey
  foreign key (task_id, family_id) references public.tasks (id, family_id);
alter table public.task_completions
  add constraint task_completions_task_family_fkey
  foreign key (task_id, family_id) references public.tasks (id, family_id),
  add constraint task_completions_child_family_fkey
  foreign key (child_id, family_id) references public.children (id, family_id);
alter table public.checklist_item_completions
  add constraint item_completions_item_family_fkey
  foreign key (item_id, family_id) references public.task_checklist_items (id, family_id),
  add constraint item_completions_task_family_fkey
  foreign key (task_id, family_id) references public.tasks (id, family_id),
  add constraint item_completions_child_family_fkey
  foreign key (child_id, family_id) references public.children (id, family_id);
alter table public.reward_redemptions
  add constraint redemptions_reward_family_fkey
  foreign key (reward_id, family_id) references public.rewards (id, family_id),
  add constraint redemptions_child_family_fkey
  foreign key (child_id, family_id) references public.children (id, family_id);
alter table public.journal_entries
  add constraint journal_child_family_fkey
  foreign key (child_id, family_id) references public.children (id, family_id);

-- This service-only recovery record survives family deletion until every Auth identity
-- is gone. Browser roles receive no privileges and no RLS policy for it.
create table public.account_deletion_jobs (
  caller_id uuid primary key,
  family_id uuid,
  remaining_user_ids uuid[] not null,
  database_deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.account_deletion_jobs to service_role;

create function private.current_account_type()
returns public.account_type
language sql
stable
security definer
set search_path = ''
as $$
  select account_type from public.profiles where id = (select auth.uid())
$$;

create function private.current_child_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select child_id from public.profiles where id = (select auth.uid())
$$;

revoke all on function private.current_account_type() from public, anon, authenticated;
revoke all on function private.current_child_id() from public, anon, authenticated;
grant execute on function private.current_account_type() to authenticated;
grant execute on function private.current_child_id() to authenticated;

-- Replace the original broad family policies with role-aware policies.
drop policy families_select on public.families;
drop policy families_update on public.families;
drop policy profiles_select on public.profiles;
drop policy profiles_update_self on public.profiles;
drop policy children_all on public.children;
drop policy routines_all on public.routines;
drop policy tasks_all on public.tasks;
drop policy task_checklist_items_all on public.task_checklist_items;
drop policy task_completions_all on public.task_completions;
drop policy checklist_item_completions_all on public.checklist_item_completions;
drop policy rewards_all on public.rewards;
drop policy reward_redemptions_all on public.reward_redemptions;
drop policy journal_entries_all on public.journal_entries;
drop policy invites_all on public.invites;
drop policy push_subscriptions_select on public.push_subscriptions;
drop policy push_subscriptions_write on public.push_subscriptions;
drop policy push_subscriptions_update on public.push_subscriptions;
drop policy push_subscriptions_delete on public.push_subscriptions;

create policy families_parent_select on public.families for select to authenticated
  using ((select private.current_account_type()) = 'parent'
    and id = (select private.current_family_id()));
create policy families_parent_update on public.families for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and id = (select private.current_family_id()));

create policy profiles_select on public.profiles for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (account_type = 'child' and id = (select auth.uid()))
  );
create policy profiles_parent_update_self on public.profiles for update to authenticated
  using ((select private.current_account_type()) = 'parent' and id = (select auth.uid()))
  with check (
    (select private.current_account_type()) = 'parent'
    and id = (select auth.uid())
    and family_id = (select private.current_family_id())
    and account_type = 'parent'
    and child_id is null
  );

create policy children_select on public.children for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );
create policy children_parent_insert on public.children for insert to authenticated
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy children_parent_update on public.children for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy children_parent_delete on public.children for delete to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));

create policy routines_select on public.routines for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );
create policy routines_parent_insert on public.routines for insert to authenticated
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy routines_parent_update on public.routines for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy routines_parent_delete on public.routines for delete to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));

create policy tasks_select on public.tasks for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );
create policy tasks_parent_insert on public.tasks for insert to authenticated
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy tasks_parent_update on public.tasks for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy tasks_parent_delete on public.tasks for delete to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));

create policy checklist_items_select on public.task_checklist_items for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (
      family_id = (select private.current_family_id())
      and exists (
        select 1 from public.tasks
        where tasks.id = task_checklist_items.task_id
          and tasks.child_id = (select private.current_child_id())
          and tasks.family_id = (select private.current_family_id())
      )
    )
  );
create policy checklist_items_parent_insert on public.task_checklist_items for insert to authenticated
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy checklist_items_parent_update on public.task_checklist_items for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy checklist_items_parent_delete on public.task_checklist_items for delete to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));

create policy completions_select on public.task_completions for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );
create policy completions_insert on public.task_completions for insert to authenticated
  with check (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (
      child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id())
      and exists (
        select 1 from public.tasks
        where tasks.id = task_completions.task_id
          and tasks.child_id = (select private.current_child_id())
          and tasks.family_id = (select private.current_family_id())
      )
    )
  );
create policy completions_parent_update on public.task_completions for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy completions_delete on public.task_completions for delete to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );

create policy item_completions_select on public.checklist_item_completions for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );
create policy item_completions_insert on public.checklist_item_completions for insert to authenticated
  with check (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (
      child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id())
      and exists (
        select 1
        from public.task_checklist_items item
        join public.tasks task on task.id = item.task_id and task.family_id = item.family_id
        where item.id = checklist_item_completions.item_id
          and task.id = checklist_item_completions.task_id
          and task.child_id = (select private.current_child_id())
          and task.family_id = (select private.current_family_id())
      )
    )
  );
create policy item_completions_parent_update on public.checklist_item_completions
  for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy item_completions_delete on public.checklist_item_completions for delete to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );

create policy rewards_select on public.rewards for select to authenticated
  using (family_id = (select private.current_family_id()));
create policy rewards_parent_insert on public.rewards for insert to authenticated
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy rewards_parent_update on public.rewards for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy rewards_parent_delete on public.rewards for delete to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));

create policy redemptions_select on public.reward_redemptions for select to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );
create policy redemptions_parent_insert on public.reward_redemptions for insert to authenticated
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy redemptions_parent_update on public.reward_redemptions for update to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy redemptions_parent_delete on public.reward_redemptions for delete to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));

create policy journal_family_access on public.journal_entries for all to authenticated
  using (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  )
  with check (
    ((select private.current_account_type()) = 'parent'
      and family_id = (select private.current_family_id()))
    or (child_id = (select private.current_child_id())
      and family_id = (select private.current_family_id()))
  );

create policy invites_parent_all on public.invites for all to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()))
  with check (
    (select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id())
    and created_by = (select auth.uid())
  );

create policy push_parent_select on public.push_subscriptions for select to authenticated
  using ((select private.current_account_type()) = 'parent'
    and family_id = (select private.current_family_id()));
create policy push_parent_insert on public.push_subscriptions for insert to authenticated
  with check (
    (select private.current_account_type()) = 'parent'
    and user_id = (select auth.uid())
    and family_id = (select private.current_family_id())
  );
create policy push_parent_update on public.push_subscriptions for update to authenticated
  using ((select private.current_account_type()) = 'parent' and user_id = (select auth.uid()))
  with check ((select private.current_account_type()) = 'parent'
    and user_id = (select auth.uid())
    and family_id = (select private.current_family_id()));
create policy push_parent_delete on public.push_subscriptions for delete to authenticated
  using ((select private.current_account_type()) = 'parent' and user_id = (select auth.uid()));

-- Family, owner profile, and initial children are one onboarding transaction.
create function public.create_family_with_children(
  family_name text,
  display_name text,
  child_drafts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_family_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = uid) then
    raise exception 'user already belongs to a family' using errcode = '23505';
  end if;
  if jsonb_typeof(child_drafts) is distinct from 'array'
    or jsonb_array_length(child_drafts) not between 1 and 20 then
    raise exception 'between 1 and 20 children are required' using errcode = '22023';
  end if;

  insert into public.families (name)
  values (coalesce(nullif(btrim(family_name), ''), 'KidTasks'))
  returning id into new_family_id;

  insert into public.profiles (id, family_id, display_name, role, account_type)
  values (
    uid,
    new_family_id,
    coalesce(nullif(btrim(display_name), ''), 'הורה'),
    'owner',
    'parent'
  );

  insert into public.children (family_id, name, avatar_emoji, avatar_color, sort_order)
  select
    new_family_id,
    btrim(draft.value->>'name'),
    coalesce(nullif(draft.value->>'emoji', ''), '🙂'),
    coalesce(nullif(draft.value->>'color', ''), '#6d5ae0'),
    draft.ordinality::integer - 1
  from jsonb_array_elements(child_drafts) with ordinality as draft(value, ordinality);

  return new_family_id;
end;
$$;

revoke execute on function public.create_family_with_children(text, text, jsonb)
  from public, anon;
grant execute on function public.create_family_with_children(text, text, jsonb)
  to authenticated;

-- Task fields and the ordered checklist commit or roll back together.
create function public.save_task_with_checklist(
  p_task_id uuid,
  p_task jsonb,
  p_checklist text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  fam uuid := private.current_family_id();
  saved_id uuid;
  requested_child uuid := (p_task->>'child_id')::uuid;
  requested_routine uuid := nullif(p_task->>'routine_id', '')::uuid;
  task_kind public.task_type := (p_task->>'type')::public.task_type;
  task_days smallint[];
begin
  if fam is null or private.current_account_type() <> 'parent' then
    raise exception 'parent account required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.children where id = requested_child and family_id = fam
  ) then
    raise exception 'child not in family' using errcode = '42501';
  end if;
  if requested_routine is not null and not exists (
    select 1 from public.routines
    where id = requested_routine and family_id = fam and child_id = requested_child
  ) then
    raise exception 'routine not available for child' using errcode = '22023';
  end if;

  select coalesce(array_agg(day.value::smallint order by day.ordinality),
    '{0,1,2,3,4,5,6}'::smallint[])
  into task_days
  from jsonb_array_elements_text(coalesce(p_task->'days_of_week', '[]'::jsonb))
    with ordinality as day(value, ordinality);

  if p_task_id is null then
    insert into public.tasks (
      family_id, child_id, routine_id, title, description, icon, type, time_slot,
      days_of_week, timer_seconds, sets_count, set_seconds, reps, rest_seconds,
      stars_value, requires_approval, is_active
    ) values (
      fam,
      requested_child,
      requested_routine,
      btrim(p_task->>'title'),
      nullif(btrim(p_task->>'description'), ''),
      p_task->>'icon',
      task_kind,
      (p_task->>'time_slot')::public.time_slot,
      task_days,
      nullif(p_task->>'timer_seconds', '')::integer,
      nullif(p_task->>'sets_count', '')::integer,
      nullif(p_task->>'set_seconds', '')::integer,
      nullif(p_task->>'reps', '')::integer,
      nullif(p_task->>'rest_seconds', '')::integer,
      (p_task->>'stars_value')::integer,
      (p_task->>'requires_approval')::boolean,
      (p_task->>'is_active')::boolean
    ) returning id into saved_id;
  else
    update public.tasks set
      child_id = requested_child,
      routine_id = requested_routine,
      title = btrim(p_task->>'title'),
      description = nullif(btrim(p_task->>'description'), ''),
      icon = p_task->>'icon',
      type = task_kind,
      time_slot = (p_task->>'time_slot')::public.time_slot,
      days_of_week = task_days,
      timer_seconds = nullif(p_task->>'timer_seconds', '')::integer,
      sets_count = nullif(p_task->>'sets_count', '')::integer,
      set_seconds = nullif(p_task->>'set_seconds', '')::integer,
      reps = nullif(p_task->>'reps', '')::integer,
      rest_seconds = nullif(p_task->>'rest_seconds', '')::integer,
      stars_value = (p_task->>'stars_value')::integer,
      requires_approval = (p_task->>'requires_approval')::boolean,
      is_active = (p_task->>'is_active')::boolean
    where id = p_task_id and family_id = fam
    returning id into saved_id;

    if saved_id is null then
      raise exception 'task not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.task_checklist_items where task_id = saved_id and family_id = fam;
  if task_kind = 'checklist' then
    insert into public.task_checklist_items (family_id, task_id, title, sort_order)
    select fam, saved_id, btrim(step.title), step.ordinality::integer - 1
    from unnest(p_checklist) with ordinality as step(title, ordinality)
    where btrim(step.title) <> '';
  end if;

  return saved_id;
end;
$$;

revoke execute on function public.save_task_with_checklist(uuid, jsonb, text[])
  from public, anon;
grant execute on function public.save_task_with_checklist(uuid, jsonb, text[])
  to authenticated;

-- A physical browser subscription can outlive a previous login on a shared device.
-- Possession of its endpoint and keys lets the current parent safely claim it.
create function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  fam uuid := private.current_family_id();
begin
  if uid is null or fam is null or private.current_account_type() <> 'parent' then
    raise exception 'parent account required' using errcode = '42501';
  end if;
  if nullif(p_endpoint, '') is null or nullif(p_p256dh, '') is null or nullif(p_auth, '') is null then
    raise exception 'invalid push subscription' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (
    family_id, user_id, endpoint, p256dh, auth, user_agent, last_seen_at
  ) values (
    fam, uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200), now()
  )
  on conflict (endpoint) do update set
    family_id = excluded.family_id,
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    last_seen_at = now();
end;
$$;

revoke execute on function public.register_push_subscription(text, text, text, text)
  from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text)
  to authenticated;

-- Child callers may only spend their own balance. Parents retain the shared-device flow.
create or replace function public.request_redemption(p_child_id uuid, p_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  fam uuid := private.current_family_id();
  own_child uuid := private.current_child_id();
  r record;
  balance integer;
  new_id uuid;
begin
  if fam is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if private.current_account_type() = 'child' and p_child_id <> own_child then
    raise exception 'child account cannot act for another child' using errcode = '42501';
  end if;
  if not exists (select 1 from public.children where id = p_child_id and family_id = fam) then
    raise exception 'child not in family' using errcode = '42501';
  end if;
  -- Serialize every spend for this child until this transaction commits.
  perform 1 from public.children where id = p_child_id and family_id = fam for update;
  select * into r from public.rewards where id = p_reward_id and family_id = fam and is_active;
  if r.id is null then
    raise exception 'unknown reward' using errcode = '22023';
  end if;
  select stars_balance into balance from public.child_star_balances where child_id = p_child_id;
  balance := balance - coalesce(
    (select sum(star_cost) from public.reward_redemptions
      where child_id = p_child_id and status = 'pending'), 0);
  if balance < r.star_cost then
    raise exception 'not enough stars' using errcode = '22023';
  end if;
  insert into public.reward_redemptions (family_id, reward_id, child_id, reward_title, star_cost)
  values (fam, r.id, p_child_id, r.title, r.star_cost)
  returning id into new_id;
  return new_id;
end;
$$;

-- Approval RPCs are privileged APIs and must remain parent-only.
create or replace function public.approve_completion(p_completion_id uuid, p_approve boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fam uuid := private.current_family_id();
begin
  if fam is null or private.current_account_type() <> 'parent' then
    raise exception 'parent account required' using errcode = '42501';
  end if;
  if p_approve then
    update public.task_completions
       set status = 'approved', approved_at = now(), approved_by = (select auth.uid())
     where id = p_completion_id and family_id = fam and status = 'pending_approval';
  else
    delete from public.task_completions
     where id = p_completion_id and family_id = fam and status = 'pending_approval';
  end if;
end;
$$;

create or replace function public.resolve_redemption(p_redemption_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fam uuid := private.current_family_id();
begin
  if fam is null or private.current_account_type() <> 'parent' then
    raise exception 'parent account required' using errcode = '42501';
  end if;
  update public.reward_redemptions
     set status = case when p_approve then 'approved'::public.redemption_status
                       else 'rejected'::public.redemption_status end,
         resolved_at = now(),
         resolved_by = (select auth.uid())
   where id = p_redemption_id and family_id = fam and status = 'pending';
end;
$$;
