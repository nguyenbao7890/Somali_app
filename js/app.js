/* ===== Somali - App logic ===== */

const state = {
  view: 'dashboard',
  calMonth: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
  calSelectedDate: todayStr(),
  studentSearch: '',
  currentStudentId: null,
  currentStudentNoteMonth: null,
};

const PREF_KEYS = {
  remindersOn: 'somali_pref_reminders_on',
  reminderMinutes: 'somali_pref_reminder_minutes',
};
const notifiedToday = new Set(); // tránh nhắc lặp lại trong 1 phiên dùng app
let userSettingsCache = { remindersEnabled: false, reminderMinutes: 30 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function fmtVND(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_LABELS = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

function fmtDateVN(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTH_LABELS[m - 1]}`;
}
function shortName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1];
}
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
}
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}
function friendlyError(err) {
  console.error(err);
  if (!navigator.onLine) return 'Không có kết nối mạng. Vui lòng kiểm tra lại.';
  return 'Có lỗi xảy ra, vui lòng thử lại.';
}

/* ================= AUTH ================= */
let authMode = 'signin';

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-tab-signin').classList.toggle('active', mode === 'signin');
  document.getElementById('auth-tab-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('auth-submit-btn').textContent = mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản';
  document.getElementById('auth-error').classList.remove('show');
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.remove('show');

  if (!email || !password) {
    errEl.textContent = 'Vui lòng nhập đầy đủ email và mật khẩu.';
    errEl.classList.add('show');
    return;
  }
  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

  try {
    const result = authMode === 'signin'
      ? await Store.signIn(email, password)
      : await Store.signUp(email, password);

    if (result.error) {
      errEl.textContent = translateAuthError(result.error.message);
      errEl.classList.add('show');
      btn.disabled = false;
      setAuthMode(authMode);
      return;
    }

    if (authMode === 'signup' && result.data.user && !result.data.session) {
      showToast('Kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.');
      setAuthMode('signin');
      btn.disabled = false;
      return;
    }

    await bootApp();
  } catch (e) {
    errEl.textContent = friendlyError(e);
    errEl.classList.add('show');
    btn.disabled = false;
    setAuthMode(authMode);
  }
}

function translateAuthError(msg) {
  if (/already registered/i.test(msg)) return 'Email này đã được đăng ký. Hãy đăng nhập thay vì đăng ký.';
  if (/invalid login|invalid credentials/i.test(msg)) return 'Sai email hoặc mật khẩu.';
  if (/email not confirmed/i.test(msg)) return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư trước khi đăng nhập.';
  if (/password/i.test(msg) && /least/i.test(msg)) return 'Mật khẩu cần ít nhất 6 ký tự.';
  return msg;
}

async function signOut() {
  await Store.signOut();
  document.getElementById('app-shell-root').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('fab-add').style.display = 'none';
  closeSettingsSheet();
}

/* ================= Navigation ================= */
function navigate(view) {
  if (!view) return;
  state.view = view;
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach((n) => {
    n.classList.toggle('active', n.dataset.view === view);
  });
  if (view === 'dashboard') renderDashboard();
  if (view === 'calendar') renderCalendar();
  if (view === 'students') renderStudents();
}

/* ================= Dashboard ================= */
async function renderDashboard() {
  const today = todayStr();
  const [todaySessions, students, income, owedList] = await Promise.all([
    Store.getSessionsByDate(today),
    Store.getStudents(),
    Store.monthIncome(today.slice(0, 7)),
    Store.allOwedStudents(),
  ]);

  document.getElementById('dash-today-count').textContent = todaySessions.filter((s) => s.status !== 'cancelled').length;
  document.getElementById('dash-student-count').textContent = students.length;
  document.getElementById('dash-income').textContent = fmtVND(income);

  const list = document.getElementById('dash-today-list');
  list.innerHTML = '';
  if (todaySessions.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="mascot-wrap">${mascotSvg('sleepy', 76)}</div><p>Hôm nay chưa có buổi học nào.</p></div>`;
  } else {
    todaySessions.forEach((s) => {
      const student = students.find((x) => x.id === s.studentId);
      list.appendChild(sessionRowEl(s, student));
    });
  }

  const owedEl = document.getElementById('dash-owed-list');
  owedEl.innerHTML = '';
  if (owedList.length === 0) {
    owedEl.innerHTML = `<div class="empty-state"><div class="mascot-wrap">${mascotSvg('heart', 76)}</div><p>Không có học phí nào còn nợ, tuyệt vời!</p></div>`;
  } else {
    owedList.forEach(({ student, owed }) => {
      const row = document.createElement('div');
      row.className = 'owed-row';
      row.style.cursor = 'pointer';
      row.innerHTML = `<span class="name">${student.name}</span><span class="amount">${fmtVND(owed)}</span>`;
      row.addEventListener('click', () => openStudentDetail(student.id));
      owedEl.appendChild(row);
    });
  }
}

