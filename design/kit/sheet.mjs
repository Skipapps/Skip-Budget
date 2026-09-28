// The component sheet: every component in its states on one canvas.
import { layout, place, measure, toHtml, toSvg, color, vstack, hstack, box, text, wrap, spacer, icon, divider } from './render.mjs';
import * as C from './components.mjs';
import { TYPE, ACCENTS, CARD_COLORS } from './tokens.mjs';

const COL = 342;

function section(title, items) {
  return vstack({ gap: 20, w: COL, name: `Sheet/${title}` }, [
    text(title, { size: 13, weight: 600, lineHeight: 18, color: 'muted', transform: 'uppercase', letterSpacing: 0.6 }),
    ...items.flatMap(([label, node]) => [vstack({ gap: 8 }, [text(label, { size: 11, weight: 400, lineHeight: 14, color: 'muted' }), node])]),
  ]);
}

export function sheetSections() {
  const tokens = (names) => wrap({ gap: 8 }, names.map((n) => vstack({ hug: true, gap: 4, align: 'center', w: 62 }, [box({ w: 62, h: 44, radius: 10, fill: n, stroke: 'line' }), text(n, { size: 9, lineHeight: 12, color: 'muted', align: 'center' }, { nowrap: true })])));
  return [
    section('Colour tokens', [
      ['Surface, card, ink, body, muted, line', tokens(['surface', 'card', 'ink', 'body', 'muted', 'line'])],
      ['Control / accent, pressed, on-control, accent-ink, money in / out, danger', tokens(['control', 'controlPressed', 'onControl', 'accentInk', 'moneyIn', 'moneyOut', 'danger'])],
      ['The twelve accents (apricot is the default)', wrap({ gap: 8 }, ACCENTS.map((a) => vstack({ hug: true, gap: 4, align: 'center', w: 50 }, [box({ w: 50, h: 36, radius: 10, fill: a.value, stroke: 'line' }), text(a.label, { size: 9, lineHeight: 12, color: 'muted', align: 'center' }, { nowrap: true })])))],
      ['Card colours', wrap({ gap: 8 }, CARD_COLORS.map((a) => vstack({ hug: true, gap: 4, align: 'center', w: 50 }, [box({ w: 50, h: 36, radius: 10, fill: a.value, stroke: 'line' }), text(a.label, { size: 9, lineHeight: 12, color: 'muted', align: 'center' }, { nowrap: true })])))],
    ]),
    section('Type scale (Poppins)', [
      ['Title 28/700', C.Title('Title', { align: 'left', flush: true })],
      ['SectionHeading 17/600 with caption 13/400', C.SectionHeading('Section heading', { caption: 'Caption' })],
      ['Subtitle 16/400', C.Subtitle('Subtitle copy under a title', {})],
      ['Body 15/400 · Strong 15/600', C.Body('Body copy explains what a screen does.')],
      ['Quote 15/400 italic muted', C.Quote('A pull quote, italic and muted.')],
      ['FieldLabel 13/500 · Caption 13/400 · Small 12/400', hstack({ gap: 16 }, [C.FieldLabel('Field label'), C.Caption('Caption'), C.Small('Small')])],
    ]),
    section('Buttons and pills', [
      ['Button primary', C.Button('Continue')],
      ['Button outline', C.Button('Sign in with Apple', { variant: 'outline', leading: icon('Smartphone', { size: 20, color: 'ink' }) })],
      ['Button disabled', C.Button('Saving…', { disabled: true })],
      ['ActionPill · RangeDropdown', hstack({ gap: 8 }, [C.ActionPill('New card'), C.ActionPill('Today', { iconName: 'CalendarDays' }), C.RangeDropdown('This month')])],
      ['TextLink default · subtle', hstack({ gap: 24 }, [C.TextLink('Forgot password?'), C.TextLink('Try again', { variant: 'subtle' })])],
      ['AddButton (FAB) · BackButton', hstack({ gap: 16 }, [C.AddButton(), C.BackButton()])],
    ]),
    section('Choice controls', [
      ['ChoiceChips', C.ChoiceChips(['Monthly', 'Weekly', 'Yearly', 'Set period'], 'Monthly')],
      ['MultiChoiceChips', C.MultiChoiceChips(['Groceries', 'Fuel', 'Dining', 'Utilities'], ['Groceries', 'Dining'])],
      ['TogglePill', C.TogglePill(['AM', 'PM'], 'AM')],
      ['SourceTiles', C.SourceTiles([{ id: 'a', label: 'Chase •••• 4421', color: '#161616' }, { id: 'b', label: 'Amex •••• 1002', color: '#7BC4F5' }], 'a')],
      ['Switch on · off', hstack({ gap: 16 }, [C.Switch(true), C.Switch(false)])],
      ['ColorPicker', C.ColorPicker('#FA8F6F')],
    ]),
    section('Fields', [
      ['TextField default', C.TextField('Email', { placeholder: 'you@example.com' })],
      ['TextField focused, with value', C.TextField('Name', { value: 'Sam Chowdi', focused: true })],
      ['TextField password', C.TextField('Password', { value: '••••••••', password: true })],
      ['TextField error', C.TextField('Amount', { value: 'abc', error: 'Enter a number' })],
      ['TextField optional, multiline', C.TextField('Notes', { placeholder: 'Anything worth remembering', optional: true, multiline: true })],
      ['SearchField empty · with value', vstack({ gap: 8 }, [C.SearchField({ placeholder: 'Search bills' }), C.SearchField({ value: 'Netflix' })])],
      ['SelectField field · pill', vstack({ gap: 12 }, [C.SelectField('Due date', { value: 'Fri 25 Sep 2026', iconName: 'Calendar' }), C.SelectField('Paid from', { placeholder: 'Choose a card', iconName: 'ChevronDown', variant: 'pill' })])],
      ['OtpInput', C.OtpInput('482')],
      ['SliderRow', C.SliderRow('Interest rate', '6.5%', 0.42, { minLabel: '0%', maxLabel: '20%' })],
    ]),
    section('Rows', [
      ['SettingsRow: chevron · value · toggle · destructive', vstack({}, [C.SettingsRow('Appearance', { iconName: 'Palette', subtitle: 'Light, apricot' }), C.SettingsRow('Currency', { iconName: 'Banknote', value: 'USD' }), C.SettingsRow('Bill reminders', { iconName: 'Bell', toggle: true }), C.SettingsRow('Sign out', { iconName: 'LogOut', destructive: true, chevron: false, last: true })])],
      ['DateGroupHeader', C.DateGroupHeader('Today', { total: -42.5 })],
      ['TransactionRow: receipt · bill · income', C.RowList([C.TransactionRow('Whole Foods', -86.2, { kindLabel: 'Receipt' }), C.TransactionRow('Electricity', -120, { kindLabel: 'Bill', kind: 'bill', iconName: 'Zap' }), C.TransactionRow('Salary', 3200, { kindLabel: 'Income', kind: 'income' })])],
      ['LedgerRow', C.LedgerRow('Spotify', -10.99, { kindLabel: 'Subscription', sourceLabel: 'Chase •••• 4421' })],
      ['BillRow · SubscriptionRow · ReceiptRow', C.RowList([C.BillRow('Rent', 1450, { iconName: 'House', recurrence: 'Monthly', sourceLabel: 'Chase', dueDate: '1 Oct 2026' }), C.SubscriptionRow('Netflix', 15.49, { sourceLabel: 'Amex', renewsOn: '3 Oct 2026' }), C.ReceiptRow('Trader Joe\'s', 54.12, { sourceLabel: 'Chase', date: '17 Sep 2026' })])],
      ['SkeletonRow', C.SkeletonRow()],
      ['Person', C.Person('Priya', { subtitle: 'owes you $12', accent: true })],
      ['GroupIcon · BrandMark · BillMark · ProfileAvatar · ProBadge', hstack({ gap: 12 }, [C.GroupIcon('Users'), C.BrandMark('Netflix'), C.BillMark('Zap'), C.ProfileAvatar(), C.ProBadge()])],
    ]),
    section('Dashboard', [
      ['DashboardHeader', C.DashboardHeader('Sam')],
      ['BalanceSummary', C.BalanceSummary({ left: 1873.4, income: 4200, expenses: 2326.6, daysLeft: 13 })],
      ['BalanceSummary loading · error', vstack({ gap: 12 }, [C.BalanceSummary({ loading: true, daysLeft: 13 }), C.BalanceSummary({ error: true, daysLeft: 13 })])],
      ['QuickActions', C.QuickActions()],
      ['GettingStartedCard', C.GettingStartedCard([{ title: 'Add a card or account', done: true }, { title: 'Add your salary', done: true }, { title: 'Add a bill', detail: 'Rent, power, phone — anything that comes round.' }, { title: 'Turn on reminders' }, { title: 'Log a receipt' }], { mt: 0 })],
      ['DestinationList', C.DestinationList(C.DESTINATIONS)],
      ['InsightBanner', C.InsightBanner()],
      ['DateSelector', C.DateSelector('Thursday', '17 Sep 2026')],
      ['AmountTile', hstack({ gap: 12 }, [box({ flex: 1 }, C.AmountTile('Salary', 4200, 'tile-salary')), box({ flex: 1 }, C.AmountTile('Savings', 860, 'tile-savings'))])],
      ['ListNote', C.ListNote('No cards yet. Add one to track what you spend on it.')],
    ]),
    section('Cards', [
      ['PaymentCard', C.PaymentCard({ holder: 'Sam Chowdi', network: 'VISA', balance: 412.3, last4: '4421', color: '#161616' })],
      ['AccountCard', C.AccountCard({ bankName: 'Chase', accountType: 'Checking', balance: 2840.12, last4: '1180', color: '#7BC4F5' })],
      ['CardFace on white (outlined)', C.CardFace({ color: '#FFFFFF', title: 'Savings', meta: 'Savings', amount: 12000, caption: 'Available', last4: '9001' })],
    ]),
    section('Stepped add flows', [
      ['StepHeader (step 2 of 4) · StepQuestion', vstack({}, [C.StepHeader('New bill', 4, 1), C.StepQuestion('How much is it?')])],
      ['AmountFigure', C.AmountFigure('1450.00')],
      ['AmountFigure percent', C.AmountFigure('6.5', { unit: 'percent' })],
      ['AmountKeypad', C.AmountKeypad()],
      ['InlineCalendar', C.InlineCalendar()],
      ['StepFooter with error', C.StepFooter('Continue', { error: 'Pick a date first', mt: 0 })],
    ]),
    section('Transactions and calculators', [
      ['LedgerSummary', C.LedgerSummary({ net: 1873.4, inTotal: 4200, outTotal: 2326.6, count: 38 })],
      ['FlowChart', C.FlowChart([{ label: 'Apr', spent: 1800 }, { label: 'May', spent: 2100 }, { label: 'Jun', spent: 1650 }, { label: 'Jul', spent: 2400 }, { label: 'Aug', spent: 1980 }, { label: 'Sep', spent: 2326 }])],
      ['ProportionBar', C.ProportionBar(25000, 4120)],
      ['ScheduleCard', C.ScheduleCard({ interestShare: 0.61, count: 60 })],
    ]),
    section('States and overlays', [
      ['PageState', C.PageState('state-empty-bills', 'No bills yet', 'Add the ones that come round every month and Skip will remind you before they are due.', { action: 'Add a bill', secondary: 'Not now' })],
      ['ConfirmDialog side by side', C.ConfirmDialog('Delete this bill?', 'It will disappear from every month, past and future.', { actions: [{ label: 'Delete', destructive: true }] })],
      ['ConfirmDialog stacked', C.ConfirmDialog('Reminders are off', 'Turn them on in Settings to be told before a bill is due.', { actions: [{ label: 'Open Settings' }, { label: 'Not now' }] })],
      ['RangeMenu', C.RangeMenu(['This week', 'This month', 'Last 3 months', 'This year'], 'This month')],
      ['TabBar', C.TabBar('home', { pad: { t: 8, b: 8, x: 0 } })],
    ]),
  ];
}

