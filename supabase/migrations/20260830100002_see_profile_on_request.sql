-- 0002 · A request you cannot put a name to
--
-- can_see_profile allowed three cases: yourself, a friend, and somebody you
-- share a group with. A pending friend request is none of them, so between
-- sending one and it being accepted neither person could read the other's row
-- — and the screen fell back to "Someone on Skip" for both of them.
--
-- Which makes the request unanswerable. Deciding whether to accept is the one
-- moment the name and the face matter most, and it was the one moment they
-- were hidden. The client already said as much in a comment about why those
-- profiles were readable; it was describing behaviour that was never written.
--
-- Nothing is given away by this. Reaching somebody takes their invite code,
-- which only exists because they handed it over, and a request already tells
-- them an account is asking. Being able to say which account is the point.

create or replace function public.can_see_profile(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() = p_id
      or public.are_friends(p_id)
      or exists (
           select 1
             from public.group_members mine
             join public.group_members theirs on theirs.group_id = mine.group_id
            where mine.user_id = auth.uid()
              and theirs.user_id = p_id
         )
      -- Either direction: the receiver has to know who is asking, and the
      -- sender has to see who they asked while they wait to hear back.
      or exists (
           select 1
             from public.friend_requests r
            where r.status = 'pending'
              and (
                (r.from_user = auth.uid() and r.to_user = p_id) or
                (r.from_user = p_id and r.to_user = auth.uid())
              )
         );
$$;
