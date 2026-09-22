-- ==========================================================
-- Somali - Supabase schema
-- Cách dùng: mở Supabase Dashboard > SQL Editor > New query
-- Dán toàn bộ nội dung file này vào và nhấn Run (chỉ cần làm 1 lần)
-- ==========================================================

-- Bảng học sinh
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text default '',
  phone text default '',
  fee_per_session numeric default 0,
  created_at timestamptz default now()
);

-- Bảng buổi học
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  time text not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  paid boolean default false,
  -- Chốt học phí tại thời điểm tạo buổi học để đổi học phí sau này
  -- không làm sai báo cáo các buổi cũ.
  fee_amount numeric default 0,
  note text default '',
  series_id uuid,
  series_frequency text default 'none' check (series_frequency in ('none','daily','weekly','monthly')),
  created_at timestamptz default now()
);

-- Bảng nhận xét theo tháng
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  month text not null, -- định dạng 'YYYY-MM'
  text text default '',
  created_at timestamptz default now(),
  unique (student_id, month)
);

-- Đánh dấu buổi học đã được gửi thông báo đẩy chưa (tránh nhắc trùng)
alter table public.sessions add column if not exists reminder_sent boolean default false;
alter table public.sessions add column if not exists fee_amount numeric default 0;
alter table public.sessions add column if not exists series_id uuid;
alter table public.sessions add column if not exists series_frequency text default 'none';

-- Thiết bị đã đăng ký nhận thông báo đẩy (Web Push)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- Cài đặt nhắc lịch của từng tài khoản (lưu server để Edge Function đọc được,
-- không chỉ lưu trên máy như trước)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reminders_enabled boolean default false,
  reminder_minutes integer default 30,
  payment_bank text default 'MB',
  payment_account_number text default '0976406248',
  payment_account_name text default 'NGUYEN THI THU HUONG',
  updated_at timestamptz default now()
);

alter table public.user_settings add column if not exists payment_bank text default 'MB';
alter table public.user_settings add column if not exists payment_account_number text default '0976406248';
alter table public.user_settings add column if not exists payment_account_name text default 'NGUYEN THI THU HUONG';

-- Index cho truy vấn nhanh hơn
create index if not exists idx_sessions_user_date on public.sessions(user_id, date);
create index if not exists idx_sessions_student on public.sessions(student_id);
create index if not exists idx_sessions_series on public.sessions(series_id);
create index if not exists idx_students_user on public.students(user_id);
create index if not exists idx_notes_student on public.notes(student_id);
create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);

-- ==========================================================
-- Row Level Security: mỗi tài khoản CHỈ thấy và sửa được
-- dữ liệu của chính mình (dựa vào user_id = auth.uid())
--
-- Nhờ vậy, nếu sau này bạn chia sẻ app cho đồng nghiệp cùng
-- dùng, mỗi người đăng ký tài khoản riêng và chỉ nhìn thấy học
-- sinh/buổi học của chính họ, không lẫn với dữ liệu của bạn.
-- ==========================================================

alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_settings enable row level security;

create policy "students_select_own" on public.students
  for select using (auth.uid() = user_id);
create policy "students_insert_own" on public.students
  for insert with check (auth.uid() = user_id);
create policy "students_update_own" on public.students
  for update using (auth.uid() = user_id);
create policy "students_delete_own" on public.students
  for delete using (auth.uid() = user_id);

create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

create policy "push_subs_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subs_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subs_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id);
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id);

-- Lưu ý: Edge Function gửi thông báo đẩy chạy bằng "service role key"
-- (khóa riêng cho máy chủ, khác với anon key), nên sẽ tự động bỏ qua
-- toàn bộ RLS ở trên để đọc được lịch của MỌI tài khoản và gửi thông
-- báo đúng người — đây là hành vi mặc định, an toàn của Supabase, vì
-- service role key không bao giờ lộ ra ngoài client.

-- ==========================================================
-- (Tùy chọn) Bật Realtime để dữ liệu tự cập nhật giữa các thiết bị
-- Vào Database > Replication trong Supabase Dashboard, bật Realtime
-- cho 3 bảng: students, sessions, notes
-- ==========================================================
