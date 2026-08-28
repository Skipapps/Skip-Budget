import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text } from 'react-native';

import { LEDGER_RANGES, type RangeKey } from '@/lib/range';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type RangeDropdownProps = {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
};

/**
 * The window a page is reporting on.
 *
 * A dropdown rather than a row of chips: five windows do not fit across a
 * phone without shrinking to something that reads as decoration, and the
 * choice belongs next to the figure it changes rather than as a band of its
 * own. Closed, it says which window you are in — which is the thing you need
 * to know when reading the number beside it.
 */
export function RangeDropdown({ value, onChange }: RangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = LEDGER_RANGES.find((range) => range.value === value) ?? LEDGER_RANGES[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Showing ${current.label}. Change the window.`}
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1.5 rounded-full border border-line bg-white py-2 pl-3.5 pr-3 active:bg-black/5"
      >
        <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.2}>
          {current.label}
        </Text>
        <ChevronDown size={16} color={colors.muted} strokeWidth={2.2} />
      </Pressable>

      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            accessibilityLabel="Dismiss"
            onPress={() => setOpen(false)}
            className="flex-1 items-center justify-center bg-black/40 px-8"
          >
            {/* Swallows the tap so pressing the card itself does not close it. */}
            <Pressable
              onPress={() => {}}
              style={shadows.floating}
              className="w-full max-w-[300px] overflow-hidden rounded-[14px] bg-white py-1.5"
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
                    className="w-full flex-row items-center justify-between gap-3 px-5 py-3.5 active:bg-black/5"
                  >
                    <Text
                      className={
                        selected
                          ? 'font-poppins-medium text-[16px] text-ink'
                          : 'font-poppins text-[16px] text-body'
                      }
                      maxFontSizeMultiplier={1.3}
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
