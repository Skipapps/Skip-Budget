import { Check, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useLogoMatch, type LogoHints, type LogoMatch } from '@/api/logos';
import { BrandLogo } from '@/components/brands/brand-logo';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { failureText } from '@/lib/failure';
import { isSureMatch, websiteHost } from '@/lib/logo-lookup';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Every word the logo choices say, in one place so the add-store card and Change logo match. Read
 * when drawn, so each follows the language on screen.
 */
export const LOGO_COPY = {
  get yes() {
    return t('settings.logo.yes');
  },
  get notThis() {
    return t('settings.logo.notThis');
  },
  get website() {
    return t('settings.logo.website');
  },
  get letters() {
    return t('settings.logo.letters');
  },
  get icon() {
    return t('settings.logo.icon');
  },
  get addWebsite() {
    return t('settings.logo.addWebsite');
  },
  get changeLogo() {
    return t('settings.logo.change');
  },
  get looking() {
    return t('settings.logo.looking');
  },
  get whichOne() {
    return t('settings.logo.whichOne');
  },
  get noOthers() {
    return t('settings.logo.noOthers');
  },
  get websiteLabel() {
    return t('settings.logo.websiteLabel');
  },
  /** An address, not a word: the same in every language. */
  websitePlaceholder: 'example.com',
  get find() {
    return t('settings.logo.find');
  },
  get findingWebsite() {
    return t('settings.logo.finding');
  },
  get noLogoForWebsite() {
    return t('settings.logo.noLogoForWebsite');
  },
  get report() {
    return t('settings.logo.report');
  },
  get reporting() {
    return t('settings.logo.reporting');
  },
  get reported() {
    return t('settings.logo.reported');
  },
  get save() {
    return t('settings.logo.save');
  },
  get saving() {
    return t('settings.saving');
  },
};

/** What a logo choice writes on a row. */
export type LogoChoice = { logoDomain: string | null; logoHidden: boolean };

/** "No logo" is letters on a receipt or subscription, and the category icon on a bill. */
export type NoLogo = 'letters' | 'icon';

export const noLogoLabel = (noLogo: NoLogo) =>
  noLogo === 'icon' ? LOGO_COPY.icon : LOGO_COPY.letters;

/** The name the service settled on, when it is confident enough to say so. */
export function confidentMatch(
  data: LogoMatch | null | undefined,
): { name: string; domain: string } | null {
  if (!data?.matched || !data.domain) return null;
  return { name: data.name ?? data.domain, domain: data.domain };
}

type LogoOptionProps = {
  name: string;
  domain: string;
  onPress: () => void;
  /** Given on a page where a pick only selects and Save commits; draws the tick. */
  selected?: boolean;
  divider?: boolean;
};

/** One brand to pick for a logo: its logo, its name and its website. */
export function LogoOption({ name, domain, onPress, selected, divider = false }: LogoOptionProps) {
  const colors = useColors();
  const selectable = selected !== undefined;
  return (
    <Pressable
      accessibilityRole={selectable ? 'radio' : 'button'}
      accessibilityState={selectable ? { checked: selected } : undefined}
      accessibilityLabel={`${name}, ${domain}`}
      onPress={withTap(onPress)}
      className={cn(
        'min-h-14 w-full flex-row items-center gap-3 py-2.5 active:opacity-60',
        divider && 'border-t border-line',
      )}
    >
      <BrandLogo name={name} domain={domain} size={36} className="border border-line" />
      <View className="min-w-0 flex-1">
        <Text className="font-app-medium text-[15px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {name}
        </Text>
        {/* A web address has no spaces, so a long one breaks where it must rather than being cut. */}
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {domain}
        </Text>
      </View>
      {selected ? <Check size={18} color={colors.accentInk} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

type ChoiceRowProps = {
  label: string;
  onPress: () => void;
  /** Given where a pick only selects; draws the tick. */
  selected?: boolean;
  /** Opens more choices underneath rather than choosing. */
  expanded?: boolean;
  divider?: boolean;
};

/** A worded choice: "Yes, that’s it", "No logo, use letters", or one that opens more choices. */
export function ChoiceRow({ label, onPress, selected, expanded, divider = false }: ChoiceRowProps) {
  const colors = useColors();
  const opens = expanded !== undefined;
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <Pressable
      accessibilityRole={selected !== undefined ? 'radio' : 'button'}
      accessibilityState={
        selected !== undefined ? { checked: selected } : opens ? { expanded } : undefined
      }
      accessibilityLabel={label}
      onPress={withTap(onPress)}
      className={cn(
        'min-h-12 w-full flex-row items-center justify-between gap-3 py-3 active:opacity-60',
        divider && 'border-t border-line',
      )}
    >
      <Text
        className="min-w-0 flex-1 font-app-medium text-[15px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {label}
      </Text>
      {selected ? <Check size={18} color={colors.accentInk} strokeWidth={2.2} /> : null}
      {opens ? <Chevron size={18} color={colors.muted} strokeWidth={2} /> : null}
    </Pressable>
  );
}

/** A quiet "in progress" line, the height of a row so nothing jumps when the answer lands. */
export function LookingLine({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View className="min-h-11 w-full flex-row items-center gap-2">
      <ActivityIndicator size="small" color={colors.muted} />
      <Text
        className="min-w-0 flex-1 font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {label}
      </Text>
    </View>
  );
}

/** The bordered block the choices sit in. */
export function ChoiceCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('w-full rounded-[16px] border border-line bg-card px-4 py-1', className)}>
      {children}
    </View>
  );
}

