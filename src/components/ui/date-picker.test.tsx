import { fireEvent, render } from '@testing-library/react-native';

import { DatePicker } from '@/components/ui/date-picker';

/**
 * The floor under the picker.
 *
 * A bill that runs for a "specific period" has a From and a To, and the To was
 * taking any date at all — including one before the From, which saved a period
 * that finished before it began. The fix is that those days are never offered:
 * dimmed, dead, and OK held back if the draft drifts below the floor by some
 * other route.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    onControl: '#FFFFFF',
  }),
}));

// 14 June 2026, a Sunday — the month is fixed so the day labels below are too.
const MIN = new Date(2026, 5, 14);

const spoken = (day: number, weekday: string) => `${weekday} ${day} June 2026`;

describe('DatePicker, with a minDate', () => {
  it('refuses the days before the floor and takes the ones after it', async () => {
    const onConfirm = jest.fn();
    const view = await render(
      <DatePicker value={MIN} minDate={MIN} onCancel={() => {}} onConfirm={onConfirm} />,
    );

    // It opens on the month step; the day grid is one press away.
    await fireEvent.press(view.getByRole('button', { name: 'Next' }));

    const before = view.getByLabelText(spoken(13, 'Saturday'));
    expect(before.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(before);
    await fireEvent.press(view.getByRole('button', { name: 'OK' }));

    // The blocked day was never taken, so OK confirms the date it opened on.
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].getDate()).toBe(14);

    onConfirm.mockClear();

    const after = view.getByLabelText(spoken(15, 'Monday'));
    expect(after.props.accessibilityState).toMatchObject({ disabled: false });

    await fireEvent.press(after);
    await fireEvent.press(view.getByRole('button', { name: 'OK' }));

    expect(onConfirm.mock.calls[0][0].getDate()).toBe(15);
  });

  it('holds OK back when stepping the year drops the draft below the floor', async () => {
    const onConfirm = jest.fn();
    const view = await render(
      <DatePicker value={MIN} minDate={MIN} onCancel={() => {}} onConfirm={onConfirm} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    // Nothing was chosen in the grid; the whole year moved under it.
    await fireEvent.press(view.getByRole('button', { name: 'Previous year' }));
    await fireEvent.press(view.getByRole('button', { name: 'OK' }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('leaves every day open when there is no floor', async () => {
    const onConfirm = jest.fn();
    const view = await render(<DatePicker value={MIN} onCancel={() => {}} onConfirm={onConfirm} />);

    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    await fireEvent.press(view.getByLabelText(spoken(13, 'Saturday')));
    await fireEvent.press(view.getByRole('button', { name: 'OK' }));

    expect(onConfirm.mock.calls[0][0].getDate()).toBe(13);
  });
});
