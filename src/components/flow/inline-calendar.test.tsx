import { fireEvent, render } from '@testing-library/react-native';

import { InlineCalendar } from '@/components/flow/inline-calendar';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD' }),
}));

// 14 June 2026, a Sunday: a fixed month, so the day labels below are fixed too.
const MIN = new Date(2026, 5, 14);

// Clock pinned before the floor, so the "Today" shortcut is a day the grid refuses.
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
