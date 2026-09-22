# Somali — App quản lý gia sư

PWA (Progressive Web App) quản lý lịch học, học sinh, học phí, nhận xét hàng tháng và báo cáo PDF. Cài được lên iPhone như app thật, dùng tốt trên trình duyệt máy tính, **đồng bộ dữ liệu qua mọi thiết bị**, và có thể **nhắc lịch học bằng thông báo đẩy kể cả khi đã tắt app**.

## Việc cần làm trước tiên: thiết lập database (bắt buộc, ~5 phút)

1. Tạo tài khoản miễn phí tại https://supabase.com
2. Tạo project mới (đặt tên tùy ý, chọn vùng **Singapore** cho tốc độ tốt), đợi ~1-2 phút để khởi tạo
3. Vào **SQL Editor** → **New query** → copy toàn bộ nội dung file `supabase_schema.sql` → dán vào → nhấn **Run**. Bước này tạo sẵn các bảng dữ liệu và bảo mật theo tài khoản. Nếu đã chạy schema cũ, hãy chạy lại file để thêm các cột `sessions.fee_amount`, `sessions.series_id`, `sessions.series_frequency` và thông tin thanh toán trong `user_settings`.
4. Vào **Project Settings > API**, copy **Project URL** và **anon public key**
5. Mở file `js/config.js`, dán 2 giá trị đó vào `SUPABASE_URL` và `SUPABASE_ANON_KEY`
6. Vào **Authentication > Providers**, đảm bảo **Email** đang bật (mặc định đã bật sẵn)
7. Mở app → chọn "Đăng ký" → tạo tài khoản email + mật khẩu của riêng bạn (chỉ làm 1 lần)

Từ giờ, chỉ cần đăng nhập cùng tài khoản đó trên iPhone và máy tính lần đầu tiên — sau đó mỗi thiết bị tự nhớ đăng nhập, dữ liệu đồng bộ 2 chiều. Xem thêm mục "Nâng cao" bên dưới nếu bạn muốn bật **thông báo đẩy khi đã tắt app** (tùy chọn, cần thêm ~15-20 phút và thao tác dòng lệnh).

**Về bảo mật**: "anon key" trong `config.js` được phép công khai trong code. Bảo mật thật nằm ở Row Level Security đã cấu hình sẵn trong `supabase_schema.sql`: chỉ tài khoản đã đăng nhập đúng mới đọc/sửa được dữ liệu của chính họ.

## Cấu trúc thư mục

```
somali-app/
├── index.html                        # Khung app, toàn bộ các màn hình
├── manifest.json                      # Cấu hình PWA (tên, icon, màu theme)
├── service-worker.js                   # Cache offline + nhận thông báo đẩy
├── supabase_schema.sql                  # Chạy 1 lần trong Supabase để tạo database
├── supabase_cron_setup.sql               # (Nâng cao) lên lịch gửi thông báo đẩy tự động
├── css/style.css                          # Toàn bộ style — màu hồng pastel + design tokens
├── js/config.js                            # Nơi dán Supabase URL + anon key + VAPID key
├── js/store.js                              # Lớp giao tiếp với Supabase
├── js/app.js                                 # Logic hiển thị, điều hướng, thông báo, PDF
├── js/mascots.js                              # Nhân vật thỏ minh họa (SVG, tự vẽ)
├── js/pdf-font.js                              # Font tiếng Việt nhúng sẵn cho báo cáo PDF
├── assets/logo.png                              # Logo Somali
├── icons/                                        # Icon app các kích thước
└── supabase/functions/send-reminders/index.ts     # (Nâng cao) Edge Function gửi thông báo đẩy
```

## Cách chạy thử trên máy tính

Không nên mở trực tiếp `index.html` bằng cách double-click (đường dẫn `file://` khiến Service Worker không hoạt động đúng). Hãy chạy qua local server:

- **VS Code**: cài extension "Live Server" → chuột phải `index.html` → "Open with Live Server"
- **Terminal**: `python3 -m http.server 8000` rồi mở `http://localhost:8000`

