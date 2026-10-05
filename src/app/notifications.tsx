import { Download, Megaphone, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useMarkNewsSeen } from '@/api/news';
import { useAnnouncements, type AnnouncementRow } from '@/api/queries';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Subtitle } from '@/components/ui/typography';
import { formatFullDate } from '@/lib/date';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

const KINDS: Record<AnnouncementRow['kind'], { label: string; icon: LucideIcon }> = {
  update: { label: 'Update', icon: Download },
  feature: { label: 'New feature', icon: Sparkles },
  news: { label: 'News', icon: Megaphone },
};

/**
 * News from Skip: an update to install, a feature that has just shipped.
 *
 * Only that. Reminders about bills and renewals are pushes and are not kept
 * here — this screen once listed every charge the app recorded, which put a
 * second, older copy of the lock screen inside the app. The charges themselves
 * are where they always were: on the bills, the cards and the transactions.
 */
export default function NotificationsScreen() {
  const artwork = useArtwork();
  const news = useAnnouncements();
  const markSeen = useMarkNewsSeen();

  // Opening the screen is reading it: the newest item on it clears the dot.
  const newest = news.data?.[0]?.published_at;
  useEffect(() => {
    if (newest) void markSeen(newest);
  }, [newest, markSeen]);

  const items = news.data ?? [];

  return (
    <Screen
      title="Notifications"
      showBack
      onRefresh={() => void news.refetch()}
      refreshing={news.isRefetching}
    >
      <Subtitle align="left" className="mt-2 w-full">
        News from Skip — updates to install and features that have just arrived.
      </Subtitle>

      {news.isPending ? (
        <View className="mt-6 w-full">
          <SkeletonList rows={3} />
        </View>
      ) : news.isError ? (
        <PageState
          art={artwork.error}
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
          onAction={() => void news.refetch()}
        />
      ) : items.length === 0 ? (
        <View className="mt-16 w-full items-center px-4">
          <Text
            className="text-center font-poppins-semibold text-[17px] text-ink"
            maxFontSizeMultiplier={1.4}
          >
            No news yet
          </Text>
          <Text
            className="mt-2 text-center font-poppins text-[14px] leading-5 text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Updates and new features from Skip will show up here.
          </Text>
        </View>
      ) : (
        <View className="mt-6 w-full gap-3 pb-10">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NewsCard({ item }: { item: AnnouncementRow }) {
  const colors = useColors();
  const kind = KINDS[item.kind] ?? KINDS.news;
  const Icon = kind.icon;
  const date = formatFullDate(new Date(item.published_at));

  return (
    <View
      accessible
      accessibilityLabel={`${kind.label}, ${date}. ${item.title}. ${item.body}`}
      className="w-full flex-row gap-3.5 rounded-[16px] border border-line bg-card p-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-ink/5">
        <Icon size={20} color={colors.body} strokeWidth={1.8} />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {kind.label} · {date}
        </Text>
        <Text
          className="mt-1 font-poppins-semibold text-[15px] leading-5 text-ink"
          maxFontSizeMultiplier={1.4}
        >
          {item.title}
        </Text>
        {item.body ? (
          <Text
            className="mt-1 font-poppins text-[14px] leading-5 text-body"
            maxFontSizeMultiplier={1.4}
          >
            {item.body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
