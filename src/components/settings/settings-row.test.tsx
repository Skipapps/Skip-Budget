import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';

import { SettingsRow } from '@/components/settings/settings-row';

/**
 * The switch on a settings row, pressed.
 *
 * Written after Settings shipped a switch that could be turned on with a tap
 * and not turned off again: the press has to reach the handler, it has to
 * carry the value the switch should take next rather than the one it has, and
 * it has to happen exactly once — a row that toggled twice on one tap would
 * look identical to one that never toggled at all.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    control: '#0000FF',
    danger: '#DC2626',
  }),
}));

const Icon = () => null;

/** A row wired the way Settings wires one: the parent owns the value. */
function Controlled({ start, onChange }: { start: boolean; onChange: (next: boolean) => void }) {
  const [on, setOn] = useState(start);
  return (
    <SettingsRow
      icon={Icon as never}
      title="Haptics"
      subtitle="A tap when you press something"
      toggle={{
        value: on,
        onChange: (next) => {
          onChange(next);
          setOn(next);
        },
      }}
    />
  );
}

describe('SettingsRow, switch', () => {
  it('turns off on one press, with one call carrying false', async () => {
    const onChange = jest.fn();
    const view = await render(<Controlled start onChange={onChange} />);

    await fireEvent.press(view.getByRole('switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(view.getByRole('switch').props.accessibilityState).toMatchObject({ checked: false });
  });

  it('turns on on one press, with one call carrying true', async () => {
    const onChange = jest.fn();
    const view = await render(<Controlled start={false} onChange={onChange} />);

    await fireEvent.press(view.getByRole('switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(view.getByRole('switch').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('presses alternate, rather than sticking in either direction', async () => {
    const onChange = jest.fn();
    const view = await render(<Controlled start onChange={onChange} />);

    await fireEvent.press(view.getByRole('switch'));
    await fireEvent.press(view.getByRole('switch'));
    await fireEvent.press(view.getByRole('switch'));

    expect(onChange.mock.calls).toEqual([[false], [true], [false]]);
  });

  it('stays where it is drawn when the handler refuses the change', async () => {
    // The app lock: turning it on has to pass a scan first, so the value it is
    // given may never come back. Nothing should flick over and snap back.
    const onChange = jest.fn();
    const view = await render(
      <SettingsRow icon={Icon as never} title="App lock" toggle={{ value: true, onChange }} />,
    );

    await fireEvent.press(view.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(false);
    expect(view.getByRole('switch').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('does not make the rest of the row pressable', async () => {
    // Two press targets on one row is how a tap toggles twice and lands back
    // where it started, so a toggle row deliberately has no row-level press.
    const onChange = jest.fn();
    const onPress = jest.fn();
    const view = await render(
      <SettingsRow
        icon={Icon as never}
        title="Haptics"
        onPress={onPress}
        toggle={{ value: true, onChange }}
      />,
    );

    expect(view.queryByRole('button')).toBeNull();

    await fireEvent.press(view.getByRole('switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SettingsRow, navigating', () => {
  it('is a button that fires once, with nothing over it', async () => {
    // Settings' "Reminders" row is this shape, and was reported as not
    // responding. The row itself is a plain press with a chevron.
    const onPress = jest.fn();
    const view = await render(
      <SettingsRow
        icon={Icon as never}
        title="Reminders"
        subtitle="Before a renewal, a bill or payday"
        onPress={onPress}
      />,
    );

    const row = view.getByRole('button', { name: 'Reminders. Before a renewal, a bill or payday' });
    await fireEvent.press(row);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('stays inert when there is nothing to press', async () => {
    const view = await render(<SettingsRow icon={Icon as never} title="Version" value="1.0.0" />);

    expect(view.queryByRole('button')).toBeNull();
    expect(view.getByText('1.0.0')).toBeTruthy();
  });
});