function sessionRowEl(session, student) {
  const row = document.createElement('div');
  row.className = 'session-row';
  row.style.cursor = 'pointer';
  row.innerHTML = `
    <div class="session-time">${session.time}</div>
    <div class="session-info">
      <div class="name">${student ? student.name : 'Học sinh đã xóa'}</div>
      <div class="sub">${student ? student.subject : ''}</div>
    </div>
    <span class="badge ${session.status}">${statusLabel(session.status)}</span>
  `;
  row.addEventListener('click', () => openSessionSheet(session.id));
  return row;
}
function statusLabel(status) {
  return { scheduled: 'Sắp tới', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[status] || status;
}

/* ================= Calendar ================= */
async function renderCalendar() {
  const [year, month] = state.calMonth.split('-').map(Number);
  document.getElementById('cal-month-label').textContent = `${MONTH_LABELS[month - 1]} ${year}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  WEEKDAY_LABELS.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const [sessions, students] = await Promise.all([Store.getSessionsByMonth(state.calMonth), Store.getStudents()]);
  const byDate = {};
  sessions.forEach((s) => {
    (byDate[s.date] = byDate[s.date] || []).push(s);
  });

  for (let i = 0; i < startOffset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'cal-day';
    if (dateStr === todayStr()) el.classList.add('today');
    if (dateStr === state.calSelectedDate) el.classList.add('selected');

    const daySessions = (byDate[dateStr] || []).sort((a, b) => a.time.localeCompare(b.time));
    let chipsHtml = '<div class="cal-day-events">';
    daySessions.slice(0, 2).forEach((s) => {
      const st = students.find((x) => x.id === s.studentId);
      const label = st ? `${s.time} ${shortName(st.name)}` : s.time;
      chipsHtml += `<div class="cal-event-chip ${s.status}">${label}</div>`;
    });
    if (daySessions.length > 2) {
      chipsHtml += `<div class="cal-event-more">+${daySessions.length - 2} khác</div>`;
    }
    chipsHtml += '</div>';

    el.innerHTML = `<div class="cal-day-num">${day}</div>${chipsHtml}`;
    el.addEventListener('click', () => {
      state.calSelectedDate = dateStr;
      renderCalendar();
    });
    grid.appendChild(el);
  }

  renderCalDayList();
}

async function renderCalDayList() {
  const label = document.getElementById('cal-day-label');
  label.textContent = `Buổi học ngày ${fmtDateVN(state.calSelectedDate)}`;
  const list = document.getElementById('cal-day-list');
  list.innerHTML = '<div class="empty-state">Đang tải...</div>';
  const [sessions, students] = await Promise.all([Store.getSessionsByDate(state.calSelectedDate), Store.getStudents()]);
  list.innerHTML = '';
  if (sessions.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="mascot-wrap">${mascotSvg('sleepy', 76)}</div><p>Chưa có buổi học nào ngày này.</p></div>`;
  } else {
    sessions.forEach((s) => {
      const student = students.find((x) => x.id === s.studentId);
      list.appendChild(sessionRowEl(s, student));
    });
  }
}

function changeMonth(delta) {
  const [year, month] = state.calMonth.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  state.calMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  renderCalendar();
}

