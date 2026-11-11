-- One round trip creates a tenant: org, owner membership and business profile, atomically.
-- Client-side inserts would race the RLS policy that requires membership to already exist, which is
-- exactly the chicken-and-egg that produces half-created workspaces in production.

create or replace function create_workspace(
  p_business_name text,
  p_website_url   text default null,
  p_industry      text default null,
  p_description   text default null,
  p_target_audience text default null,
  p_challenges    text[] default '{}',
  p_org_name      text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := app_current_user();
  v_org  uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if coalesce(btrim(p_business_name), '') = '' then
    raise exception 'business name is required' using errcode = '22023';
  end if;

  -- organizations.slug is NOT NULL and unique, so derive it: readable prefix plus a short suffix that
  -- makes collisions vanishingly unlikely without a retry loop.
  insert into organizations (name, slug, created_by)
  values (
    coalesce(nullif(btrim(p_org_name), ''), p_business_name),
    lower(regexp_replace(btrim(coalesce(nullif(btrim(p_org_name), ''), p_business_name)), '[^a-zA-Z0-9]+', '-', 'g'))
      || '-' || substr(md5(random()::text), 1, 6),
    v_user
  )
  returning id into v_org;

  insert into org_members (org_id, user_id, role) values (v_org, v_user, 'owner');

  insert into business_profiles (org_id, name, website_url, industry, description, target_audience, challenges)
  values (v_org, btrim(p_business_name), nullif(btrim(p_website_url), ''), nullif(btrim(p_industry), ''),
          nullif(btrim(p_description), ''), nullif(btrim(p_target_audience), ''), coalesce(p_challenges, '{}'));

  return v_org;
end $$;

revoke all on function create_workspace(text, text, text, text, text, text[], text) from public;
grant execute on function create_workspace(text, text, text, text, text, text[], text) to authenticated;

-- The dashboard's single read: this user's workspaces with the profile attached.
create or replace view my_workspaces as
  select o.id as org_id, o.name as org_name, o.plan, m.role,
         p.id as profile_id, p.name as business_name, p.industry, p.website_url, p.description
  from organizations o
  join org_members m on m.org_id = o.id and m.user_id = app_current_user()
  left join business_profiles p on p.org_id = o.id and p.deleted_at is null
  where o.deleted_at is null;
