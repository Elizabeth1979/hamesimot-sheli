begin;

create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
grant usage on schema extensions to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
select plan(9);

select policy_cmd_is(
  'public',
  'task_checklist_items',
  'checklist_items_select',
  'SELECT',
  'child checklist policy deploys against the real table shape'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'parent-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'parent-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'child-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.families (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Family A'),
  ('20000000-0000-0000-0000-000000000002', 'Family B');

insert into public.children (id, family_id, name) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Child A'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Child B');

insert into public.profiles (id, family_id, display_name, role, account_type, child_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Parent A', 'owner', 'parent', null),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Parent B', 'owner', 'parent', null),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
   'Child B', 'parent', 'child', '30000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$insert into public.tasks (family_id, child_id, title)
    values ('20000000-0000-0000-0000-000000000001',
            '30000000-0000-0000-0000-000000000002', 'Injected task')$$,
  '23503'::char(5),
  'insert or update on table "tasks" violates foreign key constraint "tasks_child_family_fkey"',
  'a parent cannot attach an own-family task to another family child'
);

select lives_ok(
  $$select public.save_task_with_checklist(
    null,
    '{"child_id":"30000000-0000-0000-0000-000000000001","routine_id":null,
      "title":"Safe task","description":null,"icon":"✅","type":"checklist",
      "time_slot":"morning","days_of_week":[0,1,2,3,4,5,6],"timer_seconds":null,
      "sets_count":null,"set_seconds":null,"reps":null,"rest_seconds":null,
      "stars_value":1,"requires_approval":false,"is_active":true}'::jsonb,
    array['First step']
  )$$,
  'parent can atomically create a task and checklist'
);

select throws_ok(
  $$select public.save_task_with_checklist(
    (select id from public.tasks where title = 'Safe task'),
    jsonb_build_object(
      'child_id', '30000000-0000-0000-0000-000000000001',
      'routine_id', null,
      'title', 'Changed task',
      'description', null,
      'icon', '✅',
      'type', 'checklist',
      'time_slot', 'morning',
      'days_of_week', jsonb_build_array(0,1,2,3,4,5,6),
      'timer_seconds', null,
      'sets_count', null,
      'set_seconds', null,
      'reps', null,
      'rest_seconds', null,
      'stars_value', 1,
      'requires_approval', false,
      'is_active', true
    ),
    array[repeat('x', 81)]
  )$$,
  '23514'::char(5),
  'new row for relation "task_checklist_items" violates check constraint "task_checklist_items_title_check"',
  'an invalid replacement checklist rolls the whole task update back'
);

reset role;

select is(
  (select title from public.tasks where title in ('Safe task', 'Changed task')),
  'Safe task',
  'the failed checklist replacement did not partially update the task'
);

select is(
  (select count(*) from public.task_checklist_items where title = 'First step'),
  1::bigint,
  'the valid checklist was committed'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.task_checklist_items),
  0::bigint,
  'a child cannot read another family checklist item'
);

reset role;

select matches(
  pg_get_functiondef('public.request_redemption(uuid,uuid)'::regprocedure),
  'for update',
  'reward spending locks the child row before checking balance'
);

select is(
  (select count(*) from public.tasks where title = 'Injected task'),
  0::bigint,
  'the rejected cross-family task was not stored'
);

select * from finish();
rollback;