/* ================= Students ================= */
async function renderStudents() {
  const list = document.getElementById('students-list');
  list.innerHTML = '<div class="empty-state">Đang tải...</div>';
  const students = (await Store.getStudents()).filter((s) =>
    s.name.toLowerCase().includes(state.studentSearch.toLowerCase())
  );
  list.innerHTML = '';
  if (students.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="mascot-wrap">${mascotSvg('book', 84)}</div><p>Chưa có học sinh nào. Nhấn nút + để thêm.</p></div>`;
    return;
  }
  for (const st of students) {
    const balance = await Store.studentBalance(st.id);
    const row = document.createElement('div');
    row.className = 'student-row';
    row.innerHTML = `
      <div class="avatar">${initials(st.name)}</div>
      <div class="info">
        <div class="name">${st.name}</div>
        <div class="sub">${st.subject || 'Chưa có môn'}</div>
      </div>
      <div class="fee">
        ${balance.owed > 0 ? fmtVND(balance.owed) : 'Đã thanh toán'}
        <span class="small">${balance.sessions > 0 ? balance.sessions + ' buổi chưa thu' : ''}</span>
      </div>
    `;
    row.addEventListener('click', () => openStudentDetail(st.id));
    list.appendChild(row);
  }
}

async function openStudentDetail(studentId) {
  state.currentStudentId = studentId;
  const student = await Store.getStudent(studentId);
  if (!student) return;

  document.getElementById('sd-name').textContent = student.name;
  document.getElementById('sd-subject').textContent = student.subject || 'Chưa có môn học';
  document.getElementById('sd-avatar').textContent = initials(student.name);
  document.getElementById('sd-fee').textContent = fmtVND(student.feePerSession) + ' / buổi';

  document.getElementById('view-students').classList.remove('active');
  document.getElementById('view-student-detail').classList.add('active');

  const [sessions, balance] = await Promise.all([Store.getSessionsByStudent(studentId), Store.studentBalance(studentId)]);
  const reversed = sessions.slice().reverse();
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const completed = completedSessions.length;
  const totalIncome = completedSessions.reduce((sum, s) => sum + (s.feeAmount ?? student.feePerSession), 0);

  document.getElementById('sd-total-sessions').textContent = completed;
  document.getElementById('sd-total-income').textContent = fmtVND(totalIncome);
  document.getElementById('sd-owed').textContent = fmtVND(balance.owed);

  const histList = document.getElementById('sd-history');
  histList.innerHTML = '';
  if (reversed.length === 0) {
    histList.innerHTML = `<div class="empty-state"><div class="mascot-wrap">${mascotSvg('sleepy', 76)}</div><p>Chưa có buổi học nào.</p></div>`;
  } else {
    reversed.slice(0, 20).forEach((s) => {
      const row = document.createElement('div');
      row.className = 'session-row';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="session-time">${fmtDateVN(s.date)}</div>
        <div class="session-info">
          <div class="name">${s.time}</div>
          <div class="sub">${s.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</div>
        </div>
        <span class="badge ${s.status}">${statusLabel(s.status)}</span>
      `;
      row.addEventListener('click', () => openSessionSheet(s.id));
      histList.appendChild(row);
    });
  }

  const yyyyMm = todayStr().slice(0, 7);
  state.currentStudentNoteMonth = yyyyMm;
  document.getElementById('sd-note-month-label').textContent = 'Nhận xét tháng ' + yyyyMm.split('-')[1] + '/' + yyyyMm.split('-')[0];
  const note = await Store.getNote(studentId, yyyyMm);
  document.getElementById('sd-note-text').value = note ? note.text : '';
}

function closeStudentDetail() {
  document.getElementById('view-student-detail').classList.remove('active');
  document.getElementById('view-students').classList.add('active');
  renderStudents();
}

async function saveStudentNote() {
  const text = document.getElementById('sd-note-text').value.trim();
  try {
    await Store.saveNote(state.currentStudentId, state.currentStudentNoteMonth, text);
    showToast('Đã lưu nhận xét');
  } catch (e) {
    showToast(friendlyError(e));
  }
}

async function deleteCurrentStudent() {
  if (!confirm('Xóa học sinh này? Toàn bộ lịch sử buổi học sẽ bị xóa.')) return;
  try {
    await Store.deleteStudent(state.currentStudentId);
    closeStudentDetail();
    showToast('Đã xóa học sinh');
  } catch (e) {
    showToast(friendlyError(e));
  }
}

