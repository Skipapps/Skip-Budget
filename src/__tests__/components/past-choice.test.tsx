import { act, fireEvent, render, renderHook } from '@testing-library/react-native';

import { ConfirmDialog, type DialogRequest } from '@/components/ui/confirm-dialog';
import { usePastChoice, type PastNoun } from '@/components/ui/past-choice';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * One question about a plan's past, worded the same for bills, subscriptions, loans and habits: on
 * an edit, whether what is already recorded changes too; on a delete, whether it stays in history.
 */

jest.mock('@/theme/shadows', () => ({ shadows: { floating: {} } }));

const mockAsk = jest.fn<Promise<string | null>, [DialogRequest]>();
jest.mock('@/providers/dialog-provider', () => ({
  useDialog: () => (request: DialogRequest) => mockAsk(request),
}));

const NOUNS: PastNoun[] = ['charges', 'payments', 'days'];

async function choice() {
  const { result } = await renderHook(() => usePastChoice());
  return result.current;
}

function lastRequest(): DialogRequest {
  const calls = mockAsk.mock.calls;
  return calls[calls.length - 1][0];
}

const ids = (request: DialogRequest) => (request.actions ?? []).map((action) => action.id);
const labels = (request: DialogRequest) => (request.actions ?? []).map((action) => action.label);

async function inLanguage(language: Language) {
  await act(async () => setLanguage(language));
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockAsk.mockResolvedValue(null);
});

