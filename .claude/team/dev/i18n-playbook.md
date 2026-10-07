# Languages and currencies: the playbook

Founder brief, 2026-10-06: Skip Budget supports five currencies (US dollar, British pound,
Canadian dollar, Mexican peso, Australian dollar) and three languages (English, Spanish, French).
Both are chosen in Settings. The defaults come from the phone: a Spanish phone set to Mexico opens
in Spanish and pesos; a French phone set to Canada opens in French and Canadian dollars.

Currency changes how amounts are written. It never converts them: 100 stays 100.

## What exists (src/i18n, already built and tested)

| You need | Use |
|---|---|
| A line of text | `t('area.key')` or `t('area.key', { name })` from `@/i18n` |
| A count ("1 bill", "2 bills") | the message holds `{ one, other }`; call `t('area.key', { count })` |
| Money | `formatCurrency(x)` from `@/lib/format` (already in the language and currency on screen) |
| A rate or a plain figure | `percent(8.14)`, `plainNumber(1234.5)` from `@/i18n` |
| A chart-bar amount | `compactMoney(x)` |
| The mark drawn apart from digits (amount entry) | `currencyMark()` gives `{ symbol, after }`; `numberMarks()` gives `{ decimal, group }` |
| Dates | `formatFullDate`, `formatDayLabel`, `formatDateRange`, `formatRelativeDay`, `formatClock` from `@/lib/date`; month and weekday names from `@/i18n/calendar` |
| Re-render outside a screen (tab bar, dialogs, providers) | call `useLocale()` once in the component |

Adding text: put it in your area's file `src/i18n/messages/<area>.ts` with `defineMessages`. Every
key has `en`, `es` and `fr` side by side; the compiler refuses a missing language. Keys are
`area.screenOrThing.what`. Your area's file is already registered in `messages/index.ts`; do not
edit that file.

Screens already remount when the language or currency changes (a boundary around each screen),
so text built while rendering updates by itself.

## Rules that keep the app stable

1. **Never call `t()` at module scope.** A constant built at import is frozen in the language the
   app opened in. Build the text inside the component or function that renders it. For a
   module-level list of options, either make it a function called during render, or use a lazy
   label: `{ value: 'weekly', get label() { return t('dates.weekly'); } }`.
2. **Never translate a value that is stored, compared, sent or used as an id**: database
   columns, enum values, category ids, frequency values, route names, analytics, deep links.
   Translate only what the person reads. If a screen displays a stored string (a bill category
   saved as text), map it to a message key for display and leave the stored value alone.
3. **Whole sentences with parameters, never glued fragments.** `t('x.paidOn', { date })`, not
   `t('x.paid') + ' ' + date`. Word order differs between the languages.
4. **No `$` or `%` typed into text.** Money goes through `formatCurrency`; a rate through
   `percent`. A `$` hint inside an example sentence ("Netflix $15.99 every month") is an example:
   keep the example's own text as one message.
5. **Parameters are identical in all three languages.** A test enforces it.
6. **Do not change English wording.** The English line is exactly the string that was in the
   code, so existing tests keep passing. Fix an English typo only if you also tell the CEO.
7. **One failure message.** Anything that says `FAILURE_MESSAGE` keeps saying that one line,
   translated once. Form hints, device facts and sign-in refusals keep their own words.
8. **Full pages, no sheets.** Do not add a modal or bottom sheet while you are in here.
9. **Accessibility text counts.** Translate `accessibilityLabel`, `accessibilityHint`,
   placeholders, alert and dialog titles, share messages and tab titles too.
10. **Brand and proper nouns stay**: Skip, Skip Pro, Apple, Face ID, Sentry, merchant names, bank
    names. Units and codes (APR, ISO currency codes) stay.
11. Comments: only the non-obvious why. No history, no names, no dates.

## Tone and glossary

Informal second person: Spanish "tú" (Latin American, Mexican), French "tu" (Canadian). Short,
plain, warm, the way the English is. Sentence case for buttons and titles. Spanish uses `¿ ?`
and `¡ !` properly; French puts a no-break space before `: ; ? ! %` and inside « » (use ` `
in the string, not a normal space).