## Cách đưa app lên internet (để cài lên iPhone)

### Dùng Netlify (khuyên dùng — kéo thả là xong)
1. Vào https://app.netlify.com/drop
2. Kéo cả thư mục `somali-app` vào trang đó
3. Netlify cho bạn 1 link dạng `https://ten-ngau-nhien.netlify.app`
4. Mở link đó bằng **Safari trên iPhone** → nút Chia sẻ → "Thêm vào màn hình chính"
5. Đăng nhập 1 lần — App mở fullscreen thật sự (không còn thanh địa chỉ Safari) chỉ khi cài theo cách này.

### Hoặc dùng Vercel / GitHub Pages
Nếu có tài khoản GitHub, đẩy thư mục lên 1 repo rồi bật GitHub Pages trong Settings — cũng cho link https miễn phí tương tự.

## Tính năng hiện tại

- **Đăng nhập / Đăng ký**: chỉ 1 lần mỗi thiết bị, tự động nhớ đăng nhập cho các lần sau
- **Trang chủ**: buổi học hôm nay, số học sinh, thu nhập tháng, danh sách học phí còn nợ
- **Lịch học**: nội dung buổi học hiển thị trực tiếp trên từng ô ngày (giờ + tên học sinh, kiểu Google Calendar), buổi mới tự động hoàn thành, có thể tạo lịch lặp theo ngày/tuần/tháng, sửa hoặc hủy từng buổi hay cả chuỗi
- **Học sinh**: danh sách, tìm kiếm, chi tiết từng học sinh gồm lịch sử buổi học, công nợ tự tính, nhận xét theo tháng
- **Thanh toán gộp**: trong chi tiết học sinh có thể thanh toán toàn bộ các buổi đã hoàn thành còn nợ bằng một lần bấm
- **Báo cáo PDF**: nút "Xuất báo cáo PDF" trong trang chi tiết học sinh — luôn đọc dữ liệu mới nhất, xuất họ tên, SĐT, môn học, học phí, toàn bộ lịch sử buổi học, nhận xét từng tháng và QR thanh toán cùng thông tin tài khoản hiện tại
- **Nhắc lịch học**: bật trong Cài đặt (icon bánh răng). Có 2 lớp:
  - Nhắc trong lúc app đang mở (luôn hoạt động ngay khi bật)
  - Nhắc bằng **thông báo đẩy thật kể cả khi đã tắt app** (cần thêm bước thiết lập ở mục "Nâng cao" bên dưới)
- **Ảnh đại diện**: vào Cài đặt tài khoản, chọn ảnh PNG/JPG/WEBP từ thiết bị rồi nhấn lưu. Ảnh được nén nhỏ và lưu trong metadata tài khoản Supabase.
- **Thêm vào Lịch điện thoại (.ics)**: mỗi buổi học có nút xuất file .ics để thêm vào app Lịch của iPhone — một lớp nhắc lịch dự phòng đáng tin cậy khác
- **Đồng bộ real-time**: sửa trên điện thoại, mở lại trên máy tính thấy cập nhật ngay
- **Minh họa nhân vật thỏ pastel**: thay cho icon/emoji ở lời chào và các màn hình trống — hình vẽ nguyên bản, không dùng nhân vật có bản quyền
- Layout responsive: sidebar + 2 cột trên máy tính, bottom nav trên điện thoại

---

## Nâng cao: Thông báo đẩy khi đã tắt app

Đây là phần **kỹ thuật nhất** của app — cần một máy chủ nhỏ đứng ra gửi thông báo đúng giờ (gọi là "push server"), vì trình duyệt không tự làm được việc này khi app đã đóng. Phần này **hoàn toàn tùy chọn** — không làm thì app vẫn nhắc lịch bình thường khi đang mở, và vẫn xuất được file .ics để nhắc qua Lịch điện thoại.

Nếu muốn bật, làm theo các bước sau (chỉ cần làm 1 lần):