describe('askChange', () => {
  it('asks with the noun’s title, the count, and Past and upcoming first', async () => {
    mockAsk.mockResolvedValue('all');
    const past = await choice();

    await expect(past.askChange({ name: 'Rent', noun: 'charges', count: 3 })).resolves.toBe('all');

    const request = lastRequest();
    expect(request.title).toBe('Change past charges too?');
    expect(request.message).toBe(
      'Rent has already been charged 3 times. Change those as well, or only the ones still to come?',
    );
    expect(ids(request)).toEqual(['all', 'upcoming']);
    expect(labels(request)).toEqual(['Past and upcoming', 'Upcoming only']);
    expect(request.actions?.some((action) => action.destructive)).toBe(false);
    expect(request.cancelLabel).toBe('Cancel');
  });

  it('returns Upcoming only as chosen', async () => {
    mockAsk.mockResolvedValue('upcoming');
    const past = await choice();
    await expect(past.askChange({ name: 'Car', noun: 'payments', count: 1 })).resolves.toBe(
      'upcoming',
    );
  });

  it('returns null when the person backs out', async () => {
    mockAsk.mockResolvedValue(null);
    const past = await choice();
    await expect(past.askChange({ name: 'Rent', noun: 'charges', count: 2 })).resolves.toBeNull();
  });

  it('reads an unknown answer as backing out', async () => {
    mockAsk.mockResolvedValue('keep');
    const past = await choice();
    await expect(past.askChange({ name: 'Rent', noun: 'charges', count: 2 })).resolves.toBeNull();
  });

  it('does not ask when nothing is recorded yet', async () => {
    const past = await choice();
    await expect(past.askChange({ name: 'Rent', noun: 'charges', count: 0 })).resolves.toBe(
      'upcoming',
    );
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('words each noun in English, one and many', async () => {
    const past = await choice();
    const seen = [];
    for (const noun of NOUNS) {
      for (const count of [1, 4]) {
        await past.askChange({ name: 'Plan', noun, count });
        seen.push([lastRequest().title, lastRequest().message]);
      }
    }
    expect(seen).toEqual([
      [
        'Change past charges too?',
        'Plan has already been charged once. Change that charge as well, or only the ones still to come?',
      ],
      [
        'Change past charges too?',
        'Plan has already been charged 4 times. Change those as well, or only the ones still to come?',
      ],
      [
        'Change past payments too?',
        'Plan already has 1 payment recorded. Change that payment as well, or only the ones still to come?',
      ],
      [
        'Change past payments too?',
        'Plan already has 4 payments recorded. Change those as well, or only the ones still to come?',
      ],
      [
        'Change past days too?',
        'Plan already has 1 day logged. Change that day as well, or only the days still to come?',
      ],
      [
        'Change past days too?',
        'Plan already has 4 days logged. Change those as well, or only the days still to come?',
      ],
    ]);
  });
});

describe('askDelete', () => {
  it('with nothing recorded, is the plain Delete confirm', async () => {
    mockAsk.mockResolvedValue('everything');
    const past = await choice();

    await expect(past.askDelete({ name: 'Rent', noun: 'charges', count: 0 })).resolves.toBe(
      'everything',
    );

    const request = lastRequest();
    expect(request.title).toBe('Delete Rent?');
    expect(request.message).toBe('This can’t be undone.');
    expect(request.actions).toEqual([{ id: 'everything', label: 'Delete', destructive: true }]);
    expect(request.cancelLabel).toBe('Cancel');
  });

  it('with nothing recorded, backing out is null', async () => {
    const past = await choice();
    await expect(past.askDelete({ name: 'Rent', noun: 'charges', count: 0 })).resolves.toBeNull();
  });

  it('with nothing recorded and already stopped, is still the plain confirm', async () => {
    const past = await choice();
    await past.askDelete({ name: 'Rent', noun: 'charges', count: 0, stopped: true });
    expect(ids(lastRequest())).toEqual(['everything']);
    expect(lastRequest().cancelLabel).toBe('Cancel');
  });

  it('with a past, offers keeping it first and removing everything in red', async () => {
    mockAsk.mockResolvedValue('keep');
    const past = await choice();

    await expect(past.askDelete({ name: 'Rent', noun: 'charges', count: 3 })).resolves.toBe('keep');

    const request = lastRequest();
    expect(request.title).toBe('Delete Rent?');
    expect(request.message).toBe(
      'Rent has 3 past charges. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded.',
    );
    expect(request.actions).toEqual([
      { id: 'keep', label: 'Keep past charges' },
      { id: 'everything', label: 'Remove everything', destructive: true },
    ]);
    expect(request.cancelLabel).toBe('Cancel');
  });

  it('returns Remove everything as chosen, and null on Cancel', async () => {
    const past = await choice();
    mockAsk.mockResolvedValueOnce('everything');
    await expect(past.askDelete({ name: 'Rent', noun: 'charges', count: 1 })).resolves.toBe(
      'everything',
    );
    mockAsk.mockResolvedValueOnce(null);
    await expect(past.askDelete({ name: 'Rent', noun: 'charges', count: 1 })).resolves.toBeNull();
    mockAsk.mockResolvedValueOnce('all');
    await expect(past.askDelete({ name: 'Rent', noun: 'charges', count: 1 })).resolves.toBeNull();
  });

  it('on a stopped plan, offers only removal, and the way out keeps the past', async () => {
    const past = await choice();
    mockAsk.mockResolvedValueOnce('everything');

    await expect(
      past.askDelete({ name: 'Car', noun: 'payments', count: 2, stopped: true }),
    ).resolves.toBe('everything');

    const request = lastRequest();
    expect(request.title).toBe('Delete Car?');
    expect(request.actions).toEqual([
      { id: 'everything', label: 'Remove everything', destructive: true },
    ]);
    expect(request.cancelLabel).toBe('Keep past payments');

    mockAsk.mockResolvedValueOnce(null);
    await expect(
      past.askDelete({ name: 'Car', noun: 'payments', count: 2, stopped: true }),
    ).resolves.toBeNull();
    // A stopped plan has nothing left to stop: a stray 'keep' must not read as a choice.
    mockAsk.mockResolvedValueOnce('keep');
    await expect(
      past.askDelete({ name: 'Car', noun: 'payments', count: 2, stopped: true }),
    ).resolves.toBeNull();
  });

  it('words each noun in English, one and many, with a keep label to match', async () => {
    const past = await choice();
    const seen = [];
    for (const noun of NOUNS) {
      for (const count of [1, 2]) {
        await past.askDelete({ name: 'Plan', noun, count });
        seen.push([lastRequest().message, labels(lastRequest())[0]]);
      }
    }
    const either = 'Either way, nothing after today is recorded.';
    expect(seen).toEqual([
      [
        `Plan has 1 past charge. Keep it in your history, or remove it from past months too? ${either}`,
        'Keep past charges',
      ],
      [
        `Plan has 2 past charges. Keep them in your history, or remove them from past months too? ${either}`,
        'Keep past charges',
      ],
      [
        `Plan has 1 past payment. Keep it in your history, or remove it from past months too? ${either}`,
        'Keep past payments',
      ],
      [
        `Plan has 2 past payments. Keep them in your history, or remove them from past months too? ${either}`,
        'Keep past payments',
      ],
      [
        `Plan has 1 past day. Keep it in your history, or remove it from past months too? ${either}`,
        'Keep past days',
      ],
      [
        `Plan has 2 past days. Keep them in your history, or remove them from past months too? ${either}`,
        'Keep past days',
      ],
    ]);
  });

  it('never says stopped, cancelled or a page in the delete words', async () => {
    const past = await choice();
    for (const language of ['en', 'es', 'fr'] as const) {
      await inLanguage(language);
      for (const noun of NOUNS) {
        for (const stopped of [false, true]) {
          await past.askDelete({ name: 'Plan', noun, count: 2, stopped });
          const words = [lastRequest().message, lastRequest().cancelLabel, ...labels(lastRequest())]
            .join(' ')
            .toLowerCase();
          expect(words).not.toMatch(/stop|cancelled|página|page|detenid|arrêt|annulé|cancelad/);
        }
      }
    }
  });
});

describe('Spanish', () => {
  beforeEach(() => inLanguage('es'));

  it('asks to change past charges, one and many', async () => {
    const past = await choice();
    await past.askChange({ name: 'Alquiler', noun: 'charges', count: 1 });
    expect(lastRequest().title).toBe('¿Cambiar también los cargos anteriores?');
    expect(lastRequest().message).toBe(
      'Ya hubo un cargo de Alquiler. ¿Cambiar también ese cargo o solo los próximos?',
    );
    expect(labels(lastRequest())).toEqual(['Anteriores y próximos', 'Solo los próximos']);
    expect(lastRequest().cancelLabel).toBe('Cancelar');

    await past.askChange({ name: 'Alquiler', noun: 'charges', count: 5 });
    expect(lastRequest().message).toBe(
      'Ya hubo 5 cargos de Alquiler. ¿Cambiarlos también o solo los próximos?',
    );
  });

  it('asks to change past payments and days, one and many', async () => {
    const past = await choice();
    const seen = [];
    for (const noun of ['payments', 'days'] as const) {
      for (const count of [1, 3]) {
        await past.askChange({ name: 'Auto', noun, count });
        seen.push([lastRequest().title, lastRequest().message]);
      }
    }
    expect(seen).toEqual([
      [
        '¿Cambiar también los pagos anteriores?',
        'Ya hay un pago registrado de Auto. ¿Cambiar también ese pago o solo los próximos?',
      ],
      [
        '¿Cambiar también los pagos anteriores?',
        'Ya hay 3 pagos registrados de Auto. ¿Cambiarlos también o solo los próximos?',
      ],
      [
        '¿Cambiar también los días anteriores?',
        'Ya hay un día registrado en Auto. ¿Cambiar también ese día o solo los próximos?',
      ],
      [
        '¿Cambiar también los días anteriores?',
        'Ya hay 3 días registrados en Auto. ¿Cambiarlos también o solo los próximos?',
      ],
    ]);
  });

  it('asks how to delete, one and many, with the keep label per noun', async () => {
    const past = await choice();
    const either = 'En ambos casos, no se registra nada después de hoy.';

    await past.askDelete({ name: 'Auto', noun: 'payments', count: 1 });
    expect(lastRequest().title).toBe('¿Eliminar Auto?');
    expect(lastRequest().message).toBe(
      `Auto tiene un pago anterior. ¿Conservarlo en tu historial o quitarlo también de los meses pasados? ${either}`,
    );
    expect(labels(lastRequest())).toEqual(['Conservar los pagos anteriores', 'Eliminar todo']);

    await past.askDelete({ name: 'Auto', noun: 'charges', count: 2 });
    expect(lastRequest().message).toBe(
      `Auto tiene 2 cargos anteriores. ¿Conservarlos en tu historial o quitarlos también de los meses pasados? ${either}`,
    );
    expect(labels(lastRequest())[0]).toBe('Conservar los cargos anteriores');

    await past.askDelete({ name: 'Café', noun: 'days', count: 1 });
    expect(lastRequest().message).toBe(
      `Café tiene un día anterior. ¿Conservarlo en tu historial o quitarlo también de los meses pasados? ${either}`,
    );
    await past.askDelete({ name: 'Café', noun: 'days', count: 6, stopped: true });
    expect(lastRequest().message).toBe(
      `Café tiene 6 días anteriores. ¿Conservarlos en tu historial o quitarlos también de los meses pasados? ${either}`,
    );
    expect(lastRequest().cancelLabel).toBe('Conservar los días anteriores');

    await past.askDelete({ name: 'Auto', noun: 'payments', count: 0 });
    expect(lastRequest().message).toBe('Esto no se puede deshacer.');
    expect(labels(lastRequest())).toEqual(['Eliminar']);
  });
});

describe('French', () => {
  beforeEach(() => inLanguage('fr'));
  const space = ' ';

  it('asks to change past charges, one and many', async () => {
    const past = await choice();
    await past.askChange({ name: 'Loyer', noun: 'charges', count: 1 });
    expect(lastRequest().title).toBe(`Modifier aussi les prélèvements passés${space}?`);
    expect(lastRequest().message).toBe(
      `Un prélèvement a déjà eu lieu pour Loyer. Modifier aussi ce prélèvement, ou seulement ceux à venir${space}?`,
    );
    expect(labels(lastRequest())).toEqual(['Passés et à venir', 'Seulement ceux à venir']);
    expect(lastRequest().cancelLabel).toBe('Annuler');

    await past.askChange({ name: 'Loyer', noun: 'charges', count: 2 });
    expect(lastRequest().message).toBe(
      `2 prélèvements ont déjà eu lieu pour Loyer. Les modifier aussi, ou seulement ceux à venir${space}?`,
    );
  });

  it('asks to change past payments and days, one and many', async () => {
    const past = await choice();
    const seen = [];
    for (const noun of ['payments', 'days'] as const) {
      for (const count of [1, 2]) {
        await past.askChange({ name: 'Auto', noun, count });
        seen.push([lastRequest().title, lastRequest().message]);
      }
    }
    expect(seen).toEqual([
      [
        `Modifier aussi les paiements passés${space}?`,
        `Un paiement a déjà été enregistré pour Auto. Modifier aussi ce paiement, ou seulement ceux à venir${space}?`,
      ],
      [
        `Modifier aussi les paiements passés${space}?`,
        `2 paiements ont déjà été enregistrés pour Auto. Les modifier aussi, ou seulement ceux à venir${space}?`,
      ],
      [
        `Modifier aussi les jours passés${space}?`,
        `Un jour a déjà été noté pour Auto. Modifier aussi ce jour, ou seulement ceux à venir${space}?`,
      ],
      [
        `Modifier aussi les jours passés${space}?`,
        `2 jours ont déjà été notés pour Auto. Les modifier aussi, ou seulement ceux à venir${space}?`,
      ],
    ]);
  });

  it('asks how to delete, one and many, with the keep label per noun', async () => {
    const past = await choice();
    const either = 'Dans les deux cas, rien n’est enregistré après aujourd’hui.';

    await past.askDelete({ name: 'Loyer', noun: 'charges', count: 1 });
    expect(lastRequest().title).toBe(`Supprimer Loyer${space}?`);
    expect(lastRequest().message).toBe(
      `Loyer a un prélèvement passé. Le garder dans ton historique, ou le retirer aussi des mois passés${space}? ${either}`,
    );
    expect(labels(lastRequest())).toEqual(['Garder les prélèvements passés', 'Tout supprimer']);

    await past.askDelete({ name: 'Auto', noun: 'payments', count: 2 });
    expect(lastRequest().message).toBe(
      `Auto a 2 paiements passés. Les garder dans ton historique, ou les retirer aussi des mois passés${space}? ${either}`,
    );
    expect(labels(lastRequest())[0]).toBe('Garder les paiements passés');

    await past.askDelete({ name: 'Café', noun: 'days', count: 1, stopped: true });
    expect(lastRequest().message).toBe(
      `Café a un jour passé. Le garder dans ton historique, ou le retirer aussi des mois passés${space}? ${either}`,
    );
    expect(lastRequest().cancelLabel).toBe('Garder les jours passés');
    await past.askDelete({ name: 'Café', noun: 'days', count: 9 });
    expect(lastRequest().message).toBe(
      `Café a 9 jours passés. Les garder dans ton historique, ou les retirer aussi des mois passés${space}? ${either}`,
    );

    await past.askDelete({ name: 'Loyer', noun: 'charges', count: 0 });
    expect(lastRequest().message).toBe('Cette action est irréversible.');
    expect(labels(lastRequest())).toEqual(['Supprimer']);
  });
});

describe('in the app’s dialog', () => {
  /** Holds the question open, as the root dialog does, until a button is pressed on screen. */
  function openDialog() {
    const open: { request?: DialogRequest; resolve?: (id: string | null) => void } = {};
    mockAsk.mockImplementation(
      (request) =>
        new Promise((resolve) => {
          open.request = request;
          open.resolve = resolve;
        }),
    );
    return async () => render(<ConfirmDialog {...open.request!} onResolve={open.resolve!} />);
  }

  it('reads each choice to VoiceOver as a button and resolves the one pressed', async () => {
    const show = openDialog();
    const past = await choice();
    const answer = past.askDelete({ name: 'Rent', noun: 'charges', count: 2 });
    const screen = await show();

    expect(screen.getByRole('button', { name: 'Keep past charges' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove everything' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Keep past charges' }));
    await expect(answer).resolves.toBe('keep');
  });

  it('Remove everything resolves everything, and the keep words on a stopped plan back out', async () => {
    const show = openDialog();
    const past = await choice();

    const removing = past.askDelete({ name: 'Car', noun: 'payments', count: 2, stopped: true });
    let screen = await show();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove everything' }));
    await expect(removing).resolves.toBe('everything');
    await screen.unmount();

    const keeping = past.askDelete({ name: 'Car', noun: 'payments', count: 2, stopped: true });
    screen = await show();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep past payments' }));
    await expect(keeping).resolves.toBeNull();
  });

  it('Upcoming only resolves upcoming', async () => {
    const show = openDialog();
    const past = await choice();
    const answer = past.askChange({ name: 'Habit', noun: 'days', count: 3 });
    const screen = await show();

    await fireEvent.press(screen.getByRole('button', { name: 'Upcoming only' }));
    await expect(answer).resolves.toBe('upcoming');
  });
});