/* ================= Add student sheet ================= */
function openAddStudentSheet() {
  document.getElementById('as-name').value = '';
  document.getElementById('as-subject').value = '';
  document.getElementById('as-fee').value = '';
  document.getElementById('as-phone').value = '';
  document.getElementById('overlay-add-student').classList.add('open');
}
function closeAddStudentSheet() {
  document.getElementById('overlay-add-student').classList.remove('open');
}
async function submitAddStudent() {
  const name = document.getElementById('as-name').value.trim();
  if (!name) { showToast('Vui lòng nhập tên học sinh'); return; }
  try {
    await Store.addStudent({
      name,
      subject: document.getElementById('as-subject').value.trim(),
      feePerSession: document.getElementById('as-fee').value,
      phone: document.getElementById('as-phone').value.trim(),
    });
    closeAddStudentSheet();
    renderStudents();
    showToast('Đã thêm học sinh mới');
  } catch (e) {
    showToast(friendlyError(e));
  }
}

/* ================= Add session sheet ================= */
async function openAddSessionSheet() {
  const students = await Store.getStudents();
  if (students.length === 0) { showToast('Hãy thêm học sinh trước'); return; }
  const select = document.getElementById('ss-student');
  select.innerHTML = students.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('ss-date').value = state.calSelectedDate || todayStr();
  document.getElementById('ss-time').value = '14:00';
  document.getElementById('overlay-add-session').classList.add('open');
}
function closeAddSessionSheet() {
  document.getElementById('overlay-add-session').classList.remove('open');
}
async function submitAddSession() {
  const studentId = document.getElementById('ss-student').value;
  const date = document.getElementById('ss-date').value;
  const time = document.getElementById('ss-time').value;
  if (!studentId || !date || !time) { showToast('Vui lòng điền đầy đủ thông tin'); return; }
  try {
    await Store.addSession({ studentId, date, time, status: 'scheduled' });
    closeAddSessionSheet();
    state.calSelectedDate = date;
    if (state.view === 'calendar') renderCalendar();
    if (state.view === 'dashboard') renderDashboard();
    showToast('Đã thêm buổi học');
  } catch (e) {
    showToast(friendlyError(e));
  }
}

/* ================= Session detail sheet ================= */
let activeSessionId = null;
let activeSessionCache = null;

async function openSessionSheet(sessionId) {
  activeSessionId = sessionId;
  const all = await Store.getSessions();
  const session = all.find((s) => s.id === sessionId);
  if (!session) return;
  activeSessionCache = session;
  const student = await Store.getStudent(session.studentId);

  document.getElementById('sh-student-name').textContent = student ? student.name : 'Học sinh đã xóa';
  document.getElementById('sh-datetime').textContent = `${fmtDateVN(session.date)} · ${session.time}`;
  document.getElementById('sh-status').value = session.status;
  document.getElementById('sh-paid').checked = !!session.paid;

  document.getElementById('overlay-session-detail').classList.add('open');
}
function closeSessionSheet() {
  document.getElementById('overlay-session-detail').classList.remove('open');
  activeSessionId = null;
  activeSessionCache = null;
}
async function saveSessionChanges() {
  if (!activeSessionId) return;
  try {
    await Store.updateSession(activeSessionId, {
      status: document.getElementById('sh-status').value,
      paid: document.getElementById('sh-paid').checked,
    });
    closeSessionSheet();
    refreshCurrentView();
    showToast('Đã cập nhật buổi học');
  } catch (e) {
    showToast(friendlyError(e));
  }
}
async function deleteActiveSession() {
  if (!activeSessionId) return;
  if (!confirm('Xóa buổi học này?')) return;
  try {
    await Store.deleteSession(activeSessionId);
    closeSessionSheet();
    refreshCurrentView();
    showToast('Đã xóa buổi học');
  } catch (e) {
    showToast(friendlyError(e));
  }
}
function refreshCurrentView() {
  if (state.view === 'dashboard') renderDashboard();
  if (state.view === 'calendar') renderCalendar();
  if (document.getElementById('view-student-detail').classList.contains('active') && state.currentStudentId) {
    openStudentDetail(state.currentStudentId);
  }
}

