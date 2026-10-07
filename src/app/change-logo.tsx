import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { matchBrand, useBrandDirectory } from '@/api/brands';
import { reportWrongLogo, useLogoMatch } from '@/api/logos';
import { useSetRowLogo } from '@/api/mutations';
import { useBill, useReceipt, useSubscription } from '@/api/queries';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import type { LogoKind } from '@/components/brands/change-logo-button';
import {
  ChoiceCard,
  ChoiceRow,
  LOGO_COPY,
  LogoOption,
  LookingLine,
  MatchHeader,
  WebsiteFinder,
  confidentMatch,
  noLogoLabel,
} from '@/components/brands/logo-choices';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';
import { logoDomainOf } from '@/lib/logo-domain';
import { useKnownFree } from '@/lib/pro-status';
import { logoHints } from '@/lib/logo-lookup';
import { useArtwork } from '@/theme/artwork';

const KINDS: readonly LogoKind[] = ['receipt', 'subscription', 'bill'];

const asKind = (value: string | undefined): LogoKind | null =>
  KINDS.includes(value as LogoKind) ? (value as LogoKind) : null;

/** What this page needs from a receipt, subscription or bill. */
type LogoRow = {
  name: string;
  categoryId: string;
  iconId: string | null;
  /** The row's own logo by the shared rule, before any name matching. */
  shown: string | null;
  hidden: boolean;
};

type Choice = { domain: string | null; hidden: boolean };

type ReportState = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * Change logo for one receipt, subscription or bill: the logo it shows now, the same choices as the
 * add-store check, and a way to report a logo that is wrong for everyone. A choice is saved on
 * this row alone; the shared logo is only ever changed by a person reviewing reports.
 */
export default function ChangeLogoScreen() {
  // Logos are Pro: a free account is shown what Pro adds. Decided on the shared answer, so someone
  // who paid is never bounced while Pro is still being checked.
  const free = useKnownFree();
  if (free) return <Redirect href={{ pathname: '/pro-feature', params: { id: 'logos' } }} />;
  return <ChangeLogoPage />;
}

