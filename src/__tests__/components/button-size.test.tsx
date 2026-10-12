import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FitGroup, useFitGroup } from '@/components/ui/fit-group';

/**
 * The shared pill. Its regular size is every page's primary action and must not move; `compact` is
 * the 48pt pill a card's own action takes (the Loans page's View details), with a 15pt label.
 */

function InGroup({ size }: { size?: 'regular' | 'compact' }) {
  const group = useFitGroup({ mode: 'switch' });
  return (
    <FitGroup group={group}>
      <Button label="Save" fitId="save" size={size} onPress={() => {}} />
    </FitGroup>
  );
}

describe('the regular button', () => {
  it('keeps its 64pt pill and 17pt label exactly as before', async () => {
    await render(<Button label="Save" onPress={() => {}} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.props.className).toBe(
      'min-h-16 w-full flex-row items-center justify-center rounded-full px-5 py-4 bg-control active:bg-control-pressed',
    );
    expect(screen.getByText('Save').props.className).toBe(
      'shrink text-center font-app-medium text-[17px] text-on-control',
    );
  });

  it('measures a fitted label at 17pt', async () => {
    await render(<InGroup />);
    expect(screen.getByText('Save').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 17 })]),
    );
  });
});

describe('the compact button', () => {
  it('is a 48pt pill with a 15pt label, and grows rather than clips', async () => {
    await render(
      <View>
        <Button label="View details" size="compact" onPress={() => {}} />
      </View>,
    );
    const button = screen.getByRole('button', { name: 'View details' });
    expect(button.props.className).toContain('min-h-[48px]');
    expect(button.props.className).toContain('rounded-full');
    expect(button.props.className).not.toContain('min-h-16');
    expect(button.props.className).not.toMatch(/(?:^|\s)h-/);
    const text = screen.getByText('View details');
    expect(text.props.className).toContain('text-[15px]');
    expect(text.props.className).not.toContain('text-[17px]');
  });

  it('measures a fitted label at 15pt', async () => {
    await render(<InGroup size="compact" />);
    expect(screen.getByText('Save').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 15 })]),
    );
  });
});