const NAME = '{name}';

/** "Looks like **Planet Fitness**" over its website, with the logo. */
export function MatchHeader({ name, domain }: { name: string; domain: string }) {
  // Split around the name rather than glued after it, so the bold name lands where the language
  // puts it.
  const sentence = t('settings.logo.looksLike');
  const at = sentence.indexOf(NAME);
  const before = at < 0 ? sentence : sentence.slice(0, at);
  const after = at < 0 ? '' : sentence.slice(at + NAME.length);
  return (
    <View className="w-full flex-row items-center gap-3 py-3">
      <BrandLogo name={name} domain={domain} size={44} className="border border-line" />
      <View className="min-w-0 flex-1">
        <Text className="font-app text-[15px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {before}
          <Text className="font-app-semibold">{name}</Text>
          {after || null}
        </Text>
        <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {domain}
        </Text>
      </View>
    </View>
  );
}

type WebsiteFinderProps = {
  hints: LogoHints;
  onPick: (pick: { name: string; domain: string }) => void;
  /** Given on a page where a pick only selects; the found row shows a tick when it is chosen. */
  selectedDomain?: string | null;
};

/**
 * "Use the website instead": the person types the site and the service looks that host up
 * directly, with no name matching, so it is exact. Looked up on Find, not per keystroke: every
 * half-typed address would be a lookup.
 */
export function WebsiteFinder({ hints, onPick, selectedDomain }: WebsiteFinderProps) {
  const [typed, setTyped] = useState('');
  // The host last asked about; null when what was typed cannot be a website, so nothing is sent.
  const [asked, setAsked] = useState<string | null>('');
  const lookup = useLogoMatch(asked ?? '', hints);
  const found = confidentMatch(lookup.data);

  const find = () => {
    if (typed.trim()) setAsked(websiteHost(typed));
  };
  const waiting = Boolean(asked) && lookup.isFetching;
  const answered = Boolean(asked) && !lookup.isFetching && lookup.data !== undefined;
  const nothingThere = asked === null || (answered && Boolean(lookup.data) && !found);

  return (
    <View className="w-full py-3">
      <TextField
        label={LOGO_COPY.websiteLabel}
        value={typed}
        onChangeText={setTyped}
        placeholder={LOGO_COPY.websitePlaceholder}
        keyboardType="url"
        textContentType="URL"
        autoComplete="url"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={find}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.logo.findLabel')}
            onPress={withTap(find)}
            hitSlop={8}
            className="-mr-2 min-h-11 justify-center px-2 active:opacity-60"
          >
            <Text
              className="font-app-medium text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {LOGO_COPY.find}
            </Text>
          </Pressable>
        }
      />

      {waiting ? (
        <View className="mt-2">
          <LookingLine label={LOGO_COPY.findingWebsite} />
        </View>
      ) : null}

      {answered && lookup.data === null ? (
        <Text
          className="mt-2 font-app text-[13px] text-danger"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {failureText()}
        </Text>
      ) : null}

      {nothingThere ? (
        <Text
          className="mt-2 font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {LOGO_COPY.noLogoForWebsite}
        </Text>
      ) : null}

      {answered && found ? (
        <View className="mt-1">
          <LogoOption
            name={found.name}
            domain={found.domain}
            onPress={() => onPick(found)}
            selected={selectedDomain === undefined ? undefined : selectedDomain === found.domain}
          />
        </View>
      ) : null}
    </View>
  );
}

type LogoConfirmProps = {
  /** The new store's name, as the person added it. */
  name: string;
  hints: LogoHints;
  noLogo: NoLogo;
  onChoose: (choice: LogoChoice) => void;
  /** Already answered elsewhere (an earlier page): opens on "Change logo" instead of asking again. */
  decided?: boolean;
};

