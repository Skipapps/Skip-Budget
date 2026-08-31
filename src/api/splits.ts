import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Reads and writes for the shared side of Skip.
 *
 * Everything else in the app belongs to one account, so its queries never
 * filter by user — the policies already do. That still holds here, but the
 * policies are answering a harder question: not "is this yours" but "do you
 * share a group with whoever wrote it".
 *
 * Writes go through database functions rather than table inserts. A friendship
 * is only created by accepting a request; an expense and its shares have to
 * land in one transaction or the shares will not add up. Neither of those is
 * something a row policy can express, so neither table is directly writable.
 */

// --- Shapes -----------------------------------------------------------------

export type FriendRow = {
  id: string;
  display_name: string | null;
  avatar_id: string | null;
};

export type FriendRequestRow = {
  id: string;
  from_user: string;
  to_user: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  profile: FriendRow | null;
};

export type GroupRow = {
  id: string;
  name: string;
  icon_id: string | null;
  currency: string;
  simplify_debts: boolean;
  invite_code: string | null;
  archived_at: string | null;
  /** Null once whoever made it deleted their account. */
  created_by: string | null;
};

export type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string | null;
  role: 'owner' | 'member';
  profile: FriendRow | null;
};

export type ExpenseRow = {
  id: string;
  group_id: string;
  paid_by: string;
  amount: number;
  description: string;
  category_id: string | null;
  spent_on: string;
  split_mode: 'equal' | 'exact';
  /** Null once whoever recorded it deleted their account. */
  created_by: string | null;
  splits: { member_id: string; share: number }[];
};

export type SettlementRow = {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  settled_on: string;
  note: string | null;
};

export type BalanceRow = {
  member_id: string;
  user_id: string | null;
  display_name: string | null;
  balance: number;
};

/** What to call a member: their group nickname, their profile, or a fallback. */
export function memberName(member: GroupMemberRow | undefined | null): string {
  if (!member) return 'Someone';
  return member.display_name || member.profile?.display_name || 'Someone';
}

/** A placeholder has no account and so no picture — the fallback face stands in. */
export function memberAvatar(member: GroupMemberRow | undefined | null): string | null {
  return member?.profile?.avatar_id ?? null;
}

// --- Me ---------------------------------------------------------------------

/** Your own invite code, which is the whole of how somebody adds you. */
export function useMyInviteCode() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['invite-code', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<{ code: string | null; discoverable: boolean }> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('invite_code, discoverable')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return { code: data?.invite_code ?? null, discoverable: data?.discoverable ?? true };
    },
  });
}

// --- Friends ----------------------------------------------------------------

export function useFriends() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['friends', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FriendRow[]> => {
      const { data, error } = await supabase.from('friendships').select('user_a, user_b');
      if (error) throw error;

      // The pair is stored lowest-uuid-first, so which column holds the friend
      // depends on where you sort — hence the flip rather than a filter.
      const ids = (data ?? []).map((row) => (row.user_a === userId ? row.user_b : row.user_a));
      if (ids.length === 0) return [];

      const { data: people, error: peopleError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_id')
        .in('id', ids);
      if (peopleError) throw peopleError;

      return (people ?? []) as FriendRow[];
    },
  });
}

/** Requests waiting on you, and the ones you have sent and not heard back on. */
export function useFriendRequests() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['friend-requests', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<{ incoming: FriendRequestRow[]; outgoing: FriendRequestRow[] }> => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, from_user, to_user, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      const others = rows.map((row) => (row.from_user === userId ? row.to_user : row.from_user));

      // Profiles of people who are not yet friends are readable only because a
      // pending request between you is itself a reason to see a name.
      const byId = new Map<string, FriendRow>();
      if (others.length > 0) {
        const { data: people } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_id')
          .in('id', others);
        for (const person of people ?? []) byId.set(person.id, person as FriendRow);
      }

      const shape = (row: (typeof rows)[number]): FriendRequestRow => ({
        ...(row as Omit<FriendRequestRow, 'profile'>),
        profile: byId.get(row.from_user === userId ? row.to_user : row.from_user) ?? null,
      });

      return {
        incoming: rows.filter((row) => row.to_user === userId).map(shape),
        outgoing: rows.filter((row) => row.from_user === userId).map(shape),
      };
    },
  });
}

// --- Groups -----------------------------------------------------------------

export function useGroups() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['groups', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, icon_id, currency, simplify_debts, invite_code, archived_at, created_by')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GroupRow[];
    },
  });
}

