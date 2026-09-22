-- ==========================================================
-- Somali - Lên lịch gửi thông báo đẩy tự động (pg_cron)
--
-- CHỈ chạy file này SAU KHI đã deploy xong Edge Function
-- "send-reminders" (xem hướng dẫn trong README.md, mục
-- "Nâng cao: Thông báo đẩy khi tắt app").
--
-- Trước khi chạy, thay 2 chỗ dưới đây:
--   1. <PROJECT_REF>    -> mã project của bạn (Project Settings > General)
--   2. <CRON_SECRET>    -> đúng giá trị bạn đã đặt khi chạy lệnh
--                          `supabase secrets set CRON_SECRET=...`
-- ==========================================================

-- Bật 2 extension cần thiết (nếu Supabase báo lỗi thiếu quyền, vào
-- Database > Extensions trên Dashboard, tìm "pg_cron" và "pg_net",
-- bật lên bằng nút gạt, rồi chạy lại phần bên dưới)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Gọi Edge Function mỗi 5 phút để kiểm tra và gửi nhắc lịch
select cron.schedule(
  'somali-send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Kiểm tra job đã lên lịch thành công chưa
select * from cron.job where jobname = 'somali-send-reminders';

-- (Nếu sau này muốn tắt/xoá lịch này, chạy dòng dưới)
-- select cron.unschedule('somali-send-reminders');
