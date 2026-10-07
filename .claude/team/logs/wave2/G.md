# Wave 2, area G (ui components): log

## 2026-10-07 — Dana (agent G) — shared components onto the message system

**Outcome:** Done. Every word the shared components write themselves (defaults, accessibility
labels, picker chrome) goes through t(); English is unchanged character for character. The old
English `MONTHS_SHORT`, `WEEKDAYS_SHORT` and `WEEKDAY_INITIALS` are deleted from `src/lib/date.ts`
(nothing in src imports them any more).

**What changed**
- `src/i18n/messages/ui.ts`: 42 `ui.*` keys (dialog, back, flow chrome, calendar, date and time
  pickers, fields, search, select, skeleton, range dropdown, reminder field, card colour names).
- Reused: `common.cancel/ok/next/back/close/yes/tryAgain`, `dates.today`.
- Converted: `flow/inline-calendar.tsx`, `flow/step-flow.tsx`, `ui/back-button.tsx`,
  `ui/color-picker.tsx`, `ui/confirm-dialog.tsx`, `ui/date-picker.tsx`, `ui/otp-input.tsx`,
  `ui/range-dropdown.tsx`, `ui/reminder-field.tsx`, `ui/search-field.tsx`, `ui/select-field.tsx`,
  `ui/skeleton.tsx`, `ui/text-field.tsx`, `ui/time-picker.tsx`. The other files on the list had no
  text of their own.
- Month and weekday names come from `@/i18n/calendar`; the date picker header uses `formatFullDate`.
- `ConfirmDialog` calls `useLocale()`: the dialog host renders it at the root, outside the screens'
  remount.
- Colour names are mapped from the swatch id in color-picker; the stored hex and
  `CARD_COLORS.label` (src/theme, not mine) are untouched.
- Spanish "a la 1:30" / "a las 2:30" picked by passing the clock hour as the plural count.
- Tests: `src/__tests__/components/ui-pickers-language.test.tsx`, `ui-dialogs-language.test.tsx`,
  `ui-fields-language.test.tsx` (es and fr, no raw keys, no `{param}`, stored values identical).
- No large-text site added or removed.

**Open questions**
- `src/providers/dialog-provider.tsx` (no owner in wave 2): `useConfirm` still defaults
  `cancelLabel` to the literal `'Cancel'`; it should be `t('common.cancel')`.
- The time picker keeps a 12-hour dial with a.m./p.m. in French, while French times elsewhere are
  24-hour ("20 h 00"). A 24-hour dial for French is a design change.
- The inline calendar's month header keeps `numberOfLines={1}`; "septiembre de 2026" may end in "…"
  on a small phone at the largest text size.
