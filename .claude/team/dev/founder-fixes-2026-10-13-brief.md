# Founder fixes for the Loans session: CEO brief (2026-10-13)

From the Founder through Jay ("all as recommended"). Built on top of the logic session's Parts 1–5 commit. Several
other Claude sessions share this tree: touch only the files named here, and message the CEO before any shared file.

## 1. Loans pages keep their last figures on a failed refresh
`/loans` and `/loan/[id]` (and `/loan-payoff` while pricing) must not swap to the failure page when a refresh fails
after data was already read. Use the logic session's shared pieces when they land (don't build your own):
`src/lib/query-state.ts` (`failedEmpty`, `refreshFailed`, `anyRefreshFailed`) and
`src/components/ui/refresh-note.tsx` (`<RefreshNote show />`, key `common.refreshFailed` "Couldn't refresh · showing
your last figures", directly under the main figure card). Only `failedEmpty` shows the failure page.

## 2. Add loan: "APR" → "Interest rate"
The field label (and its VoiceOver label, the Review row, any refusal wording) reads "Interest rate" in en/es/fr, the
calculator's word. Interest is charged at the typed rate (no change to maths). Tell the CEO when it lands (the Ask Sam
session updates its answers).

## 3. Salary
(a) **Recorded pay can be deleted.** Deleting a pay source that has recorded paydays asks the shared question
(`usePastChoice().askDelete`, noun to be agreed: "pays"?): keep past (it stops today; recorded paydays stay in
history) or remove everything (paydays deleted too); toast on every outcome. No paydays → plain confirm.
(b) **A new, incomplete salary is never silently dropped** on Save when the other pays are complete
(`src/app/salary.tsx` ~124-129): Save lists what is missing (one-final-page rule), as other forms do.

## 4. Free scan count
(a) A scan that read nothing (the "Couldn't read this receipt. Fill it in below." case) does not count toward the
free monthly scans. (b) Deleting a scanned receipt does not give the scan back. The count must be server-true (not
only on the phone) if it is enforced server-side today; check `supabase/checks/free_capture_allowance.sql` and the
migrations that define the allowance.

## Rules
en/es/fr; one-failure-message; toasts on every action; comment only the non-obvious why; tests under
`src/__tests__/` or next to lib files; migrations only after Dmitri's review and the Founder's go in the CEO's chat
(number range 2026101310000N for this session); no commits until Dmitri's GO; the Founder tests on the 13 Pro Max in
the single install.