type ConfirmStep = 'ask' | 'others' | 'website' | 'done';

/**
 * The add-store check: before a store the catalog does not know is saved, show the logo the
 * service thinks it is and let the person say yes, pick another, give the website, or keep letters.
 * Nothing is chosen until they answer, because a wrong logo is worse than letters, with one
 * exception: a store the service knows by its exact name or website (our own logo list) is simply
 * given its logo, with "Change logo" if that is wrong. An unsure or failed lookup shows no card at
 * all, only a quiet way to add the website.
 */
export function LogoConfirm({ name, hints, noLogo, onChoose, decided = false }: LogoConfirmProps) {
  const [step, setStep] = useState<ConfirmStep>(decided ? 'done' : 'ask');
  // A sure match is applied once, when this opens on its own. Someone who pressed "Change logo"
  // wants to choose, so it is never applied over them.
  const [auto, setAuto] = useState(!decided);
  const applied = useRef(false);
  // Nothing is asked of the service while the person is not choosing: an answered store costs no
  // lookup, and opening "Change logo" reuses the cached one.
  const match = useLogoMatch(step === 'done' ? '' : name, hints);
  const found = confidentMatch(match.data);
  const plain = noLogoLabel(noLogo);
  const sureDomain = auto && step === 'ask' && isSureMatch(match.data) ? match.data.domain : null;

  const choose = (choice: LogoChoice) => {
    onChoose(choice);
    setStep('done');
  };

  // The answer is given once, whatever the parent re-renders with in the meantime.
  const onChooseRef = useRef(onChoose);
  useEffect(() => {
    onChooseRef.current = onChoose;
  });
  useEffect(() => {
    if (!sureDomain || applied.current) return;
    applied.current = true;
    onChooseRef.current({ logoDomain: sureDomain, logoHidden: false });
    setStep('done');
  }, [sureDomain]);

  const quiet = (label: string, next: ConfirmStep) => (
    <TextLink
      label={label}
      variant="subtle"
      onPress={() => {
        setAuto(false);
        setStep(next);
      }}
      className="mt-1 self-start"
    />
  );

  if (step === 'done') return quiet(LOGO_COPY.changeLogo, 'ask');

  if (step === 'ask') {
    // Applying: the logo is about to appear in the field, so there is nothing to ask or show.
    if (sureDomain) return null;
    if (match.isLoading) {
      return (
        <View className="mt-2 w-full">
          <LookingLine label={LOGO_COPY.looking} />
        </View>
      );
    }
    if (!found) return quiet(LOGO_COPY.addWebsite, 'website');

    return (
      <ChoiceCard className="mt-3">
        <MatchHeader name={found.name} domain={found.domain} />
        <ChoiceRow
          label={LOGO_COPY.yes}
          onPress={() => choose({ logoDomain: found.domain, logoHidden: false })}
          divider
        />
        <ChoiceRow label={LOGO_COPY.notThis} onPress={() => setStep('others')} divider />
        <ChoiceRow label={LOGO_COPY.website} onPress={() => setStep('website')} divider />
        <ChoiceRow
          label={plain}
          onPress={() => choose({ logoDomain: null, logoHidden: true })}
          divider
        />
      </ChoiceCard>
    );
  }

  const letters = (
    <ChoiceRow
      label={plain}
      onPress={() => choose({ logoDomain: null, logoHidden: true })}
      divider
    />
  );

  if (step === 'others') {
    const others = (match.data?.candidates ?? []).filter(
      (candidate) => candidate.domain !== found?.domain,
    );
    return (
      <ChoiceCard className="mt-3">
        <Text
          className="py-3 font-app-semibold text-[15px] text-ink"
          accessibilityRole="header"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {LOGO_COPY.whichOne}
        </Text>
        {others.length === 0 ? (
          <Text
            className="pb-3 font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {LOGO_COPY.noOthers}
          </Text>
        ) : (
          others.map((candidate) => (
            <LogoOption
              key={candidate.domain}
              name={candidate.name}
              domain={candidate.domain}
              onPress={() => choose({ logoDomain: candidate.domain, logoHidden: false })}
              divider
            />
          ))
        )}
        <ChoiceRow label={LOGO_COPY.website} onPress={() => setStep('website')} divider />
        {letters}
      </ChoiceCard>
    );
  }

  return (
    <ChoiceCard className="mt-3">
      <WebsiteFinder
        hints={hints}
        onPick={(pick) => choose({ logoDomain: pick.domain, logoHidden: false })}
      />
      {letters}
    </ChoiceCard>
  );
}
