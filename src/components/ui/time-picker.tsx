import { useState } from 'react';
import { Modal, PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { TogglePill } from '@/components/ui/toggle-pill';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { parseClock, toClockValue } from '@/lib/date';
import { tap } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

type TimePickerProps = {
  /** "HH:MM" the picker opens on. */
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

const DIAL = 240;
const CENTRE = DIAL / 2;
/** Radius the numbers sit on, leaving room for the marker. */
const RING = CENTRE - 26;
const MARKER = 22;

/** Minutes land on fives, matching the dial's labels. */
const MINUTE_STEP = 5;

/** Position of a value on the ring, measured clockwise from the top. */
function pointOn(index: number, count: number, radius: number) {
  const angle = (index / count) * 2 * Math.PI;
  return {
    x: CENTRE + radius * Math.sin(angle),
    y: CENTRE - radius * Math.cos(angle),
  };
}

/**
 * A clock face for choosing a time: hours first, then minutes; tapping either field switches back.
 * Mounted only while open, so the useState initialisers reseed on every open and Cancel genuinely discards.
 */
export function TimePicker({ value, onCancel, onConfirm }: TimePickerProps) {
  const colors = useColors();
  const initial = parseClock(value);

  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  // Held as 24-hour internally; the face and the AM/PM switch are a view of it.
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(
    (Math.round(initial.minute / MINUTE_STEP) * MINUTE_STEP) % 60,
  );

  const isPm = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  // No tap() here: the toggle fires its own selection tick, and two haptics on one press stutter.
  const setPeriod = (next: 'AM' | 'PM') => {
    setHour((current) => {
      const base = current % 12;
      return next === 'PM' ? base + 12 : base;
    });
  };

  const valueAt = (x: number, y: number) => {
    const dx = x - CENTRE;
    const dy = y - CENTRE;
    // atan2(dx, -dy) puts zero at the top and grows clockwise, like a clock.
    let degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (degrees < 0) degrees += 360;

    if (mode === 'hour') {
      const step = Math.round(degrees / 30) % 12;
      return step === 0 ? 12 : step;
    }
    return (Math.round(degrees / 30) * MINUTE_STEP) % 60;
  };

  /**
   * Points the dial at whatever a touch is nearest. Compared against the selected state, not the last
   * touch, so a drag taps once per number it passes rather than once per pixel.
   */
  const apply = (x: number, y: number) => {
    const next = valueAt(x, y);

    if (mode === 'hour') {
      const nextHour = isPm ? (next % 12) + 12 : next % 12;
      if (nextHour === hour) return;
      tap();
      setHour(nextHour);
      return;
    }

    if (next === minute) return;
    tap();
    setMinute(next);
  };

  // Built each render, not memoised: the handlers close over the mode and AM/PM state, so a cached
  // one would keep setting hours after the dial moved on to minutes.
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      apply(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    onPanResponderMove: (event) => {
      apply(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    onPanResponderRelease: () => {
      if (mode === 'hour') setMode('minute');
    },
  });

  const marks =
    mode === 'hour'
      ? Array.from({ length: 12 }, (_, index) => ({
          index,
          label: String(index === 0 ? 12 : index),
          selected: hour12 % 12 === index,
        }))
      : Array.from({ length: 12 }, (_, index) => ({
          index,
          label: String(index * MINUTE_STEP).padStart(2, '0'),
          selected: minute === index * MINUTE_STEP,
        }));

  const activeIndex = mode === 'hour' ? hour12 % 12 : minute / MINUTE_STEP;
  const hand = pointOn(activeIndex, 12, RING);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessibilityLabel={t('ui.timePicker.close')}
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        <Pressable
          onPress={() => {}}
          style={shadows.floating}
          className="w-full max-w-[340px] overflow-hidden rounded-[16px] bg-card px-5 pb-4 pt-5"
        >
          <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={1.2}>
            {t('ui.timePicker.title')}
          </Text>

          {/* The two fields double as the switch for what the dial edits. */}
          <View className="mt-4 w-full flex-row items-center justify-center gap-2">
            <Field
              label={String(hour12)}
              active={mode === 'hour'}
              onPress={() => setMode('hour')}
              accessibilityLabel={t('ui.timePicker.hour', { hour: hour12 })}
            />
            <Text className="font-app-bold text-[34px] text-ink" maxFontSizeMultiplier={1.2}>
              :
            </Text>
            <Field
              label={String(minute).padStart(2, '0')}
              active={mode === 'minute'}
              onPress={() => setMode('minute')}
              accessibilityLabel={t('ui.timePicker.minute', { minute })}
            />
          </View>

          <View className="mt-3 w-[184px] self-center">
            <TogglePill
              options={[
                { value: 'AM', label: t('ui.timePicker.am') },
                { value: 'PM', label: t('ui.timePicker.pm') },
              ]}
              value={isPm ? 'PM' : 'AM'}
              onChange={(next) => setPeriod(next as 'AM' | 'PM')}
            />
          </View>

          <View className="mt-6 w-full items-center">
            <View
              {...responder.panHandlers}
              style={{ width: DIAL, height: DIAL }}
              className="rounded-full bg-ink/5"
            >
              {/* Under the numbers, so the selected one reads on top of its own circle. */}
              <Svg width={DIAL} height={DIAL} style={{ position: 'absolute' }}>
                <Line
                  x1={CENTRE}
                  y1={CENTRE}
                  x2={hand.x}
                  y2={hand.y}
                  stroke={colors.control}
                  strokeWidth={2}
                />
                <Circle cx={CENTRE} cy={CENTRE} r={4} fill={colors.control} />
                <Circle cx={hand.x} cy={hand.y} r={MARKER} fill={colors.control} />
              </Svg>

              {marks.map((mark) => {
                const at = pointOn(mark.index, 12, RING);
                return (
                  <View
                    key={mark.label}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: at.x - MARKER,
                      top: at.y - MARKER,
                      width: MARKER * 2,
                      height: MARKER * 2,
                    }}
                    className="items-center justify-center"
                  >
                    <Text
                      className={cn(
                        'font-app text-[16px]',
                        mark.selected ? 'text-on-control' : 'text-body',
                      )}
                      maxFontSizeMultiplier={1.1}
                    >
                      {mark.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-5 w-full flex-row items-center justify-end gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              onPress={onCancel}
              className="min-h-11 justify-center rounded-full px-5 active:bg-ink/5"
            >
              <Text className="font-app-medium text-[15px] text-body" maxFontSizeMultiplier={1.2}>
                {t('common.cancel')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ui.timePicker.confirm')}
              onPress={() => {
                tap();
                onConfirm(toClockValue(hour, minute));
              }}
              className="min-h-11 justify-center rounded-full bg-control px-5 active:bg-control-pressed"
            >
              <Text
                className="font-app-semibold text-[15px] text-on-control"
                maxFontSizeMultiplier={1.2}
              >
                {t('common.ok')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

function Field({ label, active, onPress, accessibilityLabel }: FieldProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={cn(
        'min-w-[84px] items-center rounded-[16px] px-3 py-2',
        active ? 'bg-control' : 'bg-ink/5 active:bg-ink/10',
      )}
    >
      <Text
        className={cn('font-app-bold text-[38px]', active ? 'text-on-control' : 'text-ink')}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Pressable>
  );
}
