import fs from 'node:fs';
import path from 'node:path';

/**
 * Large text: nothing is cut and a ceiling is a role, not a number (TEXT_CAP in
 * src/theme/text-scale.ts). Three habits break that: a numeric maxFontSizeMultiplier, a one-line
 * numberOfLines, and adjustsFontSizeToFit, which shrinks one label away from its neighbours. The
 * files below still have some; each count may only go down, and a file not listed may have none.
 * Lower a count in the same change that removes a site.
 */

const SRC = path.join(__dirname, '..');

type Counts = [multiplier: number, oneLine: number, shrinkToFit: number];

const ALLOWED: Record<string, Counts> = {
  'app/(tabs)/settings.tsx': [1, 0, 0],
  'app/add-account.tsx': [5, 0, 0],
  'app/add-card.tsx': [2, 0, 0],
  'app/add-receipt.tsx': [2, 0, 0],
  'app/avatar.tsx': [1, 1, 0],
  'app/bill-plans.tsx': [2, 0, 0],
  'app/change-logo.tsx': [7, 0, 0],
  'app/contact.tsx': [5, 0, 0],
  'app/faq.tsx': [2, 0, 0],
  'app/loan-schedule.tsx': [7, 1, 0],
  'app/login.tsx': [2, 0, 0],
  'app/notifications.tsx': [5, 0, 0],
  'app/receipts.tsx': [3, 0, 0],
  'app/reminders.tsx': [13, 3, 0],
  'app/save-loan.tsx': [3, 0, 0],
  'app/savings-month.tsx': [6, 0, 0],
  'app/setup.tsx': [3, 0, 0],
  'app/subscription-plans.tsx': [2, 0, 0],
  'app/verify-otp.tsx': [1, 0, 0],
  'app/voice.tsx': [4, 0, 0],
  'components/flow/amount-figure.tsx': [0, 1, 0],
  'components/navigation/skip-tab-bar.tsx': [1, 1, 1],
  'components/transactions/flow-chart.tsx': [0, 1, 0],
  'components/ui/calculator-pad.tsx': [2, 2, 0],
};

/** Moved onto TEXT_CAP and the fit groups; they must stay off the list. */
const ADOPTED = [
  'app/(tabs)/cards.tsx',
  'app/(tabs)/home.tsx',
  'app/(tabs)/transactions.tsx',
  'app/bills.tsx',
  'app/insights.tsx',
  'app/loan-calculator.tsx',
  'app/pro-feature.tsx',
  'app/salary.tsx',
  'app/savings.tsx',
  'app/source/[id].tsx',
  'app/subscriptions.tsx',
  'app/voice-edit.tsx',
  'app/voice-review.tsx',
  'components/app-lock-gate.tsx',
  'components/bills/bill-filter-sheet.tsx',
  'components/bills/bill-row.tsx',
  'components/bills/category-picker.tsx',
  'components/brands/brand-field.tsx',
  'components/brands/brand-logo.tsx',
  'components/brands/logo-choices.tsx',
  'components/calculators/proportion-bar.tsx',
  'components/calculators/schedule-card.tsx',
  'components/calculators/slider-row.tsx',
  'components/cards/card-face.tsx',
  'components/cards/network-picker.tsx',
  'components/dashboard/balance-summary.tsx',
  'components/dashboard/dashboard-header.tsx',
  'components/dashboard/date-selector.tsx',
  'components/dashboard/destination-list.tsx',
  'components/dashboard/getting-started-card.tsx',
  'components/dashboard/insight-banner.tsx',
  'components/dashboard/quick-actions.tsx',
  'components/dashboard/tool-cards.tsx',
  'components/dashboard/transaction-row.tsx',
  'components/flow/inline-calendar.tsx',
  'components/flow/step-flow.tsx',
  'components/plans/plan-detail.tsx',
  'components/receipts/receipt-filter-sheet.tsx',
  'components/receipts/receipt-row.tsx',
  'components/settings/settings-row.tsx',
  'components/setup/setup-collection.tsx',
  'components/subscriptions/subscription-filter-sheet.tsx',
  'components/subscriptions/subscription-row.tsx',
  'components/transactions/filter-sheet.tsx',
  'components/transactions/ledger-row.tsx',
  'components/transactions/ledger-summary.tsx',
  'components/ui/action-pill.tsx',
  'components/ui/amount-pad.tsx',
  'components/ui/amount-tile.tsx',
  'components/ui/button.tsx',
  'components/ui/choice-chips.tsx',
  'components/ui/confirm-dialog.tsx',
  'components/ui/date-group-header.tsx',
  'components/ui/date-picker.tsx',
  'components/ui/filter-actions.tsx',
  'components/ui/fit-group.tsx',
  'components/ui/legal-document.tsx',
  'components/ui/multi-choice-chips.tsx',
  'components/ui/otp-input.tsx',
  'components/ui/page-header.tsx',
  'components/ui/page-state.tsx',
  'components/ui/range-dropdown.tsx',
  'components/ui/reminder-field.tsx',
  'components/ui/search-field.tsx',
  'components/ui/select-field.tsx',
  'components/ui/source-tiles.tsx',
  'components/ui/text-field.tsx',
  'components/ui/text-link.tsx',
  'components/ui/time-picker.tsx',
  'components/ui/toggle-pill.tsx',
  'components/ui/typography.tsx',
  'components/voice/voice-hints.tsx',
];