| English | Español (México) | Français (Canada) |
|---|---|---|
| Skip, Skip Pro | Skip, Skip Pro | Skip, Skip Pro |
| budget | presupuesto | budget |
| bill, bills | factura, facturas | facture, factures |
| receipt, receipts | recibo, recibos | reçu, reçus |
| subscription | suscripción | abonnement |
| account | cuenta | compte |
| card | tarjeta | carte |
| savings | ahorros | épargne |
| salary / income | salario / ingresos | salaire / revenus |
| payday | día de pago | jour de paie |
| loan | préstamo | prêt |
| interest | intereses | intérêts |
| balance | saldo | solde |
| principal | capital | capital |
| payment | pago | paiement |
| due, overdue | vence, vencido | à payer, en retard |
| transactions | movimientos | transactions |
| Activity (tab) | Actividad | Activité |
| Home | Inicio | Accueil |
| Cards (tab) | Tarjetas | Cartes |
| Settings | Ajustes | Réglages |
| reminder | recordatorio | rappel |
| notification | notificación | notification |
| insights | análisis | aperçu |
| net worth | patrimonio neto | valeur nette |
| Save / Cancel / Delete | Guardar / Cancelar / Eliminar | Enregistrer / Annuler / Supprimer |
| Done / Next / Back | Listo / Siguiente / Atrás | Terminé / Suivant / Retour |
| Add / Edit | Agregar / Editar | Ajouter / Modifier |
| Sign in / Sign up / Sign out | Iniciar sesión / Crear cuenta / Cerrar sesión | Se connecter / Créer un compte / Se déconnecter |
| Voice | Voz | Voix |
| Pro (paywall) | Pro | Pro |
| Free | Gratis | Gratuit |
| amount | importe | montant |
| charge (a bill or subscription that went out) | cargo | prélèvement |
| pay (what lands on payday) | salario | paie |
| due date | fecha de vencimiento | date d’échéance |
| Left this month (Home figure, quoted when inside a sentence) | Te queda este mes | Reste ce mois-ci |
| Coming up | Próximos | À venir |
| Insights (page name) | Análisis | Aperçu |
| email (address) | correo | courriel |
| Enter … (form hint) | Ingresa … | Indique … |
| Pick … (form hint) | Elige … | Choisis … |
| store, shop | tienda | magasin |
| passcode | código | code |
| Off (a reminder) | Desactivado | Désactivé |
| overtime | horas extra | heures supplémentaires |
| tax and deductions (pay) | impuestos y deducciones | impôts et retenues |
| statement (bank) | estado de cuenta | relevé |

A term not in the table: choose the plain everyday word a Mexican or Canadian banking app uses,
add a line to this table, and be consistent across every file.

## Verifying your area

1. `npx tsc --noEmit` clean.
2. `rm -rf .expo/cache/eslint` then `npx eslint <your files>` clean.
3. `npx prettier --write <only your files>`; never format the whole repo.
4. `npx jest --ci <your areas' tests>`, then the whole suite once: it must stay green.
5. For each screen you converted, a test that renders it with `setLanguage('es')` and with
   `setLanguage('fr')` (from `@/i18n/store`) and asserts a few translated lines, with no raw key
   (`area.screen.what`) and no leftover `{param}` on screen. Reset with `resetLocaleForTests()` in
   `beforeEach`. Tests for screens live in `src/__tests__/app/`, never in `src/app`.
6. Search your files for English you missed: JSX text, `title=`, `label=`, `placeholder=`,
   `accessibilityLabel=`, `Alert`/dialog calls, template strings with words in them.

## Out of scope for this build

Voice dictation understands English only (the voice screens' own words are translated; the
parser is not). Push notification text comes from the server and stays English. iOS permission
prompts and system buttons stay English until the native localization pass. Auth emails, the
App Store listing and database announcements stay as they are.
