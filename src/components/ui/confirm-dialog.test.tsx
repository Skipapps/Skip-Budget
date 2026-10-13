import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';

import { ConfirmDialog, type DialogRequest } from '@/components/ui/confirm-dialog';
import { usePastChoice } from '@/components/ui/past-choice';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

jest.mock('@/theme/shadows', () => ({ shadows: { floating: {} } }));

// The plan questions are asked through the root dialog; here they are only worded.
const mockAsk = jest.fn<Promise<string | null>, [DialogRequest]>();
jest.mock('@/providers/dialog-provider', () => ({
  useDialog: () => (request: DialogRequest) => mockAsk(request),
}));

type Screen = Awaited<ReturnType<typeof render>>;

const rowOf = (node: { parent?: unknown; props?: { className?: string } } | null) => {
  for (let at = node?.parent as typeof node; at; at = at.parent as typeof node) {
    const name = at.props?.className ?? '';
    if (name.includes('gap-2.5')) return name;
  }
  return '';
};

function phone(width: number, fontScale: number, height = 812) {
  const window = { width, height, scale: 3, fontScale };
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

describe('ConfirmDialog when its words need more room than the screen has', () => {
  /** A Face ID phone's safe area: the top and the home indicator differ. */
  const INSETS: EdgeInsets = { top: 47, right: 0, bottom: 34, left: 0 };
  /** The larger inset plus the 16pt kept clear, on both sides. */
  const EDGE = 47 + 16;

  let flash: jest.SpyInstance;
  beforeEach(() => {
    resetLocaleForTests();
    mockAsk.mockResolvedValue(null);
    flash = jest.spyOn(ScrollView.prototype, 'flashScrollIndicators');
    flash.mockClear();
  });
  afterAll(() => resetLocaleForTests());

  const inSafeArea = (dialog: React.ReactElement) => (
    <SafeAreaInsetsContext.Provider value={INSETS}>{dialog}</SafeAreaInsetsContext.Provider>
  );

  /** Whether a node is drawn inside the scrolling words. */
  const scrolls = (node: { parent?: unknown; props?: { testID?: string } } | null) => {
    for (let at = node; at; at = at.parent as typeof node) {
      if (at.props?.testID === 'dialog-words') return true;
    }
    return false;
  };

  /** The card: the box the words and the buttons share. */
  const cardOf = (screen: Screen) => screen.getByTestId('dialog-words').parent!;

  /** The French delete question for a loan with a past: two choices and the way out. */
  async function frenchLoanDelete(): Promise<DialogRequest> {
    await act(async () => setLanguage('fr'));
    const { result } = await renderHook(() => usePastChoice());
    await result.current.askDelete({ name: 'Prêt auto Desjardins', noun: 'payments', count: 12 });
    return mockAsk.mock.calls[mockAsk.mock.calls.length - 1][0];
  }

  it('scrolls a long French plan question at the largest text and keeps its three buttons on screen', async () => {
    phone(375, 3.1, 667);
    const request = await frenchLoanDelete();
    const onResolve = jest.fn();
    const screen = await render(inSafeArea(<ConfirmDialog {...request} onResolve={onResolve} />));

    // The card stops inside the safe area, with the same room above as below.
    expect(StyleSheet.flatten(cardOf(screen).props.style).maxHeight).toBe(667 - 2 * EDGE);
    expect(StyleSheet.flatten(cardOf(screen).parent!.props.style)).toMatchObject({
      paddingVertical: EDGE,
    });

    // Only the words scroll; the buttons are below them, never scrolled away.
    expect(scrolls(screen.getByText(request.title))).toBe(true);
    expect(scrolls(screen.getByText(request.message!))).toBe(true);
    const buttons = [...(request.actions ?? []).map((action) => action.label), 'Annuler'];
    expect(buttons).toEqual(['Garder les paiements passés', 'Tout supprimer', 'Annuler']);
    for (const label of buttons) {
      expect([label, scrolls(screen.getByRole('button', { name: label }))]).toEqual([label, false]);
    }

    // Taller than its box: the scroll bar shows once, so there is plainly more to read.
    const words = screen.getByTestId('dialog-words');
    await fireEvent(words, 'layout', { nativeEvent: { layout: { width: 311, height: 240 } } });
    await fireEvent(words, 'contentSizeChange', 311, 980);
    await fireEvent(words, 'contentSizeChange', 311, 1010);
    expect(flash).toHaveBeenCalledTimes(1);

    for (const label of buttons) {
      await fireEvent.press(screen.getByRole('button', { name: label }));
    }
    expect(onResolve.mock.calls).toEqual([['keep'], ['everything'], [null]]);
  });

  it('keeps a dialog that fits as it was: same boxes, centred, not scrolling or bouncing', async () => {
    phone(375, 1);
    const screen = await render(
      inSafeArea(
        <ConfirmDialog
          title="Delete this bill?"
          message="This cannot be undone."
          actions={[{ id: 'confirm', label: 'Delete', destructive: true }]}
          onResolve={() => {}}
        />,
      ),
    );

    const card = cardOf(screen);
    expect(card.props.className).toBe(
      'w-full max-w-[340px] overflow-hidden rounded-[16px] bg-card',
    );
    // Equal room above and below leaves its centre where it was; no edge has a padding of its own.
    const backdrop = StyleSheet.flatten(card.parent!.props.style);
    expect(backdrop.paddingVertical).toBe(EDGE);
    expect([backdrop.paddingTop, backdrop.paddingBottom]).toEqual([undefined, undefined]);
    expect(card.parent!.props.className).toBe(
      'flex-1 items-center justify-center bg-black/40 px-8',
    );

    // The words keep their box, as tall as they are, and stay put under a finger.
    const words = screen.getByTestId('dialog-words');
    expect(StyleSheet.flatten(words.props.style)).toMatchObject({ flexGrow: 0, flexShrink: 1 });
    expect(words.props.alwaysBounceVertical).toBe(false);
    expect(screen.getByText('Delete this bill?').parent!.props.className).toBe('px-5 pb-4 pt-5');
    expect(rowOf(screen.getByText('Delete'))).toMatch(/^w-full gap-2\.5 px-5 pb-5 pt-1/);

    await fireEvent(words, 'layout', { nativeEvent: { layout: { width: 311, height: 92 } } });
    await fireEvent(words, 'contentSizeChange', 311, 92);
    expect(flash).not.toHaveBeenCalled();
  });

  it('keeps 16pt clear of the screen edge when drawn outside the app’s safe area', async () => {
    phone(375, 1);
    const screen = await render(<ConfirmDialog title="Done" onResolve={() => {}} />);

    expect(StyleSheet.flatten(cardOf(screen).props.style).maxHeight).toBe(812 - 32);
    expect(StyleSheet.flatten(cardOf(screen).parent!.props.style).paddingVertical).toBe(16);
  });
});
