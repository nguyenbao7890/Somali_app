# Implementation plan: desktop layout and auto-paid fixed schedules

## Files

- `css/style.css`: desktop shell, sidebar, dashboard grid, and responsive
  polish; preserve mobile breakpoints.
- `js/session-domain.mjs`: pure creation-default helper used by app code and
  tests.
- `js/app.js`: pass the new-session defaults for single and recurring rows and
  refresh visible totals.
- `js/store.js`: preserve explicit payment flags and default only newly
  inserted rows to completed/paid when callers omit them.
- `test/session-domain.test.mjs`: regression tests for the new default flags
  and existing recurrence/payment selection.
- `supabase_migrations/20260922_desktop_auto_paid_fixed_schedule.sql`: safe,
  idempotent compatibility migration for existing databases; no row rewrite.
- `README.md`: document the behavior and migration command.

## Task 1: Lock the new creation behavior with tests

1. Add a failing test for `buildNewSessionDefaults()` returning
   `{ status: 'completed', paid: true }` and preserving explicit overrides.
2. Run `node --test test/session-domain.test.mjs`; confirm the failure is due
   to the missing helper.
3. Add the minimal pure helper and rerun the focused test.
4. Run the complete existing domain test file to confirm recurrence and bulk
   payment selection remain covered.

## Task 2: Apply defaults to the creation flow and preserve legacy rows

1. Update `submitAddSession()` to merge the helper into every generated row.
2. Update `Store.addSession()` and `Store.addSessions()` so omitted values on
   new inserts default to completed/paid, while explicit edits still win.
3. Keep `updateSession()` unchanged for existing records and preserve existing
   fee snapshots.
4. Add an idempotent migration that only ensures the existing session/payment
   columns and series columns exist; do not update old rows to paid.
5. Run syntax checks and the domain test suite.

## Task 3: Repair desktop layout

1. Add desktop-only shell rules at `min-width: 860px`: show sidebar, hide
   bottom navigation, align topbar/main content, and give the shell a stable
   max-width with usable horizontal gutters.
2. Add a desktop dashboard grid for stats, today’s sessions, and outstanding
   fees; keep small screens on the current stacked layout.
3. Fix overflow, spacing, z-index, and modal sizing at desktop widths.
4. Use the supplied screenshot as a visual reference: clear hierarchy,
   centered content, readable cards, and no decorative layer obscuring data.

## Task 4: Verify with legacy-data and UI smoke checks

1. Run `node --test test/session-domain.test.mjs`.
2. Run `node --check js/app.js`, `node --check js/store.js`, and
   `node --check js/session-domain.mjs`.
3. Serve the repo with `python3 -m http.server 8000` and inspect desktop and
   mobile breakpoints in a browser.
4. Exercise: add one session, add a weekly range, edit one session, change a
   session back to scheduled/unpaid, and confirm the dashboard updates.
5. Re-read the acceptance criteria and report any environment-only limitation
   such as unavailable Supabase credentials.
