import { router } from 'expo-router';
import { Calculator, ChevronRight, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useFriendRequests, useFriends, useGroups, useMyBalances } from '@/api/splits';
import { ActionPill } from '@/components/ui/action-pill';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Title } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

/**
 * Everything shared, in one place.
 *
 * The quick calculator stays at the top and stays stateless. Most split bills
 * are one restaurant with people you will not split with again, and making that
 * cost a group — named, joined, later archived — would be a worse app for the
 * commonest case. Groups are for the flat, the trip, the ongoing thing.
 */
export default function SplitsScreen() {
  const colors = useColors();
  const artwork = useArtwork();

  const { data: groups = [], isLoading, isError, refetch } = useGroups();
  const { data: balances } = useMyBalances();
  const { data: friends = [] } = useFriends();
  const { data: requests } = useFriendRequests();

  const waiting = requests?.incoming.length ?? 0;
  const live = groups.filter((group) => !group.archived_at);

  return (
    <Screen showBack>
      <View className="mt-2 w-full flex-row items-center justify-between gap-3">
        <Title align="left" className="flex-1">
          Splits
        </Title>
        <ActionPill label="New group" onPress={() => router.push('/add-group')} />
      </View>

      {/* Two ways in, and the quick one first because it is the common one. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick split. Work out a bill without saving anything."
        onPress={() => router.push('/split-calculator')}
        className="mt-6 w-full flex-row items-center gap-3 rounded-[10px] border border-line px-4 py-4 active:bg-ink/5"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-ink/5">
          <Calculator size={20} color={colors.ink} strokeWidth={1.9} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
            Quick split
          </Text>
          <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            Work out one bill. Nothing is saved and nobody is told.
          </Text>
        </View>
        <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          waiting > 0
            ? `Friends. ${waiting} request${waiting === 1 ? '' : 's'} waiting.`
            : `Friends. ${friends.length} on Skip.`
        }
        onPress={() => router.push('/friends')}
        className="mt-3 w-full flex-row items-center gap-3 rounded-[10px] border border-line px-4 py-4 active:bg-ink/5"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-ink/5">
          <Users size={20} color={colors.ink} strokeWidth={1.9} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
            Friends
          </Text>
          <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            {friends.length === 0
              ? 'Share your code to start splitting with people'
              : `${friends.length} on Skip`}
          </Text>
        </View>
        {waiting > 0 ? (
          <View className="h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5">
            <Text
              allowFontScaling={false}
              className="font-poppins-medium text-[12px] text-on-control"
            >
              {waiting}
            </Text>
          </View>
        ) : (
          <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
        )}
      </Pressable>

      {isLoading ? <SkeletonList rows={3} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title="Could not load your groups"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : null}

      {!isLoading && !isError && live.length === 0 ? (
        <PageState
          art={artwork.tileSplitCalculator}
          title="No groups yet"
          message="A group is for the flat, the trip, the thing that keeps going. Everyone in it sees the same running total."
          actionLabel="Create a group"
          onAction={() => router.push('/add-group')}
        />
      ) : null}

      {live.length > 0 ? (
        <View className="mt-9 w-full">
          <Text className="font-poppins-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
            Groups
          </Text>
          <View className="mt-1 h-px w-full bg-line" />

          {live.map((group) => (
            <GroupRow
              key={group.id}
              name={group.name}
              balance={balances?.get(group.id) ?? 0}
              onPress={() => router.push(`/split-group?id=${group.id}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * One group, and where you stand in it.
 *
 * The figure is the point of the row, so it says which way it goes in words
 * rather than relying on a sign a glance can miss. Being square gets its own
 * wording — "$0.00" reads like a group nobody has used.
 */
function GroupRow({
  name,
  balance,
  onPress,
}: {
  name: string;
  balance: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const settled = Math.abs(balance) < 0.005;
  const owed = balance > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        settled
          ? `${name}. All settled up.`
          : `${name}. You ${owed ? 'are owed' : 'owe'} ${formatCurrency(Math.abs(balance))}.`
      }
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-4 active:bg-ink/5"
    >
      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {name}
        </Text>
        <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {settled ? 'All settled up' : owed ? 'you are owed' : 'you owe'}
        </Text>
      </View>

      {settled ? null : (
        <Text
          className={
            owed
              ? 'font-poppins-semibold text-[15px] text-accent-ink'
              : 'font-poppins-semibold text-[15px] text-ink'
          }
          maxFontSizeMultiplier={1.3}
        >
          {formatCurrency(Math.abs(balance))}
        </Text>
      )}
      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
