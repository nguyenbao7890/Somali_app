-- Somali compatibility migration: ensure fields used by the current client exist.
-- Safe for existing users: this adds missing columns/indexes only and does not
-- rewrite existing session status or payment flags.

alter table public.sessions
  add column if not exists paid boolean default false,
  add column if not exists fee_amount numeric default 0,
  add column if not exists series_id uuid,
  add column if not exists series_frequency text default 'none';

create index if not exists idx_sessions_series on public.sessions(series_id);
