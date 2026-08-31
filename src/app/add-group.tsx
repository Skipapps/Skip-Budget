import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { useAddGroupMember, useCreateGroup } from '@/api/splits';
import { GroupIconPicker } from '@/components/splits/group-icon-picker';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { useColors } from '@/providers/theme-provider';

/**
 * Naming a group and choosing how it settles.
 *
 * Two fields, and the second one is a genuine choice rather than a default
 * worth hiding — so it is explained rather than labelled.
 */
export default function AddGroupScreen() {
  const colors = useColors();
  const { names } = useLocalSearchParams<{ names?: string }>();

  // Carried over from the quick calculator, so a one-off split that turned out
  // to be ongoing does not have to be typed in twice.
  const carried = (names ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const [name, setName] = useState('');
  const [simplify, setSimplify] = useState(true);
  // A house rather than the neutral glyph: most groups are a flat or a shared
  // household, and a default that is usually right saves a tap.
  const [iconId, setIconId] = useState('housing');
  const [error, setError] = useState<string | null>(null);

  const createGroup = useCreateGroup();
  const addMember = useAddGroupMember();

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Give the group a name so you can tell it from the others.');
      return;
    }

    try {
      const group = await createGroup.mutateAsync({
        name: name.trim(),
        simplifyDebts: simplify,
        iconId,
      });

      // Added as placeholders — they are names off a calculator, not accounts.
      // Each can be claimed later by whoever it belongs to.
      for (const person of carried) {
        await addMember.mutateAsync({ groupId: group.id, displayName: person });
      }
      // Replace, so backing out of the new group lands on the list rather than
      // on the form that just created it.
      router.replace(`/split-group?id=${group.id}`);
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">New group</Title>
      <Subtitle className="mt-3">
        For the flat, the trip, the thing that keeps going. Everyone in it sees the same running
        total.
      </Subtitle>

      {carried.length > 0 ? (
        <Text
          className="mt-4 w-full font-poppins text-[13px] leading-[19px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {carried.join(', ')} will be added as names. They can claim their own once they are on
          Skip.
        </Text>
      ) : null}

      <View className="mt-8 w-full">
        <TextField
          label="Group name"
          value={name}
          onChangeText={setName}
          placeholder="Barcelona, or Flat 3"
          maxLength={60}
          autoCapitalize="sentences"
        />
      </View>

      <View className="mt-7 w-full">
        <FieldLabel className="mb-3">Icon</FieldLabel>
        <GroupIconPicker value={iconId} onChange={setIconId} />
      </View>

      <View className="mt-7 w-full flex-row items-center gap-4 rounded-[10px] border border-line px-4 py-4">
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-medium text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
            Simplify who pays whom
          </Text>
          <Text
            className="mt-1 font-poppins text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            Collapses chains, so three payments become one. It can ask you to pay somebody you never
            ate with — which is the trade.
          </Text>
        </View>
        <Switch
          value={simplify}
          onValueChange={setSimplify}
          trackColor={{ false: colors.line, true: colors.control }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.line}
        />
      </View>

      {error ? (
        <Text
          className="mt-5 w-full font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-auto w-full pb-8 pt-10">
        <Button
          label={createGroup.isPending ? 'Creating…' : 'Create group'}
          onPress={handleCreate}
          disabled={createGroup.isPending}
        />
      </View>
    </Screen>
  );
}