### Bước 1 — Cài Supabase CLI
Mở Terminal, chạy:
```
npm install -g supabase
```
(Cần có Node.js — nếu chưa có, tải tại https://nodejs.org, chọn bản LTS)

### Bước 2 — Đăng nhập và liên kết project
```
cd đường-dẫn-tới/somali-app
supabase login
supabase link --project-ref MÃ_PROJECT_CỦA_BẠN
```
Mã project (project ref) nằm ở **Project Settings > General > Reference ID** trên Supabase Dashboard.

### Bước 3 — Khai báo các khóa bí mật cho Edge Function
```
supabase secrets set VAPID_PUBLIC_KEY=BOtM7wDNnFfgGd7zGRbybK9pUttEpHLh48SRZFGNATzamyWpflPCa5KlDSuth0h4SU8OYqhbiERpfgH3_HkZtZk
supabase secrets set VAPID_PRIVATE_KEY=<VAPID_PRIVATE_KEY_TAO_MOI>
supabase secrets set VAPID_SUBJECT=mailto:email-cua-ban@example.com
supabase secrets set CRON_SECRET=<CRON_SECRET_TU_DAT>
```
Không commit các giá trị private key hoặc secret vào GitHub. Nếu các giá trị cũ đã từng được sử dụng, hãy tạo và cấu hình lại chúng trước khi bật Edge Function.

### Bước 4 — Deploy Edge Function
```
supabase functions deploy send-reminders --no-verify-jwt
```
Lệnh này sẽ in ra 1 đường dẫn dạng `https://<project-ref>.supabase.co/functions/v1/send-reminders` — giữ lại để dùng ở bước sau.

### Bước 5 — Bật extension cần thiết
Vào **Database > Extensions** trên Supabase Dashboard, tìm và bật (gạt nút On):
- `pg_cron`
- `pg_net`

### Bước 6 — Lên lịch gửi tự động
Mở file `supabase_cron_setup.sql`, thay `<PROJECT_REF>` và `<CRON_SECRET>` bằng giá trị thật của bạn (đúng với bước 2 và 3), rồi copy toàn bộ, dán vào **SQL Editor** trên Supabase Dashboard và nhấn **Run**.

### Xong! Kiểm tra lại
Mở app trên điện thoại đã cài PWA (đã "Thêm vào màn hình chính"), vào **Cài đặt > Nhắc lịch học**, bật lên và cho phép quyền thông báo. Từ giờ bạn sẽ được nhắc kể cả khi đã tắt hẳn app.

**Lưu ý về iOS**: Web Push chỉ hoạt động trên iOS 16.4 trở lên, và **chỉ khi app đã được "Thêm vào màn hình chính"** (mở qua Safari bình thường sẽ không nhận được thông báo dạng này).

**Nếu có lỗi phát sinh ở phần này**: đây là phần mình không thể tự kiểm thử 100% vì cần hạ tầng máy chủ thật (khác với các phần còn lại của app, mình đã test kỹ qua trình duyệt giả lập). Cứ gửi mình thông báo lỗi cụ thể (chụp màn hình Terminal hoặc log lỗi trong Supabase Dashboard > Edge Functions > Logs) để mình debug tiếp cùng bạn.

---

## Cách cập nhật thiết kế sau này

- **Đổi logo**: thay `assets/logo.png` bằng file mới
- **Đổi icon app**: gửi file mới cho mình, mình resize đúng kích thước trong `icons/`
- **Đổi màu chủ đạo**: sửa các biến màu ở đầu `css/style.css` (phần `:root`)
- **Đổi họa tiết nền**: sửa mảng `symbols` trong hàm `renderDecoBackground()` ở `js/app.js`
- **Đổi nhân vật minh họa**: sửa file `js/mascots.js`

## Gửi thiết kế mới cho mình cập nhật

Bất cứ khi nào có logo/icon/màu mới từ Figma, chỉ cần upload ảnh vào chat và nói muốn thay ở đâu — mình tích hợp trực tiếp vào code.
