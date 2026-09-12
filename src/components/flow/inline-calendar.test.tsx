import { fireEvent, render } from '@testing-library/react-native';

import { InlineCalendar } from '@/components/flow/inline-calendar';

/**
 * The floor under the inline calendar.
 *
 * `DayGrid` has known how to dim and deaden the days below a minimum since the
 * bill-period fix, and the modal picker passes one through. The inline
 * calendar — the one every add flow ends on — took no such prop at all, so the
 * next flow that needs a floor would have offered every day and left the form
 * to refuse afterwards. This is the prop arriving where the grid can see it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD' }),
}));

// 14 June 2026, a Sunday — a fixed month, so the day labels below are fixed too.
const MIN = new Date(2026, 5, 14);

// The clock is pinned a fortnight before the floor, which is the only position
// from which the "Today" shortcut is a day the grid refuses.
jest.useFakeTimers().setSystemTime(new Date('2026-06-01T09:00:00'));

const spoken = (day: number, weekday: string) => `${weekday} ${day} June 2026`;

describe('InlineCalendar, with a minDate', () => {
  it('deadens the days below the floor and leaves the rest pressable', async () => {
    const onChange = jest.fn();
    const view = await render(<InlineCalendar value={MIN} minDate={MIN} onChange={onChange} />);

    const before = view.getByLabelText(spoken(13, 'Saturday'));
    expect(before.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(before);
    expect(onChange).not.toHaveBeenCalled();

    const after = view.getByLabelText(spoken(15, 'Monday'));
    expect(after.props.accessibilityState).toMatchObject({ disabled: false });

    await fireEvent.press(after);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].getDate()).toBe(15);
  });

  it('drops the Today shortcut when today is below the floor', async () => {
    const view = await render(<InlineCalendar value={MIN} minDate={MIN} onChange={jest.fn()} />);

    // The fixture's floor is in the future, so "Today" would hand back a day
    // the grid beside it has greyed out.
    expect(view.queryByText('Today')).toBeNull();
  });

  it('offers every day, and the shortcut, when there is no floor', async () => {
    const onChange = jest.fn();
    const view = await render(<InlineCalendar value={MIN} onChange={onChange} />);

    const before = view.getByLabelText(spoken(13, 'Saturday'));
    expect(before.props.accessibilityState).toMatchObject({ disabled: false });

    await fireEvent.press(before);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(view.getByText('Today')).toBeTruthy();
  });
});
