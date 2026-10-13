import { ArrowUp, ChevronRight, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { AnswerText, TypingDots } from '@/components/ask-sam/answer-text';
import { ContactCard, type ContactMessage } from '@/components/ask-sam/contact-card';
import { SamMark } from '@/components/ask-sam/sam-mark';
import { SCREENS } from '@/components/ask-sam/screens';
import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { t, useLocale, type MessageKey } from '@/i18n';
import {
  createAskSam,
  intentsFor,
  matcherFor,
  plainText,
  TOPICS,
  type AskSam,
  type Chip,
  type Language,
  type SamReply,
} from '@/lib/ask-sam';
import { tap } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type Prices = { proMonthly: string; proYearly: string };

export type AskSamChatProps = {
  /** The store's own prices, so each country reads its own currency. */
  prices: Prices;
  /** Where a contact reply goes, shown on the form. */
  email?: string;
  /** Prefills the contact form. */
  name?: string;
  /** Opens the screen an answer is about. */
  onOpenRoute: (route: string) => void;
  /** Sends the contact form through the same inbox as Support and feedback. */
  onSendContact: (message: ContactMessage) => Promise<void>;
  /** A thumbs up or down on an answer, for finding the answers that need work. */
  onFeedback?: (feedback: { intentId: string; helpful: boolean; question: string }) => void;
};

type Item =
  | { key: number; from: 'user'; text: string }
  | { key: number; from: 'typing' }
  | { key: number; from: 'sam'; reply: SamReply; question: string; animate: boolean };

/** The welcome page's questions, in the design's words, each with the answer it opens. */
const COMMON: { label: MessageKey; intentId: string }[] = [
  { label: 'askSam.welcome.addBill', intentId: 'bills.add.how' },
  { label: 'askSam.welcome.loanInterest', intentId: 'loans.interest.how' },
  { label: 'askSam.welcome.goals', intentId: 'goals.send.how' },
  { label: 'askSam.welcome.pastYears', intentId: 'bills.history.years' },
  { label: 'askSam.welcome.export', intentId: 'bills.export.how' },
];

/**
 * Ask Sam: a help chat answering from the written library in src/lib/ask-sam, in the app's
 * language. Nothing typed here leaves the phone unless the person sends the contact form.
 */
export function AskSamChat({
  prices,
  email,
  name,
  onOpenRoute,
  onSendContact,
  onFeedback,
}: AskSamChatProps) {
  const colors = useColors();
  const { language } = useLocale();
  // Built for one language; a change of language reads as not ready until the new one is built.
  const [built, setBuilt] = useState<{ language: Language; sam: AskSam } | null>(null);
  const sam = built?.language === language ? built.sam : null;

  // Sam reads prices as it writes each answer, so the store's prices arriving late update in
  // place instead of starting the conversation over.
  const vars = useRef<Prices>({ ...prices });
  useEffect(() => {
    vars.current.proMonthly = prices.proMonthly;
    vars.current.proYearly = prices.proYearly;
  }, [prices.proMonthly, prices.proYearly]);

  useEffect(() => {
    // Indexing the library takes a moment on a phone, so the page draws first.
    const timer = setTimeout(
      () => setBuilt({ language, sam: buildSam(language, vars.current) }),
      250,
    );
    return () => clearTimeout(timer);
  }, [language]);

  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const nextKey = useRef(0);
  const mounted = useRef(true);
  const quiet = useRef(false);
  const scroll = useRef<ScrollView>(null);
  // Sam as last built, for a turn that started before it was; and the turns waiting for it.
  const ready = useRef<AskSam | null>(null);
  const waiting = useRef<((sam: AskSam) => void)[]>([]);
  useEffect(() => {
    ready.current = sam;
    if (!sam) return;
    for (const resume of waiting.current.splice(0)) resume(sam);
  }, [sam]);

  useEffect(() => {
    mounted.current = true;
    // A screen reader reads the whole answer at once; writing it out word by word would cut it up.
    Promise.all([
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.isReduceMotionEnabled(),
    ])
      .then(([reader, reduce]) => {
        quiet.current = reader || reduce;
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, []);

  const deliver = useCallback(
    async (produce: (sam: AskSam) => SamReply[], userText: string | null, question: string) => {
      const typingKey = nextKey.current++;
      setItems((list) => [
        ...list,
        ...(userText ? [{ key: nextKey.current++, from: 'user' as const, text: userText }] : []),
        { key: typingKey, from: 'typing' as const },
      ]);
      // A question asked while the library is still loading shows at once, with Sam typing.
      const sam =
        ready.current ?? (await new Promise<AskSam>((resume) => waiting.current.push(resume)));
      if (!mounted.current) return;
      const replies = produce(sam);
      if (!replies.length) setItems((list) => list.filter((item) => item.key !== typingKey));
      let key = typingKey;
      for (const [index, reply] of replies.entries()) {
        if (index > 0) {
          key = nextKey.current++;
          setItems((list) => [...list, { key, from: 'typing' }]);
        }
        const words = reply.text.split(/\s+/).length;
        await new Promise((resolve) =>
          setTimeout(resolve, quiet.current ? 150 : 380 + Math.min(900, words * 9)),
        );
        if (!mounted.current) return;
        const done = key;
        setItems((list) =>
          list.map((item) =>
            item.key === done
              ? { key: done, from: 'sam', reply, question, animate: !quiet.current }
              : item,
          ),
        );
      }
      busyRef.current = false;
      setBusy(false);
    },
    [],
  );

  // Takes the turn at once, so a second tap can't slip in while Sam is loading or typing.
  const take = (): boolean => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    tap();
    return true;
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !take()) return;
    setDraft('');
    void deliver((sam) => sam.ask(text), text, text);
  };

  const choose = (chip: Chip) => {
    if (!take()) return;
    void deliver((sam) => sam.choose(chip), chip.label, chip.label);
  };

  const rate = (reply: SamReply, question: string, helpful: boolean) => {
    const intentId = reply.intentId;
    if (!intentId || !take()) return;
    onFeedback?.({ intentId, helpful, question });
    void deliver((sam) => [sam.feedback(intentId, helpful)], null, question);
  };

  const header = (
    <View className="min-h-[52px] w-full flex-row items-center">
      <View className="w-[44px]">
        <BackButton />
      </View>
      <View className="min-w-0 flex-1 flex-row items-center justify-center gap-2">
        <SamMark size={28} />
        <Text
          className="font-app-bold text-[18px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.heading}
          accessibilityRole="header"
        >
          {t('askSam.title')}
        </Text>
      </View>
      <View className="w-[44px]" />
    </View>
  );

  const canSend = !busy && Boolean(draft.trim());

  return (
    <Screen header={header} scrollable={false}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20, gap: 14 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            if (items.length) scroll.current?.scrollToEnd({ animated: true });
          }}
        >
          {items.length === 0 ? (
            <Welcome
              busy={busy}
              onPick={(label, intentId) => choose({ label, intentId })}
              onTopics={() => choose({ label: t('askSam.welcome.more'), action: 'topics' })}
            />
          ) : null}

          {items.map((item) =>
            item.from === 'user' ? (
              <UserBubble key={item.key} text={item.text} />
            ) : item.from === 'typing' ? (
              <View
                key={item.key}
                className="self-start rounded-[18px] border border-line bg-card px-[18px] py-3.5"
              >
                <TypingDots />
              </View>
            ) : (
              <SamMessage
                key={item.key}
                reply={item.reply}
                animate={item.animate}
                busy={busy}
                onChoose={choose}
                onRate={(helpful) => rate(item.reply, item.question, helpful)}
                onOpenRoute={onOpenRoute}
                contact={
                  item.reply.kind === 'contact' && item.reply.contact ? (
                    <ContactCard
                      topic={item.reply.contact.topic}
                      draft={item.reply.contact.draft}
                      defaultName={name}
                      email={email}
                      transcript={sam?.transcript ?? (() => [])}
                      onSend={onSendContact}
                    />
                  ) : null
                }
              />
            ),
          )}
        </ScrollView>

        <View className="mb-2 flex-row items-end gap-2 rounded-[26px] border border-line bg-card py-1.5 pl-5 pr-1.5">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('askSam.placeholder')}
            placeholderTextColor={colors.muted}
            multiline
            onSubmitEditing={send}
            submitBehavior="submit"
            returnKeyType="send"
            accessibilityLabel={t('askSam.placeholder')}
            maxFontSizeMultiplier={TEXT_CAP.row}
            className="max-h-[120px] min-h-[40px] min-w-0 flex-1 py-[9px] font-app text-[16px] leading-[21px] text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('askSam.send')}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={send}
            hitSlop={4}
            className={`h-10 w-10 items-center justify-center rounded-full bg-control active:bg-control-pressed ${canSend ? '' : 'opacity-40'}`}
          >
            <ArrowUp size={20} color={colors.onControl} strokeWidth={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function buildSam(language: Language, vars: Prices): AskSam {
  return createAskSam({
    intents: intentsFor(language),
    topics: TOPICS,
    vars,
    language,
    matcher: matcherFor(language),
  });
}

function Welcome({
  busy,
  onPick,
  onTopics,
}: {
  busy: boolean;
  onPick: (label: string, intentId: string) => void;
  onTopics: () => void;
}) {
  return (
    <View>
      <Text
        className="font-app-bold text-[24px] leading-[30px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
        accessibilityRole="header"
      >
        {t('askSam.welcome.title')}
      </Text>
      <Text
        className="mt-1 font-app text-[15px] leading-[21px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('askSam.welcome.subtitle')}
      </Text>
      <SectionLabel text={t('askSam.welcome.common')} className="mt-7" />
      <ListCard
        rows={[
          ...COMMON.map((item) => ({
            label: t(item.label),
            disabled: busy,
            onPress: () => onPick(t(item.label), item.intentId),
          })),
          { label: t('askSam.welcome.more'), strong: true, disabled: busy, onPress: onTopics },
        ]}
      />
    </View>
  );
}

function SectionLabel({ text, className = '' }: { text: string; className?: string }) {
  return (
    <Text
      className={`mb-2 font-app-semibold text-[13px] text-muted ${className}`}
      maxFontSizeMultiplier={TEXT_CAP.heading}
    >
      {text}
    </Text>
  );
}

type Row = { label: string; onPress: () => void; strong?: boolean; disabled?: boolean };

/** Tappable questions in one card, each with a chevron, the way the design lists them. */
function ListCard({ rows }: { rows: Row[] }) {
  const colors = useColors();
  return (
    <View className="w-full overflow-hidden rounded-[18px] border border-line bg-card">
      {rows.map((row, index) => (
        <Pressable
          key={`${row.label}-${index}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: row.disabled }}
          disabled={row.disabled}
          onPress={row.onPress}
          className="min-h-[48px] flex-row items-center gap-3 px-[18px] active:bg-ink/5"
        >
          <View
            className={`min-w-0 flex-1 flex-row items-center gap-3 self-stretch py-3.5 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            <Text
              className={`min-w-0 flex-1 text-[15px] leading-[21px] ${row.strong ? 'font-app-semibold text-accent-ink' : 'font-app text-ink'}`}
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {row.label}
            </Text>
            <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <View className="max-w-[86%] self-end rounded-[22px] bg-control px-[18px] py-3">
      <Text
        className="font-app text-[15px] leading-[21px] text-on-control"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {text}
      </Text>
    </View>
  );
}

type SamMessageProps = {
  reply: SamReply;
  animate: boolean;
  busy: boolean;
  contact: ReactNode;
  onChoose: (chip: Chip) => void;
  onRate: (helpful: boolean) => void;
  onOpenRoute: (route: string) => void;
};

function SamMessage({
  reply,
  animate,
  busy,
  contact,
  onChoose,
  onRate,
  onOpenRoute,
}: SamMessageProps) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(!animate);
  const [rated, setRated] = useState<boolean | null>(null);
  const route = reply.route;
  const screen = route ? SCREENS[route] : undefined;
  const rows = (chips: Chip[]): Row[] =>
    chips.map((chip) => ({
      label: chip.label,
      strong: chip.action === 'contact',
      disabled: busy,
      onPress: () => onChoose(chip),
    }));

  return (
    <View className="w-full gap-3">
      <View className="w-full rounded-[18px] border border-line bg-card px-[18px] py-4">
        <View accessible accessibilityLabel={plainText(reply.text)}>
          {reply.pro ? (
            <View className="mb-2 self-start rounded-md bg-tint px-2 py-0.5">
              <Text
                className="font-app-bold text-[11px] tracking-wider text-tint-ink"
                maxFontSizeMultiplier={TEXT_CAP.control}
              >
                PRO
              </Text>
            </View>
          ) : null}
          <AnswerText
            text={reply.text}
            reveal={animate}
            lead={reply.kind === 'answer'}
            onRevealed={() => setRevealed(true)}
          />
        </View>
        {revealed && route && screen ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => onOpenRoute(route)}
            hitSlop={8}
            className="mt-3 self-start active:opacity-70"
          >
            <Text
              className="font-app-semibold text-[15px] text-accent-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {`${t('askSam.open', { screen: t(screen) })} ›`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {revealed ? (
        <>
          {contact}

          {reply.askFeedback ? (
            <View className="flex-row items-center gap-3.5 px-1">
              <Text
                className="font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.control}
              >
                {t('askSam.helpful')}
              </Text>
              {([true, false] as const).map((helpful) => {
                const Icon = helpful ? ThumbsUp : ThumbsDown;
                const chosen = rated === helpful;
                return (
                  <Pressable
                    key={String(helpful)}
                    accessibilityRole="button"
                    accessibilityLabel={t(helpful ? 'askSam.helpful.yes' : 'askSam.helpful.no')}
                    accessibilityState={{ selected: chosen, disabled: rated !== null || busy }}
                    disabled={rated !== null || busy}
                    onPress={() => {
                      setRated(helpful);
                      onRate(helpful);
                    }}
                    hitSlop={12}
                  >
                    <Icon
                      size={17}
                      color={chosen ? colors.accentInk : colors.muted}
                      fill={chosen ? colors.tint : 'none'}
                      strokeWidth={2}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {reply.alternatives?.length ? (
            <View>
              <SectionLabel text={t('askSam.notQuite')} />
              <ListCard rows={rows(reply.alternatives)} />
            </View>
          ) : null}

          {reply.chips.length ? (
            <View>
              {reply.kind === 'answer' ? <SectionLabel text={t('askSam.related')} /> : null}
              <ListCard rows={rows(reply.chips)} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
