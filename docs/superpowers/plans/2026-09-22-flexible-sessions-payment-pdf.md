# Flexible Sessions, Bulk Payment, and QR PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make new lessons auto-completed, support editable recurring schedules, settle a student's outstanding completed lessons in one action, and export a current PDF with a clean payment QR.

**Architecture:** Keep the existing vanilla browser app and Supabase Store. Add a small pure scheduling/payment module for deterministic date generation and bulk-payment selection; persist series metadata on independent sessions; keep payment settings in `user_settings`; make PDF export reload all source data and fetch a VietQR image generated from current settings.

**Tech Stack:** Vanilla JavaScript, Supabase Postgres, jsPDF, jsPDF-AutoTable, Node's built-in `node:test` for pure logic.

**Spec:** `docs/superpowers/specs/2026-09-22-flexible-sessions-payment-pdf-design.md`

## Global Constraints

- New sessions default to `completed`, including recurring sessions.
- Existing sessions are not silently migrated from `scheduled`.
- Cancelled sessions are excluded from income and outstanding balance.
- Recurring sessions remain independently editable and deletable.
- PDF export reloads current data at click time.
- Payment QR contains only the QR and account fields, never the supplied full card image.
- No new runtime dependency is required.

## Review Focus

- Month-end dates: monthly recurrence must clamp to valid dates and never produce invalid dates; test in Task 1.
- End-date boundaries: recurrence includes the selected end date and never creates a session after it; test in Task 1.
- Duplicate dates: recurrence must not create duplicate sessions for one generated occurrence; test in Task 1.
- Bulk payment scope: only completed unpaid sessions for the selected student change; test in Task 1 and Task 2.
- QR failure: PDF must still export with text account details when QR fetch fails; test helper behavior in Task 4.

### Task 1: Add pure session domain helpers and tests

**Files:**
- Create: `js/session-domain.mjs`
- Create: `test/session-domain.test.mjs`
- Modify: `index.html` to load the browser-compatible helper before `js/app.js`

**Interfaces:**
- `buildRecurringDates({ startDate, endDate, frequency }) -> string[]`
- `selectOutstandingCompletedSessions(sessions, studentId) -> session[]`
- `sumSessionFees(sessions, fallbackFee) -> number`

- [ ] **Step 1: Write failing tests** for daily, weekly, monthly recurrence, inclusive bounds, invalid input, payment filtering, and fee totals.
- [ ] **Step 2: Run `node --test test/session-domain.test.mjs` and confirm failure because the helper functions are missing.**
- [ ] **Step 3: Implement the smallest pure helpers with local-date-safe `YYYY-MM-DD` parsing and monthly day clamping.**
- [ ] **Step 4: Run the focused test and confirm all cases pass.**
- [ ] **Step 5: Keep the browser surface available through `window.SomaliSessionDomain` without changing existing app behavior.**

### Task 2: Extend schema and Store for editable series, settings, and bulk payment

**Files:**
- Modify: `supabase_schema.sql` in `sessions` and `user_settings` definitions and upgrade statements
- Modify: `js/store.js` mapping, session creation/update, settings, and derived methods

**Interfaces:**
- `mapSession` includes `seriesId` and `seriesFrequency`.
- `Store.addSessions(inputs)` inserts independent sessions sharing a generated `series_id`.
- `Store.updateSessionSeries(seriesId, patch)` updates sessions in the current user's series.
- `Store.deleteSessionSeries(seriesId)` deletes sessions in the current user's series.
- `Store.markStudentSessionsPaid(studentId)` updates only completed unpaid sessions and returns count/total.
- `Store.getPaymentSettings()` and `Store.savePaymentSettings(settings)` read/write payment fields with defaults.

