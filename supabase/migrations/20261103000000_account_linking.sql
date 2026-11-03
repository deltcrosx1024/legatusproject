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

create or replace function public.consume_oauth_state(
  p_state_hash text,
  p_provider text,
  p_discord_user_id text
)
returns table (discord_user_id text)
language sql
security definer
set search_path = ''
as $$
  update public.oauth_states as oauth_state
  set consumed_at = pg_catalog.now()
  where oauth_state.state_hash = p_state_hash
    and oauth_state.provider = p_provider
    and oauth_state.discord_user_id = p_discord_user_id
    and oauth_state.consumed_at is null
    and oauth_state.expires_at > pg_catalog.now()
  returning oauth_state.discord_user_id;
$$;

revoke all on function public.consume_oauth_state(text, text, text)
  from public, anon, authenticated;
grant execute on function public.consume_oauth_state(text, text, text)
  to service_role;