export function useGroup(groupId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['group', groupId, userId],
    enabled: Boolean(userId && groupId),
    queryFn: async (): Promise<GroupRow | null> => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, icon_id, currency, simplify_debts, invite_code, archived_at, created_by')
        .eq('id', groupId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as GroupRow | null;
    },
  });
}

export function useGroupMembers(groupId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['group-members', groupId, userId],
    enabled: Boolean(userId && groupId),
    queryFn: async (): Promise<GroupMemberRow[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, display_name, role, joined_at')
        .eq('group_id', groupId!)
        .order('joined_at', { ascending: true });
      if (error) throw error;

      const rows = data ?? [];
      const userIds = rows.map((row) => row.user_id).filter((id): id is string => Boolean(id));

      const byId = new Map<string, FriendRow>();
      if (userIds.length > 0) {
        const { data: people } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_id')
          .in('id', userIds);
        for (const person of people ?? []) byId.set(person.id, person as FriendRow);
      }

      return rows.map((row) => ({
        ...row,
        profile: row.user_id ? (byId.get(row.user_id) ?? null) : null,
      })) as GroupMemberRow[];
    },
  });
}

// --- The ledger -------------------------------------------------------------

export function useGroupExpenses(groupId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['group-expenses', groupId, userId],
    enabled: Boolean(userId && groupId),
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          'id, group_id, paid_by, amount, description, category_id, spent_on, split_mode, created_by, expense_splits (member_id, share)',
        )
        .eq('group_id', groupId!)
        .is('deleted_at', null)
        .order('spent_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row) => {
        const { expense_splits: splits, ...rest } = row as typeof row & {
          expense_splits: { member_id: string; share: number }[];
        };
        return { ...rest, splits: splits ?? [] } as ExpenseRow;
      });
    },
  });
}

export function useGroupSettlements(groupId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['group-settlements', groupId, userId],
    enabled: Boolean(userId && groupId),
    queryFn: async (): Promise<SettlementRow[]> => {
      const { data, error } = await supabase
        .from('settlements')
        .select('id, group_id, from_member, to_member, amount, settled_on, note')
        .eq('group_id', groupId!)
        .is('deleted_at', null)
        .order('settled_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SettlementRow[];
    },
  });
}

/**
 * Who is up and who is down.
 *
 * Read from a view that recomputes it from the ledger every time. There is no
 * stored balance anywhere and there must not be — see the note on the view.
 */
export function useGroupBalances(groupId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['group-balances', groupId, userId],
    enabled: Boolean(userId && groupId),
    queryFn: async (): Promise<BalanceRow[]> => {
      const { data, error } = await supabase
        .from('group_balances')
        .select('member_id, user_id, display_name, balance')
        .eq('group_id', groupId!);
      if (error) throw error;
      return (data ?? []) as BalanceRow[];
    },
  });
}

/**
 * Your own balance in every group at once.
 *
 * One query rather than one per group: the list screen needs a figure beside
 * each row, and asking separately for each would make opening the screen cost
 * a request per group someone belongs to.
 */
export function useMyBalances() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['group-balances', 'mine', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('group_balances')
        .select('group_id, balance')
        .eq('user_id', userId!);
      if (error) throw error;
      return new Map((data ?? []).map((row) => [row.group_id as string, Number(row.balance)]));
    },
  });
}

// --- Writes -----------------------------------------------------------------

/**
 * Which caches a change touches.
 *
 * Coarser than it could be, deliberately. An expense moves the balances, the
 * expense list and the group's summary line, and working out which of those a
 * particular edit did not affect is a way to be subtly wrong about what is on
 * screen for the sake of a request that costs milliseconds.
 */
const LEDGER_KEYS = ['group-expenses', 'group-settlements', 'group-balances', 'groups'];

function useSplitInvalidate() {
  const client = useQueryClient();
  return (keys: string[]) => {
    for (const key of keys) client.invalidateQueries({ queryKey: [key] });
  };
}

/** Wraps an rpc so a Postgres `raise exception` reaches the UI as its message. */
async function callRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function useAddFriendByCode() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (code: string) =>
      callRpc<{ friend_id: string; display_name: string | null; outcome: string }[]>(
        'request_friend_by_code',
        { p_code: code },
      ),
    onSuccess: () => invalidate(['friends', 'friend-requests']),
  });
}

export function useRespondToFriendRequest() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      callRpc<string>('respond_to_friend_request', { p_request_id: id, p_accept: accept }),
    onSuccess: () => invalidate(['friends', 'friend-requests']),
  });
}

export function useRemoveFriend() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (otherId: string) => callRpc<void>('remove_friend', { p_other: otherId }),
    onSuccess: () => invalidate(['friends', 'friend-requests']),
  });
}

