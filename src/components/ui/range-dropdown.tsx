import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text } from 'react-native';

import { t } from '@/i18n';
import { LEDGER_RANGES, type RangeKey } from '@/lib/range';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

type RangeDropdownProps = {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
};

/** The window a page is reporting on. A dropdown, not chips: five windows do not fit across a phone. */
export function RangeDropdown({ value, onChange }: RangeDropdownProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const current = LEDGER_RANGES.find((range) => range.value === value) ?? LEDGER_RANGES[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ui.range.showing', { range: current.label })}
        onPress={() => setOpen(true)}
        // The pill is 40pt tall by design; the touch target is the 44pt floor.
        hitSlop={{ top: 4, bottom: 4 }}
        className="min-h-10 max-w-full flex-row items-center gap-1.5 rounded-full bg-ink/5 py-2 pl-4 pr-3 active:bg-ink/10"
      >
        <Text
          className="shrink font-app-medium text-[14px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {current.label}
        </Text>
        <ChevronDown size={16} color={colors.muted} strokeWidth={2} />
      </Pressable>

      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            accessibilityLabel={t('ui.dismiss')}
            onPress={() => setOpen(false)}
            className="flex-1 items-center justify-center bg-black/40 px-8"
          >
            {/* Swallows the tap so pressing the card itself does not close it. */}
            <Pressable
              onPress={() => {}}
              style={shadows.floating}
              className="w-full max-w-[300px] overflow-hidden rounded-[16px] bg-card py-1.5"
            >
              {LEDGER_RANGES.map((range) => {
                const selected = range.value === value;
                return (
                  <Pressable
                    key={range.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(range.value);
                      setOpen(false);
                    }}
                    className="min-h-12 w-full flex-row items-center justify-between gap-3 px-5 py-3.5 active:bg-ink/5"
                  >
                    <Text
                      className={
                        selected
                          ? 'shrink font-app-medium text-[16px] text-ink'
                          : 'shrink font-app text-[16px] text-body'
                      }
                      maxFontSizeMultiplier={TEXT_CAP.row}
                    >
                      {range.label}
                    </Text>
                    {selected ? <Check size={18} color={colors.ink} strokeWidth={2.4} /> : null}
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}