- [ ] **Step 1: Add schema columns `series_id`, `series_frequency`, and payment fields on `user_settings` using idempotent `add column if not exists`; add an index for `series_id`.**
- [ ] **Step 2: Add Store mapping and write failing browser-independent tests for the selection helper already covered by Task 1.**
- [ ] **Step 3: Implement `addSessions`, series update/delete, bulk payment, and payment settings persistence, preserving `fee_amount` snapshots.**
- [ ] **Step 4: Ensure `getUserSettings` and `saveUserSettings` preserve reminder fields while adding payment fields.**
- [ ] **Step 5: Run syntax checks with `node --check js/store.js` and review SQL for idempotency.**

### Task 3: Update add/edit UI for auto-completed and recurring lessons

**Files:**
- Modify: `index.html` add-session sheet, session detail sheet, student detail actions, and settings payment form
- Modify: `js/app.js` add-session flow, session detail flow, series actions, student detail, and settings save/load
- Modify: `css/style.css` only where the new recurrence/payment controls need existing responsive styles

**Interfaces:**
- Add-session form exposes frequency and end date only when frequency is not `none`.
- `submitAddSession` calls `buildRecurringDates` and `Store.addSessions`, with status `completed` for every generated row.
- Session detail offers edit date/time, cancel, delete, and when `seriesId` exists, explicit current-only vs whole-series actions.
- Student detail exposes one bulk-payment button and refreshes balance/history after success.

- [ ] **Step 1: Add UI tests or DOM-level assertions for default status and hidden recurrence end date where the existing static app permits; otherwise add pure form-state tests in `test/session-domain.test.mjs`.**
- [ ] **Step 2: Implement the add-session controls and validation for end date/frequency.**
- [ ] **Step 3: Implement series-aware edits/deletes without making individual sessions immutable.**
- [ ] **Step 4: Add the one-click “Thanh toán tất cả” action scoped to the current student and show the updated balance.**
- [ ] **Step 5: Run `node --check js/app.js` and manually exercise add one, recurring weekly, edit one, cancel one, delete series, and bulk payment through a local server.**

### Task 4: Add configurable QR payment block to current PDF export

**Files:**
- Modify: `js/app.js` PDF export and payment settings handlers
- Modify: `index.html` settings sheet
- Modify: `README.md` setup notes for applying schema and configuring payment details

**Interfaces:**
- `fetchPaymentQrDataUrl(settings) -> Promise<string|null>` creates a VietQR image URL from current settings and converts it to a data URL.
- `drawPaymentBlock(doc, settings, startY) -> number` renders QR plus bank/account/name text without the supplied image.

- [ ] **Step 1: Add a testable QR URL/data fallback helper test for malformed settings and failed fetch.**
- [ ] **Step 2: Implement payment settings defaults and editable fields in Settings.**
- [ ] **Step 3: Update `exportStudentPdfReport` to reload student, sessions, notes, balance, user settings at export time; draw payment block and use current values in totals/table.**
- [ ] **Step 4: Keep PDF output usable if QR fetch fails by rendering the three text fields and a clear “QR không khả dụng” note.**
- [ ] **Step 5: Run PDF generation through a local browser and inspect a generated PDF for updated balance, QR section, Vietnamese text, page breaks, and current export date.**

### Task 5: Full verification and documentation

**Files:**
- Modify: `README.md` with schema migration and behavior notes
- Test: `test/session-domain.test.mjs`

- [ ] **Step 1: Run `node --test test/session-domain.test.mjs`.**
- [ ] **Step 2: Run `node --check js/app.js`, `node --check js/store.js`, and `node --check js/session-domain.mjs`.**
- [ ] **Step 3: Serve the app with `python3 -m http.server 8000` and verify the main flows in a browser.**
- [ ] **Step 4: Re-read the spec and check each acceptance criterion against the implementation and observed output.**
- [ ] **Step 5: Report the exact schema migration step and any environment limitation, especially QR network availability.**

## Execution Notes

This workspace has no `.git` metadata, so commit steps are intentionally omitted. The plan is written for native execution in the current session because the files share the existing global app state and browser UI.
