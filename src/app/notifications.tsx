import { Download, Megaphone, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useMarkNewsSeen } from '@/api/news';
import { useAnnouncements, type AnnouncementRow } from '@/api/queries';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { failureText } from '@/lib/failure';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

const KINDS: Record<AnnouncementRow['kind'], { readonly label: string; icon: LucideIcon }> = {
  update: {
    get label() {
      return t('reminders.news.update');
    },
    icon: Download,
  },
  feature: {
    get label() {
      return t('reminders.news.feature');
    },
    icon: Sparkles,
  },
  news: {
    get label() {
      return t('reminders.news.news');
    },
    icon: Megaphone,
  },
};

/** News from Skip only. Bill and renewal reminders are pushes and are not kept here. */
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
      title={t('reminders.news.title')}
      showBack
      onRefresh={() => void news.refetch()}
      refreshing={news.isRefetching}
    >
      <Subtitle align="left" className="mt-2 w-full">
        {t('reminders.news.intro')}
      </Subtitle>

      {news.isPending ? (
        <View className="mt-6 w-full">
          <SkeletonList rows={3} />
        </View>
      ) : news.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void news.refetch()}
        />
      ) : items.length === 0 ? (
        <View className="mt-16 w-full items-center px-4">
          <Text
            className="text-center font-app-semibold text-[17px] text-ink"
            maxFontSizeMultiplier={1.4}
          >
            {t('reminders.news.empty')}
          </Text>
          <Text
            className="mt-2 text-center font-app text-[14px] leading-5 text-muted"
            maxFontSizeMultiplier={1.4}
          >
            {t('reminders.news.emptyDetail')}
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
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {kind.label} · {date}
        </Text>
        <Text
          className="mt-1 font-app-semibold text-[15px] leading-5 text-ink"
          maxFontSizeMultiplier={1.4}
        >
          {item.title}
        </Text>
        {item.body ? (
          <Text
            className="mt-1 font-app text-[14px] leading-5 text-body"
            maxFontSizeMultiplier={1.4}
          >
            {item.body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
