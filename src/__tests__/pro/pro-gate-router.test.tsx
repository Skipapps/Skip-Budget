import { router, Stack, useLocalSearchParams } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ProFeatureRedirect, useProGate } from '@/components/pro/pro-gate';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * The gate in expo-router's real stack: the explainer is told this page's own route, params and
 * all, even when the answer arrives while another page is on top; and a page opened with Pro is
 * never swapped for the explainer when Pro lapses under it.
 */

// RevenueCat's bundle does not load under Jest; the real usePro() reads this same store.
jest.mock('@/api/pro', () => ({
  usePro: () => jest.requireActual('@/lib/pro-status').useProStatus(),
}));

/** Stands in for the explainer: says where it was told to go. */
function Explainer() {
  const { id, next } = useLocalSearchParams<{ id?: string; next?: string }>();
  return <Text>{`explainer ${id} → ${next ?? 'back'}`}</Text>;
}

/** The second account's wall, as add-account draws it once it has counted. */
const AddAccountWall = () => <ProFeatureRedirect featureId="unlimited" />;

function ExportPage() {
  const gate = useProGate('export');
  if (gate) return gate;
  return <Text>export page</Text>;
}

/** A form behind the gate, as habit-new is: Save meets the database's Pro wall as free. */
function HabitForm() {
  const gate = useProGate('habits');
  const [name, setName] = useState('');
  if (gate) return gate;
  const save = () => {
    publishProStatus({ pro: false, ready: true });
    router.push({ pathname: '/pro-feature', params: { id: 'habits' } });
  };
  return (
    <View>
      <TextInput accessibilityLabel="Name" value={name} onChangeText={setName} />
      <Pressable accessibilityRole="button" accessibilityLabel="Save" onPress={save} />
    </View>
  );
}

const FILES = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  index: () => <Text>home</Text>,
  terms: () => <Text>terms page</Text>,
  'add-account': AddAccountWall,
  'payment-export': ExportPage,
  'habit-new': HabitForm,
  'pro-feature': Explainer,
};

/** renderRouter's route getters land on its promise under RNTL 14; keep hold of them. */
async function open() {
  const routed = renderRouter(FILES, { initialUrl: '/' });
  await routed;
  return {
    pathname: () => routed.getPathname(),
    params: () => routed.getSearchParams(),
  };
}

beforeEach(() => resetProStatusForTests());
afterAll(() => resetProStatusForTests());

describe('the gate in the real stack', () => {
  it('sends the salary flow’s second account to the explainer, told to reopen it with from=salary', async () => {
    publishProStatus({ pro: false, ready: true });
    const app = await open();

    await act(() => router.push('/add-account?from=salary'));

    expect(app.pathname()).toBe('/pro-feature');
    expect(app.params()).toEqual({ id: 'unlimited', next: '/add-account?from=salary' });
    expect(screen.getByText('explainer unlimited → /add-account?from=salary')).toBeTruthy();
  });

  it('tells the explainer its own page, not the one on top, when free is heard while covered', async () => {
    const app = await open();
    await act(() => router.push('/payment-export?kind=bill&year=2025'));
    await act(() => router.push('/terms'));

    await act(async () => publishProStatus({ pro: false, ready: true }));
    expect(app.pathname()).toBe('/terms');

    await act(() => router.back());
    expect(app.pathname()).toBe('/pro-feature');
    expect(app.params()).toEqual({ id: 'export', next: '/payment-export?kind=bill&year=2025' });
  });

  it('keeps a form opened with Pro, and what was typed, when its save is refused as free', async () => {
    publishProStatus({ pro: true, ready: true });
    const app = await open();
    await act(() => router.push('/habit-new'));
    await act(async () => fireEvent.changeText(screen.getByLabelText('Name'), 'Morning coffee'));

    await act(async () => fireEvent.press(screen.getByLabelText('Save')));
    expect(app.pathname()).toBe('/pro-feature');
    expect(app.params()).toEqual({ id: 'habits' });

    await act(() => router.back());
    expect(app.pathname()).toBe('/habit-new');
    expect(screen.getByDisplayValue('Morning coffee')).toBeTruthy();
  });

  it('waits while Pro is unknown, then opens for Pro without ever showing the explainer', async () => {
    const app = await open();
    await act(() => router.push('/payment-export?kind=all&year=all'));
    expect(app.pathname()).toBe('/payment-export');
    expect(screen.queryByText('export page')).toBeNull();

    await act(async () => publishProStatus({ pro: true, ready: true }));
    expect(app.pathname()).toBe('/payment-export');
    expect(screen.getByText('export page')).toBeTruthy();
    expect(screen.queryByText(/explainer/)).toBeNull();
  });

  it('opens a page for Pro and stays on it when Pro lapses', async () => {
    publishProStatus({ pro: true, ready: true });
    const app = await open();
    await act(() => router.push('/payment-export?kind=all&year=all'));
    expect(screen.getByText('export page')).toBeTruthy();

    await act(async () => publishProStatus({ pro: false, ready: true }));
    expect(app.pathname()).toBe('/payment-export');
    expect(screen.getByText('export page')).toBeTruthy();
  });
});
