# Desktop workspace, auto-paid sessions, and legacy-data compatibility

## Goal

Improve the desktop layout and make newly created lessons match the owner's
workflow: a created lesson is immediately completed and paid, contributes to
lesson and income totals, and can be generated across a selected fixed-date
recurrence range. Existing Supabase data must remain usable without reset or
manual re-entry.

## Decisions

- Desktop uses a persistent left sidebar, a compact desktop top bar, and a
  constrained two-column content layout at wide breakpoints. Mobile navigation
  remains unchanged.
- New sessions default to `status = 'completed'` and `paid = true`. The detail
  sheet still permits changing either value later.
- New sessions keep a fee snapshot in `fee_amount`, so historical totals do not
  change when a student's current fee changes.
- Recurring sessions are materialized for the selected start/end range using
  the existing daily, weekly, and monthly options. They share a `series_id`
  and remain independently editable/deletable.
- Existing sessions and payment flags are not rewritten automatically. The
  idempotent migration only adds missing columns/defaults; legacy rows remain
  visible and editable.
- The current account's existing data is used immediately after deployment;
  no import, reset, or re-seeding flow is introduced.

## Data flow

1. The add-session form generates one or more dates from the selected range.
2. The app passes `completed` and `paid` explicitly for every new row.
3. The Store preserves those values and the fee snapshot when inserting.
4. Dashboard/student totals already derive completed sessions and paid flags,
   so the new row appears in both counts and collected-income totals after the
   existing refresh.
5. Legacy rows continue to use their current status/payment values.

## Acceptance criteria

- On desktop width, sidebar/navigation/content do not collapse into the
  mobile layout and the dashboard has a balanced readable composition.
- Creating one lesson shows `Hoàn thành`, `Đã thanh toán`, increments the
  completed count, and increments collected income by the fee snapshot.
- Creating a daily/weekly/monthly range creates every inclusive occurrence,
  keeps the series controls working, and does not create dates outside the
  selected end date.
- Existing records remain unchanged and are visible immediately after the
  update; missing optional schema fields are added idempotently.
- Tests cover the new creation flags and existing recurrence/payment helpers;
  syntax checks and a local browser smoke test pass.
