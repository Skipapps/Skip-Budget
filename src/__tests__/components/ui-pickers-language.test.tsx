import { act, fireEvent, render } from '@testing-library/react-native';

import { InlineCalendar } from '@/components/flow/inline-calendar';
import { DatePicker } from '@/components/ui/date-picker';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { ReminderField } from '@/components/ui/reminder-field';
import { TimePicker } from '@/components/ui/time-picker';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The pickers' own words, month and weekday names follow the language; what they hand back does not. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    control: '#0000FF',
    onControl: '#FFFFFF',
  }),
}));

// The reminder choices live beside the reminder mutations; nothing here reaches the server.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

// 1 June 2026, a Monday, so "today" in the calendar is a fixed day.
jest.useFakeTimers().setSystemTime(new Date('2026-06-01T09:00:00'));

const NBSP = ' ';
// Two letters at least on each side, so the French "a.m." is not taken for a key.
const RAW_KEY = /^[a-z]{2,}\.[a-zA-Z]{2,}\./;
const PARAM = /\{\w+\}/;

type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function everyLine(tree: Json | Json[] | null): string[] {
  const lines: string[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') {
      lines.push(node);
      return;
    }
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') lines.push(value);
    }
    node.children?.forEach(walk);
  };
  (Array.isArray(tree) ? tree : tree ? [tree] : []).forEach(walk);
  return lines;
}

function expectNoRawText(tree: Json | Json[] | null) {
  const lines = everyLine(tree);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((line) => RAW_KEY.test(line) || PARAM.test(line))).toEqual([]);
}

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

// 14 June 2026, a Sunday.
const JUNE_14 = new Date(2026, 5, 14);

