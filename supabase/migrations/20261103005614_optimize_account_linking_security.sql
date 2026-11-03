drop index if exists public.account_provider_links_discord_user_idx;

revoke all on function public.rls_auto_enable()
  from public, anon, authenticated;
