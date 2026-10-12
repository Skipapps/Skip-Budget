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

describe('InlineCalendar, with a maxDate', () => {
  // Today (1 June) is the last day: nothing later can be picked, as for a payment already made.
  const TODAY = new Date(2026, 5, 1);
  const may = (day: number, weekday: string) => `${weekday} ${day} May 2026`;

  it('deadens the days after the ceiling, keeps the ceiling itself, and keeps the shortcut', async () => {
    const onChange = jest.fn();
    const view = await render(<InlineCalendar value={TODAY} maxDate={TODAY} onChange={onChange} />);

    const after = view.getByLabelText(spoken(2, 'Tuesday'));
    expect(after.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(after);
    expect(onChange).not.toHaveBeenCalled();

    const ceiling = view.getByLabelText(`Today, ${spoken(1, 'Monday')}`);
    expect(ceiling.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(ceiling);
    expect(onChange.mock.calls[0][0].getDate()).toBe(1);

    expect(view.getByText('Today')).toBeTruthy();
  });

  it('keeps the days between a floor and a ceiling, and only those', async () => {
    const view = await render(
      <InlineCalendar
        value={TODAY}
        minDate={new Date(2026, 4, 28)}
        maxDate={TODAY}
        onChange={jest.fn()}
      />,
    );
    const disabled = (label: string) =>
      view.getByLabelText(label).props.accessibilityState.disabled;
    expect(disabled(spoken(2, 'Tuesday'))).toBe(true);
    await fireEvent.press(view.getByLabelText('Previous month'));
    expect(disabled(may(27, 'Wednesday'))).toBe(true);
    expect(disabled(may(28, 'Thursday'))).toBe(false);
    expect(disabled(may(31, 'Sunday'))).toBe(false);
  });

  it('drops the Today shortcut when today is past the ceiling', async () => {
    const view = await render(
      <InlineCalendar value={TODAY} maxDate={new Date(2026, 4, 31)} onChange={jest.fn()} />,
    );
    expect(view.queryByText('Today')).toBeNull();
  });
});
