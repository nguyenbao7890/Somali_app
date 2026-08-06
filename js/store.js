/* ===== Somali - Data store (Supabase: database thật, đồng bộ đa thiết bị) ===== */

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function mapStudent(row) {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject || '',
    phone: row.phone || '',
    feePerSession: Number(row.fee_per_session) || 0,
    createdAt: row.created_at,
  };
}
function mapSession(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    time: row.time,
    status: row.status,
    paid: !!row.paid,
    feeAmount: row.fee_amount == null ? null : Number(row.fee_amount),
    note: row.note || '',
  };
}
function mapNote(row) {
  return { id: row.id, studentId: row.student_id, month: row.month, text: row.text || '' };
}

const Store = {
  userId: null,
  _onChangeCallbacks: [],

  /* ---------- Auth ---------- */
  async getSession() {
    const { data } = await supabaseClient.auth.getSession();
    this.userId = data.session ? data.session.user.id : null;
    return data.session;
  },
  async signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (!error && data.user) this.userId = data.user.id;
    return { data, error };
  },
  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (!error && data.user) this.userId = data.user.id;
    return { data, error };
  },
  async signOut() {
    await supabaseClient.auth.signOut();
    this.userId = null;
  },
  async getUser() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    return data.user;
  },
  async updateProfile({ displayName, avatarUrl, password }) {
    const payload = { data: { display_name: displayName, avatar_url: avatarUrl } };
    if (password) payload.password = password;
    const { data, error } = await supabaseClient.auth.updateUser(payload);
    if (error) throw error;
    return data.user;
  },
  onAuthStateChange(cb) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      this.userId = session ? session.user.id : null;
      cb(event, session);
    });
  },

  /* ---------- Realtime: gọi cb() mỗi khi có thay đổi từ thiết bị khác ---------- */
  subscribeRealtime(cb) {
    supabaseClient
      .channel('somali-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, cb)
      .subscribe();
  },

  /* ---------- Students ---------- */
  async getStudents() {
    const { data, error } = await supabaseClient.from('students').select('*').order('name');
    if (error) { console.error(error); return []; }
    return data.map(mapStudent);
  },
  async getStudent(id) {
    const { data, error } = await supabaseClient.from('students').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapStudent(data);
  },
  async addStudent(input) {
    const row = {
      user_id: this.userId,
      name: input.name.trim(),
      subject: input.subject || '',
      phone: input.phone || '',
      fee_per_session: Number(input.feePerSession) || 0,
    };
    const { data, error } = await supabaseClient.from('students').insert(row).select().single();
    if (error) throw error;
    return mapStudent(data);
  },
  async updateStudent(id, patch) {
    const row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.subject !== undefined) row.subject = patch.subject;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.feePerSession !== undefined) row.fee_per_session = Number(patch.feePerSession);
    const { data, error } = await supabaseClient.from('students').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapStudent(data);
  },
  async deleteStudent(id) {
    const { error } = await supabaseClient.from('students').delete().eq('id', id);
    if (error) throw error;
  },

  /* ---------- Sessions ---------- */
  async getSessions() {
    const { data, error } = await supabaseClient.from('sessions').select('*').order('date').order('time');
    if (error) { console.error(error); return []; }
    return data.map(mapSession);
  },
  async getSessionsByDate(dateStr) {
    const { data, error } = await supabaseClient.from('sessions').select('*').eq('date', dateStr).order('time');
    if (error) { console.error(error); return []; }
    return data.map(mapSession);
  },
  async getSessionsByStudent(studentId) {
    const { data, error } = await supabaseClient
      .from('sessions').select('*').eq('student_id', studentId).order('date').order('time');
    if (error) { console.error(error); return []; }
    return data.map(mapSession);
  },
  async getSessionsByMonth(yyyyMm) {
    const [year, month] = yyyyMm.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const { data, error } = await supabaseClient
      .from('sessions').select('*').gte('date', yyyyMm + '-01').lt('date', nextMonth).order('date').order('time');
    if (error) { console.error(error); return []; }
    return data.map(mapSession);
  },
  async getSessionsInRange(fromDate, toDate) {
    const { data, error } = await supabaseClient
      .from('sessions').select('*').gte('date', fromDate).lte('date', toDate).order('date').order('time');
    if (error) { console.error(error); return []; }
    return data.map(mapSession);
  },
  async addSession(input) {
    const student = await this.getStudent(input.studentId);
    if (!student) throw new Error('Không tìm thấy học sinh để tạo buổi học.');
    const row = {
      user_id: this.userId,
      student_id: input.studentId,
      date: input.date,
      time: input.time || '00:00',
      status: input.status || 'scheduled',
      paid: !!input.paid,
      fee_amount: student.feePerSession,
      note: input.note || '',
    };
    const { data, error } = await supabaseClient.from('sessions').insert(row).select().single();
    if (error) throw error;
    return mapSession(data);
  },
  async updateSession(id, patch) {
    const row = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.paid !== undefined) row.paid = patch.paid;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.time !== undefined) row.time = patch.time;
    if (patch.note !== undefined) row.note = patch.note;
    if (patch.status === 'scheduled' || patch.date !== undefined || patch.time !== undefined) row.reminder_sent = false;
    const { data, error } = await supabaseClient.from('sessions').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapSession(data);
  },
  async deleteSession(id) {
    const { error } = await supabaseClient.from('sessions').delete().eq('id', id);
    if (error) throw error;
  },

  /* ---------- Monthly notes ---------- */
  async getNote(studentId, yyyyMm) {
    const { data, error } = await supabaseClient
      .from('notes').select('*').eq('student_id', studentId).eq('month', yyyyMm).maybeSingle();
    if (error || !data) return null;
    return mapNote(data);
  },
  async getNotesByStudent(studentId) {
    const { data, error } = await supabaseClient
      .from('notes').select('*').eq('student_id', studentId).order('month', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(mapNote);
  },
  async saveNote(studentId, yyyyMm, text) {
    const existing = await this.getNote(studentId, yyyyMm);
    if (existing) {
      const { data, error } = await supabaseClient
        .from('notes').update({ text }).eq('id', existing.id).select().single();
      if (error) throw error;
      return mapNote(data);
    }
    const { data, error } = await supabaseClient
      .from('notes').insert({ user_id: this.userId, student_id: studentId, month: yyyyMm, text }).select().single();
    if (error) throw error;
    return mapNote(data);
  },

  /* ---------- Push subscriptions (thông báo đẩy khi tắt app) ---------- */
  async savePushSubscription(sub) {
    const row = {
      user_id: this.userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    };
    const { error } = await supabaseClient
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });
    if (error) throw error;
  },
  async removePushSubscription(endpoint) {
    const { error } = await supabaseClient.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) throw error;
  },

  /* ---------- Cài đặt nhắc lịch (lưu server để Edge Function đọc được) ---------- */
  async getUserSettings() {
    const { data, error } = await supabaseClient
      .from('user_settings').select('*').eq('user_id', this.userId).maybeSingle();
    if (error || !data) return { remindersEnabled: false, reminderMinutes: 30 };
    return { remindersEnabled: !!data.reminders_enabled, reminderMinutes: data.reminder_minutes || 30 };
  },
  async saveUserSettings({ remindersEnabled, reminderMinutes }) {
    const row = {
      user_id: this.userId,
      reminders_enabled: remindersEnabled,
      reminder_minutes: reminderMinutes,
    };
    const { error } = await supabaseClient.from('user_settings').upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
  },

  /* ---------- Derived / stats ---------- */
  async monthIncome(yyyyMm) {
    const sessions = (await this.getSessionsByMonth(yyyyMm)).filter((s) => s.status === 'completed');
    const students = await this.getStudents();
    return sessions.reduce((sum, s) => {
      const st = students.find((x) => x.id === s.studentId);
      return sum + (s.feeAmount ?? (st ? st.feePerSession : 0));
    }, 0);
  },
  async studentBalance(studentId) {
    const student = await this.getStudent(studentId);
    if (!student) return { owed: 0, sessions: 0 };
    const sessions = (await this.getSessionsByStudent(studentId)).filter((s) => s.status === 'completed' && !s.paid);
    return {
      owed: sessions.reduce((sum, session) => sum + (session.feeAmount ?? student.feePerSession), 0),
      sessions: sessions.length,
    };
  },
  async allOwedStudents() {
    const students = await this.getStudents();
    const results = [];
    for (const st of students) {
      const balance = await this.studentBalance(st.id);
      if (balance.owed > 0) results.push({ student: st, ...balance });
    }
    return results.sort((a, b) => b.owed - a.owed);
  },
};
