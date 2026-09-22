function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildRecurringDates({ startDate, endDate, frequency = 'none' }) {
  const start = parseDate(startDate);
  const end = parseDate(endDate || startDate);
  if (!start || !end || start > end || !['none', 'daily', 'weekly', 'monthly'].includes(frequency)) return [];
  if (frequency === 'none') return [formatDate(start)];

  const dates = [];
  const cursor = new Date(start);
  const originalDay = start.getDate();
  while (cursor <= end) {
    const value = formatDate(cursor);
    if (!dates.includes(value)) dates.push(value);
    if (frequency === 'daily') cursor.setDate(cursor.getDate() + 1);
    if (frequency === 'weekly') cursor.setDate(cursor.getDate() + 7);
    if (frequency === 'monthly') {
      const nextMonth = cursor.getMonth() + 1;
      cursor.setDate(1);
      cursor.setMonth(nextMonth);
      const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      cursor.setDate(Math.min(originalDay, lastDay));
    }
  }
  return dates;
}

export function selectOutstandingCompletedSessions(sessions, studentId) {
  return sessions.filter((session) =>
    session.studentId === studentId && session.status === 'completed' && !session.paid
  );
}

export function sumSessionFees(sessions, fallbackFee = 0) {
  return sessions.reduce((sum, session) => sum + Number(session.feeAmount ?? fallbackFee ?? 0), 0);
}

export function buildPaymentQrUrl(settings) {
  if (!settings?.bank || !settings?.accountNumber) return null;
  return `https://img.vietqr.io/image/${encodeURIComponent(settings.bank)}-${encodeURIComponent(settings.accountNumber)}-compact2.png?accountName=${encodeURIComponent(settings.accountName || '')}`;
}

if (typeof window !== 'undefined') {
  window.SomaliSessionDomain = {
    buildRecurringDates,
    selectOutstandingCompletedSessions,
    sumSessionFees,
    buildPaymentQrUrl,
  };
}