/* ================= Xuất buổi học ra file .ics (nhắc lịch qua app Lịch của điện thoại) ================= */
async function exportSessionToIcs() {
  if (!activeSessionCache) return;
  const student = await Store.getStudent(activeSessionCache.studentId);
  const name = student ? student.name : 'Học sinh';
  const subject = student ? student.subject : '';

  const [y, m, d] = activeSessionCache.date.split('-').map(Number);
  const [hh, mm] = activeSessionCache.time.split(':').map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + 60 * 60000); // mặc định 1 tiếng

  const fmt = (dt) =>
    dt.getFullYear() +
    String(dt.getMonth() + 1).padStart(2, '0') +
    String(dt.getDate()).padStart(2, '0') + 'T' +
    String(dt.getHours()).padStart(2, '0') +
    String(dt.getMinutes()).padStart(2, '0') + '00';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Somali//VN',
    'BEGIN:VEVENT',
    'UID:' + activeSessionCache.id + '@somali',
    'DTSTAMP:' + fmt(new Date()),
    'DTSTART:' + fmt(start),
    'DTEND:' + fmt(end),
    'SUMMARY:Buổi học - ' + name + (subject ? ' (' + subject + ')' : ''),
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Sắp đến buổi học',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buoi-hoc-${name.replace(/\s+/g, '-')}-${activeSessionCache.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Đã tải file — mở file để thêm vào Lịch điện thoại');
}

/* ================= Xuất báo cáo PDF học sinh ================= */
let vnFontRegistered = false;
function registerVietnameseFont(doc) {
  if (!vnFontRegistered) {
    doc.addFileToVFS('Roboto-VN-Regular.ttf', ROBOTO_VN_REGULAR_BASE64);
    doc.addFont('Roboto-VN-Regular.ttf', 'RobotoVN', 'normal');
    doc.addFileToVFS('Roboto-VN-Bold.ttf', ROBOTO_VN_BOLD_BASE64);
    doc.addFont('Roboto-VN-Bold.ttf', 'RobotoVN', 'bold');
    vnFontRegistered = true;
  }
  doc.setFont('RobotoVN', 'normal');
}

