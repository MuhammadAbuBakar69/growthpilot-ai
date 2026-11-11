-- Supabase-specific wiring: the tenant helper reads the JWT, and every new auth user gets an app row.
-- Everything else in 0001/0002 is portable Postgres and stays that way on purpose.

-- auth.uid() is the supported reader: it parses request.jwt.claims. The legacy
-- request.jwt.claim.sub setting is empty on current PostgREST, which made this return null and every
-- authenticated RPC fail with 28000.
create or replace function app_current_user() returns uuid
language sql stable as $$
  select coalesce(
    auth.uid(),
    nullif(current_setting('app.user_id', true), '')::uuid
  );
$$;

-- Mirror auth.users into app_users so FKs point at a table we control.
create or replace function sync_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- display_name is NOT NULL here, and sign-up metadata is optional, so fall back to the email's local
  -- part rather than failing the whole signup. The first version of this function referenced a
  -- full_name column that does not exist, and every signup returned a 500.
  insert into app_users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(nullif(app_users.display_name, ''), excluded.display_name),
        updated_at = now();
  return new;
end $$;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync
  after insert or update of email on auth.users
  for each row execute function sync_auth_user();

-- RLS policies are inert for the anon/authenticated roles unless the role may reach the table at all.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
