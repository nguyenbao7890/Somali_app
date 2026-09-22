import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRecurringDates,
  selectOutstandingCompletedSessions,
  sumSessionFees,
  buildPaymentQrUrl,
} from '../js/session-domain.mjs';

test('builds inclusive weekly dates without dates after the end', () => {
  assert.deepEqual(buildRecurringDates({
    startDate: '2026-09-01', endDate: '2026-09-22', frequency: 'weekly',
  }), ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22']);
});

test('builds daily dates inclusively and monthly dates clamp month ends', () => {
  assert.deepEqual(buildRecurringDates({
    startDate: '2026-02-27', endDate: '2026-03-01', frequency: 'daily',
  }), ['2026-02-27', '2026-02-28', '2026-03-01']);
  assert.deepEqual(buildRecurringDates({
    startDate: '2026-01-31', endDate: '2026-04-30', frequency: 'monthly',
  }), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
});

test('rejects invalid recurrence input and removes duplicate generated dates', () => {
  assert.deepEqual(buildRecurringDates({
    startDate: '2026-09-10', endDate: '2026-09-01', frequency: 'weekly',
  }), []);
  assert.deepEqual(buildRecurringDates({
    startDate: '2026-09-10', endDate: '2026-09-10', frequency: 'none',
  }), ['2026-09-10']);
});

test('selects only completed unpaid sessions for the requested student', () => {
  const sessions = [
    { studentId: 'a', status: 'completed', paid: false, feeAmount: 100 },
    { studentId: 'a', status: 'completed', paid: true, feeAmount: 200 },
    { studentId: 'a', status: 'scheduled', paid: false, feeAmount: 300 },
    { studentId: 'a', status: 'cancelled', paid: false, feeAmount: 400 },
    { studentId: 'b', status: 'completed', paid: false, feeAmount: 500 },
  ];
  const selected = selectOutstandingCompletedSessions(sessions, 'a');
  assert.equal(selected.length, 1);
  assert.equal(sumSessionFees(selected, 0), 100);
});

test('builds a clean VietQR URL from current payment settings', () => {
  assert.equal(
    buildPaymentQrUrl({ bank: 'MB', accountNumber: '0976406248', accountName: 'NGUYEN THI THU HUONG' }),
    'https://img.vietqr.io/image/MB-0976406248-compact2.png?accountName=NGUYEN%20THI%20THU%20HUONG'
  );
  assert.equal(buildPaymentQrUrl({ bank: '', accountNumber: '' }), null);
});
