import { router } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { LOGO_COPY } from '@/components/brands/logo-choices';
import { t } from '@/i18n';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';

/** The rows that carry their own logo choice. */
export type LogoKind = 'receipt' | 'subscription' | 'bill';

/** Change logo for one saved row: a normal pushed page, so Back returns to where it opened. */
export function openChangeLogo(kind: LogoKind, id: string, name: string) {
  router.push({ pathname: '/change-logo', params: { kind, id, name } });
}

type ChangeLogoButtonProps = {
  kind: LogoKind;
  id: string;
  name: string;
  /** The logo as the page draws it. */
  children: ReactNode;
};

/** A row's logo that opens Change logo. The pencil says it can be tapped; a bare logo does not. */
export function ChangeLogoButton({ kind, id, name, children }: ChangeLogoButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LOGO_COPY.changeLogo}
      accessibilityHint={t('settings.logo.chooseFor', { name })}
      onPress={withTap(() => openChangeLogo(kind, id, name))}
      hitSlop={6}
      className="active:opacity-60"
    >
      {children}
      <View
        pointerEvents="none"
        className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border border-line bg-card"
      >
        <Pencil size={12} color={colors.ink} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
