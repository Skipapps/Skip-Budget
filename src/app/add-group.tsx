import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAddGroupMember, useCreateGroup } from '@/api/splits';
import { GroupIconPicker } from '@/components/splits/group-icon-picker';
import { StepFlow } from '@/components/flow/step-flow';
import { useProGate } from '@/components/pro/pro-gate';
import { SwitchControl } from '@/components/ui/switch-control';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { success, warn } from '@/lib/haptics';

/**
 * Naming a group and choosing how it settles.
 *
 * Two steps rather than three: a group has no amount and no date, so there is
 * no keypad step to open on. Settling is a genuine choice rather than a
 * default worth hiding, which is why it gets a step of its own to be explained
 * on instead of a switch buried under the name.
 */
export default function AddGroupScreen() {
  // A wrapper, not an inline return: the screen below runs its own
  // hooks, and an early return above them would change the hook count
  // the moment the entitlement answer arrives — which React forbids.
  const gate = useProGate('splits');
  if (gate) return gate;
  return <AddGroupScreenInner />;
}

function AddGroupScreenInner() {
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
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const createGroup = useCreateGroup();
  const addMember = useAddGroupMember();

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      // The name lives on the first step, so that is where the message goes.
      warn();
      setError({ message: 'Give the group a name so you can tell it from the others.', step: 0 });
      setStep(0);
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
      success();
      router.replace(`/split-group?id=${group.id}`);
    } catch (thrown) {
      warn();
      setError({ message: (thrown as Error).message, step: 1 });
    }
  };

  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title="New group"
      steps={2}
      current={step}
      onBack={() => {
        setError(null);
        if (step === 0) router.back();
        else setStep(0);
      }}
      question={step === 0 ? 'What is the group called?' : 'How should the group settle up?'}
      primaryLabel={step === 0 ? 'Continue' : createGroup.isPending ? 'Creating…' : 'Create group'}
      primaryDisabled={step === 0 ? !name.trim() : createGroup.isPending}
      onPrimary={() => {
        if (step === 0) {
          setError(null);
          setStep(1);
          return;
        }
        void handleCreate();
      }}
      error={step === 1 ? stepError : null}
      avoidKeyboard={step === 0}
    >
      {step === 0 ? (
        <View className="w-full gap-7">
          {carried.length > 0 ? (
            <Text
              className="w-full font-poppins text-[13px] leading-[19px] text-muted"
              maxFontSizeMultiplier={1.4}
            >
              {carried.join(', ')} will be added as names. They can claim their own once they are on
              Skip.
            </Text>
          ) : null}

          <TextField
            label="Group name"
            value={name}
            onChangeText={setName}
            placeholder="Barcelona, or Flat 3"
            maxLength={60}
            autoCapitalize="sentences"
          />

          <View className="w-full">
            <FieldLabel className="mb-3">Icon</FieldLabel>
            <GroupIconPicker value={iconId} onChange={setIconId} />
          </View>

          {stepError ? (
            <Text
              className="w-full font-poppins text-[13px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="w-full">
          <View className="w-full flex-row items-center gap-4 rounded-[16px] bg-ink/5 px-4 py-4">
            <View className="min-w-0 flex-1">
              <Text
                className="font-poppins-medium text-[15px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                Simplify who pays whom
              </Text>
              <Text
                className="mt-1 font-poppins text-[12px] leading-[17px] text-muted"
                maxFontSizeMultiplier={1.3}
              >
                Collapses chains, so three payments become one. It can ask you to pay somebody you
                never ate with — which is the trade.
              </Text>
            </View>
            <SwitchControl
              value={simplify}
              onValueChange={setSimplify}
              accessibilityLabel="Simplify who pays whom"
            />
          </View>

          <Text
            className="mt-5 w-full font-poppins text-[13px] leading-[19px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            For the flat, the trip, the thing that keeps going. Everyone in it sees the same running
            total.
          </Text>
        </View>
      )}
    </StepFlow>
  );
}
