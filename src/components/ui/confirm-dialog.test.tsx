import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

jest.mock('@/theme/shadows', () => ({ shadows: { floating: {} } }));

type Screen = Awaited<ReturnType<typeof render>>;

const rowOf = (node: { parent?: unknown; props?: { className?: string } } | null) => {
  for (let at = node?.parent as typeof node; at; at = at.parent as typeof node) {
    const name = at.props?.className ?? '';
    if (name.includes('gap-2.5')) return name;
  }
  return '';
};

function phone(width: number, fontScale: number) {
  const window = { width, height: 812, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

/**
 * One layout pass of the pair: each label's room in its half of the card and its width on one line
 * (Montserrat SemiBold, from the font's advance widths), then the buttons' box. 375pt wide: a 311pt
 * card, 90.5pt of text in each half.
 */
async function layOutPair(screen: Screen, natural: { cancel: number; choice: number }) {
  await layout(screen, 'fit-slot-cancel', 90.5);
  await layout(screen, 'fit-copy-cancel', natural.cancel);
  await layout(screen, 'fit-slot-choice-0', 90.5);
  await layout(screen, 'fit-copy-choice-0', natural.choice);
  await fireEvent(rowNode(screen), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 271, height: 60 } },
  });
}

/** The buttons' box: the view that lays the pair out. */
function rowNode(screen: Screen) {
  const slot = screen.getByTestId('fit-slot-choice-0');
  for (let at = slot.parent; at; at = at.parent) {
    if (String(at.props.className ?? '').includes('gap-2.5')) return at;
  }
  throw new Error('no button row');
}

beforeEach(() => phone(375, 1));

it('puts two short choices side by side', async () => {
  const screen = await render(
    <ConfirmDialog
      title="Delete this bill?"
      actions={[{ id: 'confirm', label: 'Delete', destructive: true }]}
      onResolve={() => {}}
    />,
  );
  await layOutPair(screen, { cancel: 52.5, choice: 51.1 });
  expect(rowOf(screen.getByText('Delete'))).toContain('flex-row');
});

it('stacks them when a label would not fit half the card', async () => {
  const onResolve = jest.fn();
  const screen = await render(
    <ConfirmDialog
      title="Delete everything, for good?"
      actions={[{ id: 'confirm', label: 'Delete everything', destructive: true }]}
      cancelLabel="Keep my account"
      onResolve={onResolve}
    />,
  );
  await layOutPair(screen, { cancel: 135.7, choice: 139.2 });
  expect(rowOf(screen.getByText('Delete everything'))).not.toContain('flex-row');

  await fireEvent.press(screen.getByText('Keep my account'));
  expect(onResolve).toHaveBeenCalledWith(null);
});

describe('ConfirmDialog at large text sizes', () => {
  beforeEach(() => phone(375, 1.4));

  const dialog = (onResolve = jest.fn()) => (
    <ConfirmDialog
      title="Save this loan?"
      message="Your payment of $495.03 a month for 5 yrs goes on your bills."
      actions={[{ id: 'confirm', label: 'Continue' }]}
      cancelLabel="Not now"
      onResolve={onResolve}
    />
  );

  it('lets every line follow its role, whole, with no line limit', async () => {
    const screen = await render(dialog());
    expect(screen.getByText('Save this loan?').props.maxFontSizeMultiplier).toBe(1.3);
    expect(screen.getByText(/^Your payment of/).props.maxFontSizeMultiplier).toBe(1.6);
    for (const label of ['Continue', 'Not now']) {
      const node = screen.getByText(label);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.4);
    }
  });

  it('keeps the pair side by side while both labels fit their half on one line', async () => {
    const screen = await render(dialog());
    // On a 428pt phone each half holds 105pt: "Continue" is 99.7pt at 1.4x.
    await layout(screen, 'fit-slot-cancel', 105);
    await layout(screen, 'fit-copy-cancel', 92.5);
    await layout(screen, 'fit-slot-choice-0', 105);
    await layout(screen, 'fit-copy-choice-0', 99.7);
    await fireEvent(rowNode(screen), 'layout', { nativeEvent: { layout: { width: 300 } } });
    expect(rowOf(screen.getByText('Continue'))).toContain('flex-row');
  });

  it('stacks the pair, choice first and the way out last, once one label would wrap', async () => {
    const onResolve = jest.fn();
    const screen = await render(dialog(onResolve));
    await layOutPair(screen, { cancel: 92.5, choice: 99.7 });

    expect(rowOf(screen.getByText('Continue'))).not.toContain('flex-row');
    const row = rowNode(screen);
    const order = ['fit-slot-choice-0', 'fit-slot-cancel'].map((id) => {
      let at = screen.getByTestId(id).parent;
      while (at && at.parent !== row) at = at.parent;
      return row.children.indexOf(at as never);
    });
    expect(order[0]).toBeLessThan(order[1]);

    await fireEvent.press(screen.getByText('Not now'));
    expect(onResolve).toHaveBeenCalledWith(null);
  });

  it('stays stacked once the stacked buttons have room, rather than going back and forth', async () => {
    const screen = await render(dialog());
    await layOutPair(screen, { cancel: 92.5, choice: 99.7 });

    // Stacked, each label has the whole width: it would fit side by side judged from here.
    await layout(screen, 'fit-slot-choice-0', 231);
    await layout(screen, 'fit-slot-cancel', 231);
    expect(rowOf(screen.getByText('Continue'))).not.toContain('flex-row');
  });

  it('draws Cancel in one weight in both layouts, so its measured width cannot change', async () => {
    const screen = await render(dialog());
    const weight = () =>
      String(screen.getByText('Not now').props.className).match(/font-app-\w+/)?.[0];
    const beside = weight();
    await layOutPair(screen, { cancel: 92.5, choice: 99.7 });
    expect(weight()).toBe(beside);
  });

  it('always stacks two choices and the way out', async () => {
    const screen = await render(
      <ConfirmDialog
        title="Which one?"
        actions={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
        onResolve={() => {}}
      />,
    );
    expect(rowOf(screen.getByText('A'))).not.toContain('flex-row');
  });
});