const RULES = [
  /maxFontSizeMultiplier\s*(?:=\s*\{\s*|:\s*)[\d.]+/g,
  /numberOfLines\s*(?:=\s*\{\s*|:\s*)1(?![\d.])/g,
  /\badjustsFontSizeToFit\b/g,
];

/** Comments may name the habits; only code counts. `://` in a URL is not a comment. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function countHabits(source: string): Counts {
  const text = code(source);
  return RULES.map((rule) => text.match(rule)?.length ?? 0) as Counts;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

const posix = (file: string) => path.relative(SRC, file).split(path.sep).join('/');
const COUNTS = new Map(
  sourceFiles(SRC).map((file) => [posix(file), countHabits(fs.readFileSync(file, 'utf8'))]),
);
const NAMES = ['numeric maxFontSizeMultiplier', 'numberOfLines={1}', 'adjustsFontSizeToFit'];

describe('countHabits', () => {
  it('counts each habit in JSX and in style objects', () => {
    const source = [
      '<Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit>a</Text>',
      '<Text maxFontSizeMultiplier={ 2 } numberOfLines={ 1 }>b</Text>',
      'const props = { maxFontSizeMultiplier: 1.2, numberOfLines: 1 };',
    ].join('\n');
    expect(countHabits(source)).toEqual([3, 3, 1]);
  });

  it('leaves role ceilings, wider line limits and comments alone', () => {
    const source = [
      '<Text maxFontSizeMultiplier={TEXT_CAP.row} numberOfLines={2}>a</Text>',
      '<Text numberOfLines={12}>b</Text>',
      '// numberOfLines={1} used to cut this; adjustsFontSizeToFit shrank it',
      '/* maxFontSizeMultiplier={1.4} */',
      "const url = 'https://example.com';",
    ].join('\n');
    expect(countHabits(source)).toEqual([0, 0, 0]);
  });
});

describe('large text guard', () => {
  it('lets no file gain a numeric ceiling, a one-line cut or a shrink-to-fit', () => {
    const over: string[] = [];
    for (const [file, counts] of COUNTS) {
      const allowed = ALLOWED[file] ?? [0, 0, 0];
      counts.forEach((count, i) => {
        if (count > allowed[i]) over.push(`${file}: ${count} ${NAMES[i]}, allowed ${allowed[i]}`);
      });
    }
    expect(over).toEqual([]);
  });

  it('lowers the allowance as sites go, so the list only shrinks', () => {
    const stale: string[] = [];
    for (const [file, allowed] of Object.entries(ALLOWED)) {
      const counts = COUNTS.get(file);
      if (!counts) {
        stale.push(`${file}: no longer exists, remove its entry`);
        continue;
      }
      counts.forEach((count, i) => {
        if (count < allowed[i]) stale.push(`${file}: lower ${NAMES[i]} to ${count}`);
      });
    }
    expect(stale).toEqual([]);
  });

  it('keeps the adopted files clean', () => {
    for (const file of ADOPTED) {
      expect(ALLOWED[file]).toBeUndefined();
      expect([file, COUNTS.get(file)]).toEqual([file, [0, 0, 0]]);
    }
  });
});
