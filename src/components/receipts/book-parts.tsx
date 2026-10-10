import { Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { PaymentSourceRow } from '@/api/queries';
import type { ReceiptBookRow } from '@/api/receipt-books';
import { BookIcon } from '@/components/receipts/book-icon';
import type { BookPill } from '@/components/receipts/book-pills';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** Under the pills, for a book of the person's own: what it is paid from, and the way to edit it. */
export function BookInfo({
  book,
  sources,
  isDefault,
  onEdit,
}: {
  book: ReceiptBookRow;
  sources: readonly PaymentSourceRow[];
  isDefault: boolean;
  onEdit: () => void;
}) {
  const colors = useColors();
  const source = sources.find((row) => row.id === (book.card_id ?? book.bank_account_id));
  const facts = [
    source ? t('receipts.books.paidFrom', { source: source.label }) : null,
    isDefault ? t('receipts.books.isDefault') : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <View className="mt-3 w-full flex-row items-center gap-3">
      <Text
        className="min-w-0 flex-1 font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {facts.join(' · ')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('receipts.books.editLabel', { name: book.name })}
        onPress={withTap(onEdit)}
        hitSlop={6}
        className="min-h-9 flex-row items-center gap-1.5 rounded-full px-3 active:bg-ink/5"
      >
        <Pencil size={14} color={colors.accentInk} strokeWidth={2} />
        <Text
          className="font-app-semibold text-[13px] text-accent-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('receipts.books.edit')}
        </Text>
      </Pressable>
    </View>
  );
}

/** A book with nothing in it yet: its own icon, and the way to add the first receipt. */
export function BookEmpty({ book, onAdd }: { book: ReceiptBookRow; onAdd: () => void }) {
  return (
    <View className="mt-16 w-full items-center px-4">
      <View className="h-[76px] w-[76px] items-center justify-center rounded-[22px] bg-ink/5">
        <BookIcon iconId={book.icon_id} size={46} />
      </View>
      <Text
        accessibilityRole="header"
        className="mt-5 text-center font-app-semibold text-[18px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {t('receipts.books.emptyTitle')}
      </Text>
      <Text
        className="mt-1.5 text-center font-app text-[14px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('receipts.books.emptyMessage', { name: book.name })}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('receipts.books.addReceipt')}
        onPress={withTap(onAdd)}
        className="mt-4 min-h-12 items-center justify-center rounded-[12px] border-[1.5px] border-ink px-6 active:bg-ink/5"
      >
        <Text className="font-app-medium text-[16px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {t('receipts.books.addReceipt')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Which book a receipt goes in, as pills that wrap: every book is in view, so the choice is read
 * before Save. Null is not answered yet.
 */
export function BookChoice({
  books,
  value,
  onChange,
}: {
  books: readonly BookPill[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" className="w-full flex-row flex-wrap gap-2">
      {books.map((book) => {
        const chosen = book.key === value;
        return (
          <Pressable
            key={book.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen, checked: chosen }}
            accessibilityLabel={book.name}
            onPress={() => {
              selection();
              onChange(book.key);
            }}
            className={cn(
              'min-h-[40px] max-w-full flex-row items-center gap-1.5 rounded-full border-[1.5px] py-1 pl-1 pr-3.5',
              chosen ? 'border-ink bg-ink' : 'border-line bg-card active:bg-ink/5',
            )}
          >
            <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-card">
              <BookIcon iconId={book.iconId} size={22} />
            </View>
            <Text
              className={cn(
                'shrink font-app-medium text-[14px]',
                chosen ? 'text-surface' : 'text-ink',
              )}
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {book.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
