// ==========================================================
// Somali - Edge Function: send-reminders
//
// Hàm này chạy trên máy chủ Supabase (không phải trên trình duyệt),
// được gọi định kỳ bởi pg_cron (xem supabase_cron_setup.sql) để gửi
// thông báo đẩy thật cho các buổi học sắp tới — hoạt động kể cả khi
// người dùng đã tắt hẳn app.
//
// KHÔNG cần chỉnh sửa file này. Chỉ cần deploy theo hướng dẫn trong
// README.md (mục "Nâng cao: Thông báo đẩy khi tắt app").
// ==========================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // Chỉ chấp nhận lệnh gọi có kèm đúng mã bí mật (từ pg_cron), chặn
  // người lạ gọi tràn lan vào hàm này.
  const secret = req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Lịch của gia sư dùng giờ Việt Nam, không dùng UTC của máy chủ Supabase.
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const now = new Date();
  const nowVN = new Date(now.getTime() + VN_OFFSET_MS);
  const today = nowVN.toISOString().slice(0, 10);

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, user_id, student_id, date, time, status, reminder_sent')
    .eq('date', today)
    .eq('status', 'scheduled')
    .eq('reminder_sent', false);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sentCount = 0;
  let checkedCount = 0;

  for (const session of sessions ?? []) {
    checkedCount++;
    const [hh, mm] = session.time.split(':').map(Number);
    const [year, month, day] = session.date.split('-').map(Number);
    // Chuyển 09:00 giờ Việt Nam thành thời điểm UTC để so sánh chính xác.
    const sessionTime = new Date(Date.UTC(year, month - 1, day, hh, mm) - VN_OFFSET_MS);
    const diffMin = (sessionTime.getTime() - now.getTime()) / 60000;

    const { data: settings } = await supabase
      .from('user_settings')
      .select('reminders_enabled, reminder_minutes')
      .eq('user_id', session.user_id)
      .maybeSingle();

    if (!settings || !settings.reminders_enabled) continue;
    if (diffMin <= 0 || diffMin > settings.reminder_minutes) continue;

    const { data: student } = await supabase
      .from('students')
      .select('name')
      .eq('id', session.student_id)
      .maybeSingle();

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', session.user_id);

    const payload = JSON.stringify({
      title: 'Sắp đến buổi học',
      body: `${student?.name ?? 'Học sinh'} lúc ${session.time} (còn ${Math.round(diffMin)} phút)`,
      url: './index.html',
      tag: 'somali-reminder-' + session.id,
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sentCount++;
      } catch (err) {
        // Thiết bị đã gỡ đăng ký hoặc hết hạn -> dọn khỏi database
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    await supabase.from('sessions').update({ reminder_sent: true }).eq('id', session.id);
  }

  return new Response(JSON.stringify({ ok: true, checked: checkedCount, sent: sentCount }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
