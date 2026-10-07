import { Pressable, View } from 'react-native';

import { BILL_ICON_CHOICES } from '@/data/bills-mock';
import { GLYPH_STROKE } from '@/data/glyphs';
import { t, type MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

const ICON_KEYS = new Map<string, MessageKey>([
  ['other', 'bills.icon.other'],
  ['education', 'bills.icon.education'],
  ['pets', 'bills.icon.pets'],
  ['tv', 'bills.icon.tv'],
  ['shopping', 'bills.icon.shopping'],
  ['travel', 'bills.icon.travel'],
  ['coffee', 'bills.icon.coffee'],
  ['music', 'bills.icon.music'],
  ['waste', 'bills.icon.waste'],
  ['software', 'bills.icon.software'],
  ['health', 'bills.icon.health'],
]);

/** What VoiceOver calls an icon; the id is what is stored. */
function iconName(id: string): string {
  const key = ICON_KEYS.get(id);
  return key ? t(key) : id;
}

type IconPickerProps = {
  value: string;
  onChange: (iconId: string) => void;
};

export function IconPicker({ value, onChange }: IconPickerProps) {
  const colors = useColors();
  return (
    <View className="w-full flex-row flex-wrap gap-3">
      {BILL_ICON_CHOICES.map((choice) => {
        const Icon = choice.icon;
        const selected = choice.id === value;

        return (
          <Pressable
            key={choice.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={iconName(choice.id)}
            onPress={() => onChange(choice.id)}
            className={cn(
              'h-12 w-12 items-center justify-center rounded-[10px] border',
              selected ? 'border-control bg-control' : 'border-line bg-card active:bg-ink/5',
            )}
          >
            <Icon
              size={22}
              strokeWidth={GLYPH_STROKE}
              color={selected ? colors.onControl : colors.body}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
