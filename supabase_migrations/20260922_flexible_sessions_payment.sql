-- Somali incremental migration: flexible sessions + payment settings.
-- Safe to run against an existing Somali database. Does not alter or delete existing rows.

alter table public.sessions
  add column if not exists series_id uuid,
  add column if not exists series_frequency text default 'none';

create index if not exists idx_sessions_series on public.sessions(series_id);

alter table public.user_settings
  add column if not exists payment_bank text default 'MB',
  add column if not exists payment_account_number text default '0976406248',
  add column if not exists payment_account_name text default 'NGUYEN THI THU HUONG';

update public.sessions
set series_frequency = 'none'
where series_frequency is null;

update public.user_settings
set payment_bank = coalesce(payment_bank, 'MB'),
    payment_account_number = coalesce(payment_account_number, '0976406248'),
    payment_account_name = coalesce(payment_account_name, 'NGUYEN THI THU HUONG');