describe('DatePicker', () => {
  it('speaks Spanish, and hands back the same date', async () => {
    setLanguage('es');
    const onConfirm = jest.fn();
    const view = await render(
      <DatePicker value={JUNE_14} onCancel={() => {}} onConfirm={onConfirm} />,
    );

    expect(view.getByText('14 jun 2026')).toBeTruthy();
    expect(view.getByText('ene')).toBeTruthy();
    expect(view.getByText('dic')).toBeTruthy();
    expect(view.getByLabelText('Año siguiente')).toBeTruthy();
    expect(view.getByLabelText('Cerrar el selector de fecha')).toBeTruthy();
    expect(view.getByText('Cancelar')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    await fireEvent.press(view.getByRole('button', { name: 'Siguiente' }));

    expect(view.getByLabelText('Volver a los meses')).toBeTruthy();
    expect(view.getByText('jun 2026')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('sábado 13 de junio de 2026'));
    expectNoRawText(view.toJSON() as Json);

    await fireEvent.press(view.getByRole('button', { name: 'Aceptar' }));
    expect(onConfirm.mock.calls[0][0]).toEqual(new Date(2026, 5, 13));
  });

  it('speaks French', async () => {
    setLanguage('fr');
    const view = await render(
      <DatePicker value={JUNE_14} onCancel={() => {}} onConfirm={() => {}} />,
    );

    expect(view.getByText('14 juin 2026')).toBeTruthy();
    expect(view.getByText('janv.')).toBeTruthy();
    expect(view.getByLabelText('Année précédente')).toBeTruthy();
    expect(view.getByText('Annuler')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Suivant' }));

    expect(view.getByLabelText('Retour aux mois')).toBeTruthy();
    expect(view.getByLabelText('samedi 13 juin 2026')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);
  });
});

describe('InlineCalendar', () => {
  it('names the month, the days and today in Spanish', async () => {
    setLanguage('es');
    const onChange = jest.fn();
    const view = await render(<InlineCalendar value={JUNE_14} onChange={onChange} />);

    expect(view.getByText('junio de 2026')).toBeTruthy();
    expect(view.getByLabelText('junio de 2026. Elige otro mes.')).toBeTruthy();
    expect(view.getByLabelText('Mes anterior')).toBeTruthy();
    expect(view.getByLabelText('Hoy, lunes 1 de junio de 2026')).toBeTruthy();
    // Sunday-first in Spanish: D L M M J V S, martes and miércoles both an M.
    expect(view.getByText('D')).toBeTruthy();
    expect(view.getAllByText('M')).toHaveLength(2);
    expect(view.getByText('Hoy')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    await fireEvent.press(view.getByLabelText('domingo 14 de junio de 2026'));
    expect(onChange.mock.calls[0][0]).toEqual(new Date(2026, 5, 14));

    await fireEvent.press(view.getByLabelText('junio de 2026. Elige otro mes.'));
    expect(view.getByLabelText('septiembre')).toBeTruthy();
    expect(view.getByText('sep')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);
  });

  it('names them in French', async () => {
    setLanguage('fr');
    const view = await render(<InlineCalendar value={JUNE_14} onChange={() => {}} />);

    expect(view.getByText('juin 2026')).toBeTruthy();
    expect(view.getByLabelText('Mois suivant')).toBeTruthy();
    expect(view.getByLabelText('Aujourd’hui, lundi 1 juin 2026')).toBeTruthy();
    expect(view.getByText('Aujourd’hui')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('juin 2026. Choisis un autre mois.'));
    expect(view.getByText('juill.')).toBeTruthy();
    expect(view.getByLabelText('Année suivante')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);
  });
});

describe('TimePicker', () => {
  it('writes the Spanish day halves and hands back the same clock value', async () => {
    setLanguage('es');
    const onConfirm = jest.fn();
    const view = await render(
      <TimePicker value="13:05" onCancel={() => {}} onConfirm={onConfirm} />,
    );

    expect(view.getByText('Elige la hora')).toBeTruthy();
    expect(view.getByText(`a.${NBSP}m.`)).toBeTruthy();
    expect(view.getByLabelText('Hora, 1')).toBeTruthy();
    expect(view.getByLabelText('Minuto, 5')).toBeTruthy();
    expect(view.getByText('Cancelar')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    // The toggle stores AM/PM, not the words on it.
    await fireEvent.press(view.getByLabelText(`a.${NBSP}m.`));
    await fireEvent.press(view.getByLabelText('Confirmar la hora'));
    expect(onConfirm).toHaveBeenCalledWith('01:05');
  });

  it('speaks French', async () => {
    setLanguage('fr');
    const onConfirm = jest.fn();
    const view = await render(
      <TimePicker value="13:05" onCancel={() => {}} onConfirm={onConfirm} />,
    );

    expect(view.getByText('Choisis l’heure')).toBeTruthy();
    expect(view.getByText('p.m.')).toBeTruthy();
    expect(view.getByLabelText('Heure, 1')).toBeTruthy();
    expect(view.getByLabelText('Fermer le sélecteur d’heure')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    await fireEvent.press(view.getByLabelText('Confirmer l’heure'));
    expect(onConfirm).toHaveBeenCalledWith('13:05');
  });
});

describe('ReminderField', () => {
  const field = (time: string) => (
    <ReminderField kind="bill" value="1" onChange={() => {}} time={time} onTimeChange={() => {}} />
  );

  it('says when in Spanish, with "a la" for one o’clock and "a las" otherwise', async () => {
    setLanguage('es');
    const view = await render(field('13:30'));

    expect(view.getByText('Recordatorio')).toBeTruthy();
    expect(view.getByText('Antes de que venza la factura')).toBeTruthy();
    expect(view.getByText('Desactivado')).toBeTruthy();
    expect(view.getByText(`a la 1:30 p.${NBSP}m.`)).toBeTruthy();
    expect(view.getByLabelText(`Hora de envío: 1:30 p.${NBSP}m., cambiar la hora`)).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    await act(async () => view.rerender(field('20:00')));
    expect(view.getByText(`a las 8:00 p.${NBSP}m.`)).toBeTruthy();
  });

  it('says when in French, on the 24-hour clock', async () => {
    setLanguage('fr');
    const view = await render(field('20:00'));

    expect(view.getByText('Rappel')).toBeTruthy();
    expect(view.getByText('à 20 h 00')).toBeTruthy();
    expect(view.getByLabelText('Envoyé à 20 h 00. Changer l’heure.')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);
  });

  it('offers to try again in the language on screen', async () => {
    setLanguage('fr');
    const view = await render(
      <ReminderField
        kind="bill"
        value="1"
        onChange={() => {}}
        time="09:00"
        onTimeChange={() => {}}
        unavailable="Indisponible"
        onRetry={() => {}}
      />,
    );

    expect(view.getByText('Réessayer')).toBeTruthy();
  });
});

describe('RangeDropdown', () => {
  it('reads the window out in Spanish and French', async () => {
    setLanguage('es');
    const spanish = await render(<RangeDropdown value="month" onChange={() => {}} />);
    expect(spanish.getByText('Mes')).toBeTruthy();
    expect(spanish.getByLabelText('Periodo: Mes. Cambiar el periodo.')).toBeTruthy();
    await fireEvent.press(spanish.getByLabelText('Periodo: Mes. Cambiar el periodo.'));
    expect(spanish.getByLabelText('Cerrar')).toBeTruthy();
    expect(spanish.getByText('Todo')).toBeTruthy();
    expectNoRawText(spanish.toJSON() as Json);
    await spanish.unmount();

    setLanguage('fr');
    const onChange = jest.fn();
    const french = await render(<RangeDropdown value="month" onChange={onChange} />);
    expect(french.getByLabelText(`Période${NBSP}: Mois. Changer la période.`)).toBeTruthy();
    await fireEvent.press(french.getByText('Mois'));
    await fireEvent.press(french.getByText('Année'));
    expect(onChange).toHaveBeenCalledWith('year');
  });
});