async function exportStudentPdfReport() {
  const studentId = state.currentStudentId;
  if (!studentId) return;
  const student = await Store.getStudent(studentId);
  if (!student) return;

  showToast('Đang tạo báo cáo PDF...');

  const [sessions, notes, balance, user] = await Promise.all([
    Store.getSessionsByStudent(studentId),
    Store.getNotesByStudent(studentId),
    Store.studentBalance(studentId),
    Store.getUser(),
  ]);

  if (!window.jspdf?.jsPDF) {
    showToast('Thư viện PDF chưa tải xong. Hãy kiểm tra mạng rồi thử lại.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  if (typeof doc.autoTable !== 'function') {
    showToast('Thư viện bảng PDF chưa tải xong. Hãy kiểm tra mạng rồi thử lại.');
    return;
  }
  registerVietnameseFont(doc);

  const pinkStrong = [212, 83, 126];
  const navy = [27, 58, 92];
  const gray = [110, 110, 110];

  // Header
  doc.setFont('RobotoVN', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...pinkStrong);
  doc.text('Somali', 14, 18);
  doc.setFont('RobotoVN', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...gray);
  doc.text('Báo cáo học sinh', 14, 25);
  doc.setDrawColor(230, 180, 200);
  doc.line(14, 29, 196, 29);

  // Student info
  doc.setFont('RobotoVN', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...navy);
  doc.text(student.name, 14, 40);

  doc.setFont('RobotoVN', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text(`Môn học: ${student.subject || '-'}`, 14, 48);
  doc.text(`Số điện thoại: ${student.phone || '-'}`, 14, 54);
  doc.text(`Học phí / buổi: ${fmtVND(student.feePerSession)}`, 14, 60);

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const completedCount = completedSessions.length;
  const paidTotal = completedSessions.filter((s) => s.paid).reduce((sum, s) => sum + (s.feeAmount ?? student.feePerSession), 0);
  const totalAmount = completedSessions.reduce((sum, s) => sum + (s.feeAmount ?? student.feePerSession), 0);
  const teacher = user?.user_metadata?.display_name || user?.email || '-';
  doc.text(`Tổng số buổi đã học: ${completedCount}`, 115, 48);
  doc.text(`Tổng học phí: ${fmtVND(totalAmount)}`, 115, 54);
  doc.text(`Đã thu: ${fmtVND(paidTotal)}`, 115, 60);
  doc.text(`Còn nợ: ${fmtVND(balance.owed)}`, 115, 66);
  doc.text(`Giáo viên: ${teacher}`, 115, 72);
  doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 115, 78);

  // Sessions table
  const rows = sessions
    .slice()
    .reverse()
    .map((s) => [
      fmtDateVN(s.date) + '/' + s.date.slice(0, 4),
      s.time,
      statusLabel(s.status),
      fmtVND(s.feeAmount ?? student.feePerSession),
      s.paid ? 'Đã thanh toán' : 'Chưa thanh toán',
    ]);

  doc.autoTable({
    startY: 86,
    head: [['Ngày', 'Giờ', 'Trạng thái', 'Số tiền', 'Thanh toán']],
    body: rows.length ? rows : [['Chưa có buổi học nào', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: pinkStrong, fontSize: 9, font: 'RobotoVN', fontStyle: 'bold' },
    styles: { fontSize: 9, textColor: [50, 50, 50], font: 'RobotoVN' },
    alternateRowStyles: { fillColor: [253, 238, 243] },
  });

  // Monthly notes
  let y = doc.lastAutoTable.finalY + 12;
  doc.setFont('RobotoVN', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...navy);
  doc.text('Nhận xét theo tháng', 14, y);
  y += 8;

  doc.setFontSize(10);
  if (notes.length === 0) {
    doc.setFont('RobotoVN', 'normal');
    doc.setTextColor(...gray);
    doc.text('Chưa có nhận xét nào.', 14, y);
  } else {
    notes.forEach((n) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('RobotoVN', 'bold');
      doc.setTextColor(...pinkStrong);
      doc.text(`Tháng ${n.month}`, 14, y);
      doc.setFont('RobotoVN', 'normal');
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(n.text || '(không có nội dung)', 180);
      doc.text(lines, 14, y + 6);
      y += 6 + lines.length * 5 + 6;
    });
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('RobotoVN', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Somali - Trang ${i}/${pageCount}`, 14, 290);
  }

  doc.save(`bao-cao-${slugify(student.name)}.pdf`);
  showToast('Đã tải báo cáo PDF');
}

function removeVietnameseDiacritics(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
function slugify(str) {
  return removeVietnameseDiacritics(str).replace(/\s+/g, '-').toLowerCase();
}

/* ================= Thông báo nhắc lịch học ================= */
function isReminderEnabled() {
  return userSettingsCache.remindersEnabled && Notification.permission === 'granted';
}
function getReminderMinutes() {
  return userSettingsCache.reminderMinutes;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/* Đăng ký nhận thông báo đẩy thật — hoạt động kể cả khi đã đóng app,
   khác với Notification thường (chỉ hoạt động lúc app đang mở). */
async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('Trình duyệt này chưa hỗ trợ thông báo đẩy khi tắt app — vẫn nhắc được lúc app đang mở.');
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await Store.savePushSubscription(sub.toJSON());
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await Store.removePushSubscription(sub.endpoint).catch(() => {});
      await sub.unsubscribe();
    }
  } catch (e) {
    console.error(e);
  }
}

async function sendNotification(title, body) {
  if (navigator.serviceWorker) {
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
      return;
    } catch (e) { /* fallthrough */ }
  }
  new Notification(title, { body, icon: 'icons/icon-192.png' });
}

async function checkUpcomingReminders() {
  if (!isReminderEnabled()) return;
  const minutesBefore = getReminderMinutes();
  const today = todayStr();
  const sessions = await Store.getSessionsByDate(today);
  const now = new Date();

  for (const s of sessions) {
    if (s.status !== 'scheduled') continue;
    const key = s.id;
    if (notifiedToday.has(key)) continue;
    const [hh, mm] = s.time.split(':').map(Number);
    const sessionTime = new Date();
    sessionTime.setHours(hh, mm, 0, 0);
    const diffMin = (sessionTime - now) / 60000;
    if (diffMin > 0 && diffMin <= minutesBefore) {
      const student = await Store.getStudent(s.studentId);
      sendNotification(
        'Sắp đến buổi học',
        `${student ? student.name : 'Học sinh'} lúc ${s.time} (còn ${Math.round(diffMin)} phút)`
      );
      notifiedToday.add(key);
    }
  }
}

/* ================= Settings sheet ================= */
function setProfileAvatar(element, name, avatarUrl) {
  if (!element) return;
  element.replaceChildren();
  if (avatarUrl) {
    const image = document.createElement('img');
    image.src = avatarUrl;
    image.alt = name || 'Ảnh đại diện';
    image.onerror = () => setProfileAvatar(element, name, '');
    element.appendChild(image);
  } else {
    element.textContent = initials(name || 'Tài khoản');
  }
}

function applyProfile(user) {
  const metadata = user?.user_metadata || {};
  const name = metadata.display_name || user?.email?.split('@')[0] || 'Tài khoản';
  const avatarUrl = metadata.avatar_url || '';
  document.getElementById('toolbar-display-name').textContent = name;
  document.getElementById('header-account-name').textContent = name;
  document.getElementById('dashboard-display-name').textContent = name;
  document.getElementById('settings-display-preview').textContent = name;
  setProfileAvatar(document.getElementById('header-avatar'), name, avatarUrl);
  setProfileAvatar(document.getElementById('settings-avatar'), name, avatarUrl);
}

async function openSettingsSheet() {
  const user = await Store.getUser();
  const metadata = user?.user_metadata || {};
  const displayName = metadata.display_name || user?.email?.split('@')[0] || '';
  document.getElementById('settings-email').textContent = user ? user.email : '';
  document.getElementById('settings-display-name').value = displayName;
  document.getElementById('settings-avatar-file').value = '';
  document.getElementById('settings-new-password').value = '';
  applyProfile(user);
  document.getElementById('settings-reminder-toggle').checked = isReminderEnabled();
  document.getElementById('settings-reminder-minutes').value = String(userSettingsCache.reminderMinutes);
  document.getElementById('overlay-settings').classList.add('open');
}
function resizeAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const scale = Math.min(1, size / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => reject(new Error('Không thể đọc ảnh đại diện.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Không thể đọc ảnh đại diện.'));
    reader.readAsDataURL(file);
  });
}
async function saveProfileSettings() {
  const displayName = document.getElementById('settings-display-name').value.trim();
  const file = document.getElementById('settings-avatar-file').files[0];
  const password = document.getElementById('settings-new-password').value;
  if (!displayName) { showToast('Vui lòng nhập tên hiển thị'); return; }
  if (password && password.length < 6) { showToast('Mật khẩu cần ít nhất 6 ký tự'); return; }
  const button = document.getElementById('settings-profile-save');
  button.disabled = true;
  try {
    const currentUser = await Store.getUser();
    const avatarUrl = file ? await resizeAvatar(file) : (currentUser?.user_metadata?.avatar_url || '');
    const user = await Store.updateProfile({ displayName, avatarUrl, password });
    applyProfile(user);
    document.getElementById('settings-new-password').value = '';
    showToast(password ? 'Đã cập nhật tài khoản và mật khẩu' : 'Đã cập nhật tài khoản');
  } catch (e) {
    showToast(translateAuthError(e.message || 'Không thể cập nhật tài khoản'));
  } finally {
    button.disabled = false;
  }
}
function closeSettingsSheet() {
  document.getElementById('overlay-settings').classList.remove('open');
}
async function onReminderToggleChange(checked) {
  const toggleEl = document.getElementById('settings-reminder-toggle');
  if (checked) {
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toggleEl.checked = false;
        showToast('Bạn cần cho phép thông báo để dùng tính năng này');
        return;
      }
    }
    userSettingsCache.remindersEnabled = true;
    const pushOk = await subscribeToPush();
    try {
      await Store.saveUserSettings(userSettingsCache);
    } catch (e) {
      showToast(friendlyError(e));
    }
    showToast(pushOk ? 'Đã bật nhắc lịch học, kể cả khi tắt app' : 'Đã bật nhắc lịch học khi app đang mở');
  } else {
    userSettingsCache.remindersEnabled = false;
    try {
      await Store.saveUserSettings(userSettingsCache);
    } catch (e) {
      showToast(friendlyError(e));
    }
    await unsubscribeFromPush();
    showToast('Đã tắt nhắc lịch học');
  }
}
async function onReminderMinutesChange(value) {
  userSettingsCache.reminderMinutes = Number(value);
  try {
    await Store.saveUserSettings(userSettingsCache);
  } catch (e) {
    showToast(friendlyError(e));
  }
}

/* ================= Decorative background ================= */
function renderDecoBackground() {
  const symbols = ['+', '−', '×', '÷', 'A', 'B', 'C', '?', '7', '3', '9', 'π', '=', 'a²'];
  const colors = ['#F0997B', '#5DCAA5', '#ED93B1', '#F5A623'];
  const container = document.getElementById('deco-bg');
  const count = window.innerWidth < 700 ? 10 : 18;
  let html = '';
  for (let i = 0; i < count; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const top = Math.random() * 96;
    const left = Math.random() * 94;
    const size = 16 + Math.random() * 18;
    html += `<span style="top:${top}%; left:${left}%; font-size:${size}px; color:${color};">${sym}</span>`;
  }
  container.innerHTML = html;
}

/* ================= Boot ================= */
async function bootApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell-root').style.display = 'flex';
  document.getElementById('fab-add').style.display = 'flex';

  renderDecoBackground();
  document.getElementById('greeting-mascot').innerHTML = mascotSvg('wave', 72);
  applyProfile(await Store.getUser());
  navigate('dashboard');

  Store.subscribeRealtime(() => refreshCurrentView());

  try {
    userSettingsCache = await Store.getUserSettings();
  } catch (e) {
    console.error(e);
  }
  if (isReminderEnabled()) {
    subscribeToPush();
  }

  checkUpcomingReminders();
  setInterval(checkUpcomingReminders, 60000);
}

function initStaticListeners() {
  document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
  document.getElementById('cal-prev').addEventListener('click', () => changeMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => changeMonth(1));
  document.getElementById('student-search').addEventListener('input', (e) => {
    state.studentSearch = e.target.value;
    renderStudents();
  });
  document.getElementById('auth-submit-btn').addEventListener('click', submitAuth);
  document.getElementById('auth-tab-signin').addEventListener('click', () => setAuthMode('signin'));
  document.getElementById('auth-tab-signup').addEventListener('click', () => setAuthMode('signup'));

  document.querySelectorAll('.settings-trigger').forEach((btn) => btn.addEventListener('click', openSettingsSheet));
  document.getElementById('settings-reminder-toggle').addEventListener('change', (e) => onReminderToggleChange(e.target.checked));
  document.getElementById('settings-reminder-minutes').addEventListener('change', (e) => onReminderMinutesChange(e.target.value));
  document.getElementById('settings-signout-btn').addEventListener('click', signOut);
  document.getElementById('settings-profile-save').addEventListener('click', saveProfileSettings);
  document.getElementById('settings-avatar-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) showToast('Ảnh đã chọn. Nhấn Lưu thông tin tài khoản để áp dụng.');
  });
  document.getElementById('fab-add').addEventListener('click', () => {
    if (state.view === 'students') openAddStudentSheet();
    else openAddSessionSheet();
  });
  document.querySelectorAll('.notification-trigger').forEach((btn) => btn.addEventListener('click', () => showToast('Bạn chưa có thông báo mới')));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }
}

async function init() {
  initStaticListeners();
  const session = await Store.getSession();
  if (session) {
    await bootApp();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-shell-root').style.display = 'none';
    document.getElementById('fab-add').style.display = 'none';
  }
  document.getElementById('boot-loading').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
