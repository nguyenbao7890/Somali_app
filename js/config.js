/* ==========================================================
   Somali - Cấu hình kết nối Supabase

   Cách lấy 2 giá trị bên dưới:
   1. Tạo tài khoản miễn phí tại https://supabase.com
   2. Tạo 1 project mới (chọn vùng Singapore cho tốc độ tốt nhất)
   3. Vào Project Settings > API
   4. Copy "Project URL"        → dán vào SUPABASE_URL
   5. Copy "anon public" key    → dán vào SUPABASE_ANON_KEY

   Lưu ý: "anon key" được PHÉP để công khai trong code phía client
   (đây là cách Supabase thiết kế), việc bảo mật dữ liệu thực sự nằm ở
   Row Level Security (RLS) đã được cấu hình trong file supabase_schema.sql.
   Xem README.md để biết chi tiết đầy đủ từng bước.
========================================================== */

const SUPABASE_URL = 'https://ihlsaedhhibajcmvnbyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobHNhZWRoaGliYWpjbXZuYnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5OTc4OTAsImV4cCI6MjEwMTU3Mzg5MH0.GqJcnBPFYr9tWs7LQW_TeHUo4IFeDP7RRznYZjQFzkY';

/* ==========================================================
   Khóa công khai cho thông báo đẩy (Web Push) — đã tạo sẵn cho bạn,
   không cần tự tạo. Khóa RIÊNG TƯ tương ứng (VAPID_PRIVATE_KEY) sẽ
   được cấu hình ở phía Supabase Edge Function, không đặt ở đây vì
   đây là file chạy trên trình duyệt, ai cũng xem được.
========================================================== */
const VAPID_PUBLIC_KEY = 'BOtM7wDNnFfgGd7zGRbybK9pUttEpHLh48SRZFGNATzamyWpflPCa5KlDSuth0h4SU8OYqhbiERpfgH3_HkZtZk';