export function componentSheet(ctx, format) {
  const sections = sheetSections();
  const GAP = 40;
  const PAD = 40;
  if (format === 'html') {
    const root = vstack({ gap: GAP, pad: PAD, fill: 'surface', name: 'Components' }, [text('SkipBudget components', { size: 24, weight: 700, lineHeight: 32, color: 'ink' }), ...sections]);
    return toHtml(root, ctx, { title: 'SkipBudget components', width: COL + PAD * 2, minHeight: 0, background: color('surface', ctx) });
  }
  // Masonry-ish: three columns of sections.
  const columns = [[], [], []];
  const heights = [0, 0, 0];
  for (const sec of sections) {
    const size = measure(sec, COL, ctx);
    const i = heights.indexOf(Math.min(...heights));
    columns[i].push(sec);
    heights[i] += size.h + GAP;
  }
  const root = hstack({ gap: GAP, pad: PAD, align: 'start', fill: 'surface', name: 'Components' }, columns.map((col) => vstack({ w: COL, gap: GAP }, col)));
  const size = measure(root, COL * 3 + GAP * 2 + PAD * 2, ctx);
  const placed = place(root, 0, 0, size.w, size.h, ctx);
  return toSvg(placed, ctx, { width: size.w, height: size.h, background: color('surface', ctx) });
}