function ChangeLogoPage() {
  const params = useLocalSearchParams<{ kind?: string; id?: string; name?: string }>();
  const kind = asKind(params.kind);
  const id = params.id || undefined;
  const artwork = useArtwork();

  const receipt = useReceipt(kind === 'receipt' ? id : undefined);
  const subscription = useSubscription(kind === 'subscription' ? id : undefined);
  const bill = useBill(kind === 'bill' ? id : undefined);
  const query = kind === 'receipt' ? receipt : kind === 'subscription' ? subscription : bill;
  const data = query.data;

  if (!kind || !id) {
    return (
      <Screen title={LOGO_COPY.changeLogo} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('settings.logo.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen title={LOGO_COPY.changeLogo} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => {
            void query.refetch();
          }}
          secondaryLabel={t('settings.logo.goBack')}
          onSecondary={() => router.back()}
        />
      </Screen>
    );
  }

  if (!query.isFetched) {
    return (
      <Screen title={LOGO_COPY.changeLogo} showBack>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  // Deleted elsewhere, or a stale link: there is no row to put a logo on.
  if (!data) {
    return (
      <Screen title={LOGO_COPY.changeLogo} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('settings.logo.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const row: LogoRow = {
    name: ('merchant' in data ? data.merchant : data.name) || params.name || '',
    categoryId: data.category_id,
    iconId: 'icon_id' in data ? data.icon_id : null,
    shown: logoDomainOf(data),
    hidden: Boolean(data.logo_hidden),
  };

  return <LogoChooser key={id} kind={kind} id={id} row={row} />;
}

function LogoChooser({ kind, id, row }: { kind: LogoKind; id: string; row: LogoRow }) {
  const hints = logoHints(row.categoryId);
  const match = useLogoMatch(row.name, hints);
  const found = confidentMatch(match.data);
  const setRowLogo = useSetRowLogo();
  const { data: directory = [] } = useBrandDirectory();

  // Lists draw a receipt or subscription with no logo of its own by matching its name to the
  // catalog, so that matched logo is the one on screen, and the one a report is about.
  const named =
    kind !== 'bill' && !row.hidden && !row.shown
      ? (matchBrand(row.name, directory)?.domain ?? null)
      : null;
  const now: Choice = { domain: row.shown ?? named, hidden: row.hidden };

  const [choice, setChoice] = useState<Choice | null>(null);
  const [open, setOpen] = useState<'others' | 'website' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportState>('idle');

  const picked = choice ?? now;
  const pickedDomain = picked.hidden ? null : picked.domain;
  const changed = choice !== null && (pickedDomain !== now.domain || choice.hidden !== now.hidden);
  const saving = setRowLogo.isPending;

  const select = (next: Choice) => {
    setError(null);
    setChoice(next);
  };
  const toggle = (section: 'others' | 'website') =>
    setOpen((current) => (current === section ? null : section));

  const save = async () => {
    if (!choice || !changed || saving) return;
    setError(null);
    try {
      await setRowLogo.mutateAsync({
        kind,
        id,
        logo_domain: choice.hidden ? null : choice.domain,
        logo_hidden: choice.hidden,
      });
      success();
      router.back();
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
    }
  };

  const sendReport = async () => {
    if (!now.domain || report === 'sending' || report === 'sent') return;
    setReport('sending');
    let sent = false;
    try {
      sent = await reportWrongLogo({ domain: now.domain, query: row.name });
    } catch {
      sent = false;
    }
    if (!sent) warn();
    setReport(sent ? 'sent' : 'failed');
  };

  const others = (match.data?.candidates ?? []).filter(
    (candidate) => candidate.domain !== found?.domain,
  );

  return (
    <Screen
      title={LOGO_COPY.changeLogo}
      showBack
      avoidKeyboard
      footer={
        <View className="w-full">
          {error ? (
            <Text
              className="mb-2 w-full text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={saving ? LOGO_COPY.saving : LOGO_COPY.save}
            onPress={() => void save()}
            disabled={!changed || saving}
          />
        </View>
      }
    >
      <View className="mt-4 w-full items-center">
        {kind === 'bill' ? (
          <BillMark
            categoryId={row.categoryId}
            iconId={row.iconId}
            domain={pickedDomain}
            name={row.name}
            size={72}
          />
        ) : (
          <BrandMark name={row.name} domain={pickedDomain} hidden={picked.hidden} size={72} />
        )}
        <Text
          className="mt-3 text-center font-app-semibold text-[17px] text-ink"
          maxFontSizeMultiplier={1.4}
        >
          {row.name}
        </Text>
        <Text
          className="mt-0.5 text-center font-app text-[13px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {pickedDomain ?? t('settings.logo.none')}
        </Text>
      </View>

      {match.isLoading ? (
        <View className="mt-6 w-full">
          <LookingLine label={LOGO_COPY.looking} />
        </View>
      ) : null}

      <ChoiceCard className="mt-6">
        {found ? (
          <>
            <MatchHeader name={found.name} domain={found.domain} />
            <ChoiceRow
              label={LOGO_COPY.yes}
              selected={pickedDomain === found.domain}
              onPress={() => select({ domain: found.domain, hidden: false })}
              divider
            />
            <ChoiceRow
              label={LOGO_COPY.notThis}
              expanded={open === 'others'}
              onPress={() => toggle('others')}
              divider
            />
            {open === 'others' ? (
              others.length === 0 ? (
                <Text className="pb-3 font-app text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
                  {LOGO_COPY.noOthers}
                </Text>
              ) : (
                others.map((candidate) => (
                  <LogoOption
                    key={candidate.domain}
                    name={candidate.name}
                    domain={candidate.domain}
                    selected={pickedDomain === candidate.domain}
                    onPress={() => select({ domain: candidate.domain, hidden: false })}
                    divider
                  />
                ))
              )
            ) : null}
          </>
        ) : null}

        <ChoiceRow
          label={LOGO_COPY.website}
          expanded={open === 'website'}
          onPress={() => toggle('website')}
          divider={Boolean(found)}
        />
        {open === 'website' ? (
          <WebsiteFinder
            hints={hints}
            selectedDomain={pickedDomain}
            onPick={(pick) => select({ domain: pick.domain, hidden: false })}
          />
        ) : null}

        <ChoiceRow
          label={noLogoLabel(kind === 'bill' ? 'icon' : 'letters')}
          selected={picked.hidden}
          onPress={() => select({ domain: null, hidden: true })}
          divider
        />
      </ChoiceCard>

      {now.domain ? (
        <View className="mt-4 w-full items-center pb-6">
          {report === 'sent' ? (
            <Text
              className="py-3 text-center font-app text-[14px] text-muted"
              maxFontSizeMultiplier={1.4}
            >
              {LOGO_COPY.reported}
            </Text>
          ) : report === 'sending' ? (
            <Text
              className="py-3 text-center font-app text-[14px] text-muted"
              maxFontSizeMultiplier={1.4}
            >
              {LOGO_COPY.reporting}
            </Text>
          ) : (
            <>
              {report === 'failed' ? (
                <Text
                  className="pt-3 text-center font-app text-[13px] text-danger"
                  maxFontSizeMultiplier={1.4}
                >
                  {failureText()}
                </Text>
              ) : null}
              <TextLink
                label={LOGO_COPY.report}
                variant="subtle"
                onPress={() => void sendReport()}
                accessibilityHint={t('settings.logo.reportHint')}
              />
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
