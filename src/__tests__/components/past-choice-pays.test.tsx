import { act, renderHook } from '@testing-library/react-native';

import type { DialogRequest } from '@/components/ui/confirm-dialog';
import { usePastChoice } from '@/components/ui/past-choice';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * A salary's past is its pays. Pinned: the delete and change questions word them in English,
 * Spanish and French, one and many; French asks about changes with a masculine noun, as the two
 * shared answers under it are masculine; the other nouns are untouched by the new one.
 */

const mockAsk = jest.fn<Promise<string | null>, [DialogRequest]>();
jest.mock('@/providers/dialog-provider', () => ({
  useDialog: () => (request: DialogRequest) => mockAsk(request),
}));

const NBSP = ' ';

async function choice(language: Language = 'en') {
  await act(async () => setLanguage(language));
  const { result } = await renderHook(() => usePastChoice());
  return result.current;
}

function lastRequest(): DialogRequest {
  return mockAsk.mock.calls.at(-1)![0];
}

const labels = (request: DialogRequest) => (request.actions ?? []).map((action) => action.label);

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockAsk.mockResolvedValue(null);
});

afterAll(() => resetLocaleForTests());

describe('askDelete with pays', () => {
  it('keeps past pay first, in English, one and many', async () => {
    mockAsk.mockResolvedValue('keep');
    const past = await choice();

    await expect(past.askDelete({ name: 'Acme', noun: 'pays', count: 1 })).resolves.toBe('keep');
    expect(lastRequest().title).toBe('Delete Acme?');
    expect(lastRequest().message).toBe(
      'Acme has paid you once. Keep that pay in your history, or remove it from past months too? Either way, nothing after today is recorded.',
    );
    expect(labels(lastRequest())).toEqual(['Keep past pay', 'Remove everything']);

    await past.askDelete({ name: 'Acme', noun: 'pays', count: 6 });
    expect(lastRequest().message).toBe(
      'Acme has paid you 6 times. Keep that pay in your history, or remove it from past months too? Either way, nothing after today is recorded.',
    );
  });

  it('is the plain Delete with nothing on record', async () => {
    mockAsk.mockResolvedValue('everything');
    const past = await choice();

    await expect(past.askDelete({ name: 'Acme', noun: 'pays', count: 0 })).resolves.toBe(
      'everything',
    );
    expect(lastRequest().message).toBe('This can’t be undone.');
    expect(labels(lastRequest())).toEqual(['Delete']);
  });

  it('words it in Spanish', async () => {
    const past = await choice('es');
    await past.askDelete({ name: 'Acme', noun: 'pays', count: 1 });
    expect(lastRequest().message).toBe(
      'Acme te pagó una vez. ¿Conservar ese pago en tu historial o quitarlo también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
    );
    await past.askDelete({ name: 'Acme', noun: 'pays', count: 2 });
    expect(lastRequest().message).toBe(
      'Acme te pagó 2 veces. ¿Conservar esos pagos en tu historial o quitarlos también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
    );
    expect(labels(lastRequest())).toEqual(['Conservar los pagos anteriores', 'Eliminar todo']);
  });

  it('words it in French, with the no-break space before the question mark', async () => {
    const past = await choice('fr');
    await past.askDelete({ name: 'Acme', noun: 'pays', count: 1 });
    expect(lastRequest().message).toBe(
      `Acme t’a payé une fois. Garder cette paie dans ton historique, ou la retirer aussi des mois passés${NBSP}? Dans les deux cas, rien n’est enregistré après aujourd’hui.`,
    );
    await past.askDelete({ name: 'Acme', noun: 'pays', count: 2 });
    expect(lastRequest().message).toBe(
      `Acme t’a payé 2 fois. Garder ces paies dans ton historique, ou les retirer aussi des mois passés${NBSP}? Dans les deux cas, rien n’est enregistré après aujourd’hui.`,
    );
    expect(labels(lastRequest())).toEqual(['Garder les paies passées', 'Tout supprimer']);
  });
});

describe('askChange with pays', () => {
  it('words it in English', async () => {
    const past = await choice();
    await past.askChange({ name: 'Acme', noun: 'pays', count: 3 });
    expect(lastRequest().title).toBe('Change past pay too?');
    expect(lastRequest().message).toBe(
      'Acme has already paid you 3 times. Change those as well, or only the pay still to come?',
    );
  });

  it('words it in Spanish', async () => {
    const past = await choice('es');
    await past.askChange({ name: 'Acme', noun: 'pays', count: 1 });
    expect(lastRequest().title).toBe('¿Cambiar también los pagos anteriores?');
    expect(lastRequest().message).toBe(
      'Acme ya te pagó una vez. ¿Cambiar también ese pago o solo los próximos?',
    );
  });

  it('words it in French with a masculine noun, so the shared answers agree', async () => {
    const past = await choice('fr');
    await past.askChange({ name: 'Acme', noun: 'pays', count: 2 });
    expect(lastRequest().title).toBe(`Modifier aussi les versements passés${NBSP}?`);
    expect(lastRequest().message).toBe(
      `2 versements ont déjà été reçus de Acme. Les modifier aussi, ou seulement ceux à venir${NBSP}?`,
    );
    expect(labels(lastRequest())).toEqual(['Passés et à venir', 'Seulement ceux à venir']);
  });
});

it('leaves the other nouns as they were', async () => {
  const past = await choice();
  await past.askDelete({ name: 'Rent', noun: 'charges', count: 2 });
  expect(labels(lastRequest())).toEqual(['Keep past charges', 'Remove everything']);
  await past.askDelete({ name: 'Car', noun: 'payments', count: 2 });
  expect(labels(lastRequest())).toEqual(['Keep past payments', 'Remove everything']);
  await past.askDelete({ name: 'Coffee', noun: 'days', count: 2 });
  expect(labels(lastRequest())).toEqual(['Keep past days', 'Remove everything']);
});
