-- Fix: private.call_edge_function called extensions.net_http_post, which does not exist.
--
-- 0005_push_hooks.sql installs pg_net with `with schema extensions`, but pg_net always
-- creates its objects in the `net` schema regardless of that clause. The available
-- function is net.http_post(url, body, params, headers, timeout_milliseconds) — there is
-- no net_http_post anywhere, in any schema.
--
-- Why nothing looked broken: the function returns early whenever the Vault secrets are
-- unset, so the bad call was unreachable and writes succeeded. The moment push is
-- configured (docs/push-setup.md), all three notify triggers — on task_completions,
-- reward_redemptions and tasks — would raise 42883 and abort the write. Completing a
-- task would have started failing exactly when notifications were switched on.
--
-- The exception guard makes that class of failure impossible: the original comment
-- already states that a push problem must never block the writing statement, and an
-- unreachable notification is preferable to a child being unable to tick off a chore.

create or replace function private.call_edge_function(function_name text, body jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';

  -- Missing secrets simply mean push is not configured yet; writes must still succeed.
  if base_url is null or service_key is null then
    return;
  end if;

  begin
    perform net.http_post(
      url := base_url || '/functions/v1/' || function_name,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := body,
      timeout_milliseconds := 5000
    );
  exception when others then
    -- Never let a notification failure roll back the write that triggered it.
    raise warning 'call_edge_function(%) failed: %', function_name, sqlerrm;
  end;
end;
$$;

revoke execute on function private.call_edge_function(text, jsonb)
  from public, anon, authenticated;
