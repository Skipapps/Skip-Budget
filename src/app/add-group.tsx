import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { usePro } from '@/api/pro';
import { useAddGroupMember, useCreateGroup, useGroups } from '@/api/splits';
import { GroupIconPicker } from '@/components/splits/group-icon-picker';
import { StepFlow } from '@/components/flow/step-flow';
import { SwitchControl } from '@/components/ui/switch-control';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { success, warn } from '@/lib/haptics';
import { failureMessage } from '@/lib/failure';
import { FREE_LIMITS } from '@/lib/wall';
import { useUserId } from '@/providers/session-provider';

/** Two steps: a group has no amount or date, and how it settles is a choice worth explaining. */
export default function AddGroupScreen() {
  // Deep-link guard: a second open group past the free allowance opens Pro instead of a form the
  // database would refuse. Groups you merely joined are not counted, a closed group frees the
  // slot, and joining, spending and settling are never gated. Wrapper-shaped so the hook count
  // never changes.
  const { pro, ready } = usePro();
  const userId = useUserId();
  const groups = useGroups();
  const openMine = (groups.data ?? []).filter(
    (group) => group.created_by === userId && !group.archived_at,
  ).length;
  if (ready && !pro && openMine >= FREE_LIMITS.openGroups) {
    return <Redirect href={{ pathname: '/pro-feature', params: { id: 'splits' } }} />;
  }
  return <AddGroupScreenInner />;
}

function AddGroupScreenInner() {
  const { names } = useLocalSearchParams<{ names?: string }>();

  // Carried over from the quick calculator.
  const carried = (names ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const [name, setName] = useState('');
  const [simplify, setSimplify] = useState(true);
  const [iconId, setIconId] = useState('housing');
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const createGroup = useCreateGroup();
  const addMember = useAddGroupMember();

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
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

      // Placeholders (names off a calculator, not accounts); claimable later by whoever they are.
      for (const person of carried) {
        await addMember.mutateAsync({ groupId: group.id, displayName: person });
      }
      // Replace, so backing out of the new group lands on the list, not this form.
      success();
      router.replace(`/split-group?id=${group.id}`);
    } catch (thrown) {
      warn();
      setError({ message: failureMessage(thrown), step: 1 });
    }
  };

  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title="New group"
      closePrompt="Cancel adding this group?"
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
