import { defineMessages, pluralForm, translate } from '@/i18n/translate';

const messages = defineMessages({
  'x.plain': { en: 'Save', es: 'Guardar', fr: 'Enregistrer' },
  'x.name': { en: 'Hello, {name}', es: 'Hola, {name}', fr: 'Bonjour, {name}' },
  'x.bills': {
    en: { one: '{count} bill', other: '{count} bills' },
    es: { one: '{count} factura', other: '{count} facturas' },
    fr: { one: '{count} facture', other: '{count} factures' },
  },
});

describe('translate', () => {
  it('returns the line in the chosen language', () => {
    expect(translate('en', messages, 'x.plain')).toBe('Save');
    expect(translate('es', messages, 'x.plain')).toBe('Guardar');
    expect(translate('fr', messages, 'x.plain')).toBe('Enregistrer');
  });

  it('fills named parameters, every occurrence', () => {
    expect(translate('es', messages, 'x.name', { name: 'Ana' })).toBe('Hola, Ana');
  });

  it('leaves an unfilled token visible rather than printing "undefined"', () => {
    expect(translate('en', messages, 'x.name')).toBe('Hello, {name}');
    expect(translate('en', messages, 'x.name', { other: 'x' })).toBe('Hello, {name}');
  });

  it('chooses the singular or plural form by count', () => {
    expect(translate('en', messages, 'x.bills', { count: 1 })).toBe('1 bill');
    expect(translate('en', messages, 'x.bills', { count: 0 })).toBe('0 bills');
    expect(translate('es', messages, 'x.bills', { count: 2 })).toBe('2 facturas');
  });

  it('counts French zero as singular', () => {
    expect(translate('fr', messages, 'x.bills', { count: 0 })).toBe('0 facture');
    expect(translate('fr', messages, 'x.bills', { count: 1 })).toBe('1 facture');
    expect(translate('fr', messages, 'x.bills', { count: 2 })).toBe('2 factures');
  });

  it('shows the key for a key that does not exist', () => {
    expect(translate('en', messages, 'x.missing')).toBe('x.missing');
  });
});

describe('pluralForm', () => {
  it('follows each language', () => {
    expect(pluralForm('en', 1)).toBe('one');
    expect(pluralForm('en', 0)).toBe('other');
    expect(pluralForm('es', 1)).toBe('one');
    expect(pluralForm('es', 0)).toBe('other');
    expect(pluralForm('fr', 0)).toBe('one');
    expect(pluralForm('fr', 1)).toBe('one');
    expect(pluralForm('fr', 2)).toBe('other');
  });
});