export function useCreateGroup() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (values: {
      name: string;
      currency?: string;
      simplifyDebts?: boolean;
      iconId?: string | null;
    }) =>
      callRpc<GroupRow>('create_group', {
        p_name: values.name,
        p_currency: values.currency ?? 'USD',
        p_simplify_debts: values.simplifyDebts ?? true,
        p_icon_id: values.iconId ?? null,
      }),
    onSuccess: () => invalidate(['groups']),
  });
}

export function useAddGroupMember() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (values: {
      groupId: string;
      userId?: string | null;
      displayName?: string | null;
    }) =>
      callRpc<GroupMemberRow>('add_group_member', {
        p_group_id: values.groupId,
        p_user_id: values.userId ?? null,
        p_display_name: values.displayName ?? null,
      }),
    onSuccess: () => invalidate(['group-members', 'group-balances']),
  });
}

export function useJoinGroupByCode() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (values: { code: string; claimMemberId?: string | null }) =>
      callRpc<GroupRow>('join_group_by_code', {
        p_code: values.code,
        p_claim_member_id: values.claimMemberId ?? null,
      }),
    onSuccess: () => invalidate([...LEDGER_KEYS, 'group-members']),
  });
}

export function useRemoveGroupMember() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (memberId: string) =>
      callRpc<void>('remove_group_member', { p_member_id: memberId }),
    onSuccess: () => invalidate([...LEDGER_KEYS, 'group-members']),
  });
}

/** Rename, or change how it settles. Owner-only, enforced by the group policy. */
export function useUpdateGroup() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: async (values: {
      id: string;
      name?: string;
      simplifyDebts?: boolean;
      iconId?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (values.name !== undefined) patch.name = values.name;
      if (values.simplifyDebts !== undefined) patch.simplify_debts = values.simplifyDebts;
      if (values.iconId !== undefined) patch.icon_id = values.iconId;

      const { error } = await supabase.from('groups').update(patch).eq('id', values.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(['groups', 'group']),
  });
}

/**
 * Close a group without deleting it.
 *
 * A holiday that ended still has to answer what everyone paid, and other
 * people's balances refer to its rows. Archiving takes it off the list and
 * leaves the history where it is.
 */
export function useArchiveGroup() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groups')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(['groups', 'group']),
  });
}

export type ExpenseInput = {
  groupId: string;
  paidBy: string;
  amount: number;
  description: string;
  shares: { memberId: string; share: number }[];
  spentOn: string;
  splitMode: 'equal' | 'exact';
  categoryId?: string | null;
};

/** One call, so the expense and its shares cannot land apart. */
export function useRecordExpense() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (values: ExpenseInput) =>
      callRpc<string>('record_expense', {
        p_group_id: values.groupId,
        p_paid_by: values.paidBy,
        p_amount: values.amount,
        p_description: values.description,
        p_shares: values.shares.map((entry) => ({
          member_id: entry.memberId,
          share: entry.share,
        })),
        p_spent_on: values.spentOn,
        p_split_mode: values.splitMode,
        p_category_id: values.categoryId ?? null,
      }),
    onSuccess: () => invalidate(LEDGER_KEYS),
  });
}

export function useUpdateExpense() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (values: ExpenseInput & { id: string }) =>
      callRpc<void>('update_expense', {
        p_expense_id: values.id,
        p_paid_by: values.paidBy,
        p_amount: values.amount,
        p_description: values.description,
        p_shares: values.shares.map((entry) => ({
          member_id: entry.memberId,
          share: entry.share,
        })),
        p_spent_on: values.spentOn,
        p_split_mode: values.splitMode,
        p_category_id: values.categoryId ?? null,
      }),
    onSuccess: () => invalidate(LEDGER_KEYS),
  });
}

export function useDeleteExpense() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (id: string) => callRpc<void>('delete_expense', { p_expense_id: id }),
    onSuccess: () => invalidate(LEDGER_KEYS),
  });
}

export function useRecordSettlement() {
  const invalidate = useSplitInvalidate();
  return useMutation({
    mutationFn: (values: {
      groupId: string;
      fromMember: string;
      toMember: string;
      amount: number;
      settledOn: string;
      note?: string | null;
    }) =>
      callRpc<string>('record_settlement', {
        p_group_id: values.groupId,
        p_from_member: values.fromMember,
        p_to_member: values.toMember,
        p_amount: values.amount,
        p_settled_on: values.settledOn,
        p_note: values.note ?? null,
      }),
    onSuccess: () => invalidate(LEDGER_KEYS),
  });
}
