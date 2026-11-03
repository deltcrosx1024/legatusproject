create table if not exists public.oauth_states (
  state_hash text primary key,
  provider text not null,
  discord_user_id text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_states_expires_at_idx
  on public.oauth_states (expires_at);

alter table public.oauth_states enable row level security;

create table if not exists public.account_provider_links (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null,
  provider text not null,
  provider_user_id text not null,
  username text,
  profile jsonb not null default '{}'::jsonb,
  oauth_token_encrypted text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_provider_links_discord_provider_key
    unique (discord_user_id, provider),
  constraint account_provider_links_provider_user_key
    unique (provider, provider_user_id)
);

create index if not exists account_provider_links_discord_user_idx
  on public.account_provider_links (discord_user_id);

alter table public.account_provider_links enable row level security;

grant all on table public.oauth_states to service_role;
grant all on table public.account_provider_links to service_role;
revoke all on table public.oauth_states from anon, authenticated;
revoke all on table public.account_provider_links from anon, authenticated;

create or replace function public.create_oauth_state(
  p_state_hash text,
  p_provider text,
  p_discord_user_id text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.oauth_states as oauth_state
  where oauth_state.state_hash in (
    select expired.state_hash
    from public.oauth_states as expired
    where expired.expires_at <= pg_catalog.now()
    order by expired.expires_at
    limit 500
  );

  insert into public.oauth_states (
    state_hash,
    provider,
    discord_user_id,
    expires_at
  )
  values (
    p_state_hash,
    p_provider,
    p_discord_user_id,
    p_expires_at
  );
end;
$$;

create or replace function public.complete_oauth_link(
  p_state_hash text,
  p_provider text,
  p_discord_user_id text,
  p_provider_user_id text,
  p_username text,
  p_profile jsonb,
  p_oauth_token_encrypted text,
  p_token_expires_at timestamptz,
  p_scopes text[]
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.oauth_states as oauth_state
  set consumed_at = pg_catalog.now()
  where oauth_state.state_hash = p_state_hash
    and oauth_state.provider = p_provider
    and oauth_state.discord_user_id = p_discord_user_id
    and oauth_state.consumed_at is null
    and oauth_state.expires_at > pg_catalog.now();

  if not found then
    return false;
  end if;

  insert into public.account_provider_links (
    discord_user_id,
    provider,
    provider_user_id,
    username,
    profile,
    oauth_token_encrypted,
    token_expires_at,
    scopes,
    updated_at
  )
  values (
    p_discord_user_id,
    p_provider,
    p_provider_user_id,
    p_username,
    p_profile,
    p_oauth_token_encrypted,
    p_token_expires_at,
    p_scopes,
    pg_catalog.now()
  )
  on conflict (discord_user_id, provider)
  do update set
    provider_user_id = excluded.provider_user_id,
    username = excluded.username,
    profile = excluded.profile,
    oauth_token_encrypted = excluded.oauth_token_encrypted,
    token_expires_at = excluded.token_expires_at,
    scopes = excluded.scopes,
    updated_at = pg_catalog.now();

  return true;
end;
$$;

revoke all on function public.create_oauth_state(text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_oauth_state(text, text, text, timestamptz)
  to service_role;

revoke all on function public.complete_oauth_link(
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  timestamptz,
  text[]
)
  from public, anon, authenticated;
grant execute on function public.complete_oauth_link(
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  timestamptz,
  text[]
)
  to service_role;
