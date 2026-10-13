import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SwitchControl } from '@/components/ui/switch-control';
import { TextField } from '@/components/ui/text-field';
import { t } from '@/i18n';
import { plainText, type TranscriptLine } from '@/lib/ask-sam';
import { failureMessage } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** The shape the existing contact form sends, so Ask Sam can use the same inbox. */
export type ContactMessage = { topic: 'support' | 'idea'; name: string; message: string };

/** The send-message function refuses longer messages. */
const MAX_MESSAGE = 4000;

type ContactCardProps = {
  topic: 'support' | 'idea';
  draft: string;
  defaultName?: string;
  /** Where the reply goes; the server takes it from the signed-in account, so it isn't editable. */
  email?: string;
  transcript: () => TranscriptLine[];
  onSend: (message: ContactMessage) => Promise<void>;
};

export function ContactCard({
  topic: startTopic,
  draft,
  defaultName = '',
  email,
  transcript,
  onSend,
}: ContactCardProps) {
  const colors = useColors();
  const [topic, setTopic] = useState(startTopic);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState(draft);
  const [includeChat, setIncludeChat] = useState(true);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!message.trim()) {
      setError(t('askSam.contact.writeFirst'));
      warn();
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await onSend({
        topic,
        name: name.trim(),
        message: compose(message.trim(), includeChat ? transcript() : []),
      });
      success();
      setSent(true);
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-row items-start gap-3 rounded-[14px] border border-line bg-card p-4">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-tint">
          <Check size={18} color={colors.tintInk} strokeWidth={2.4} />
        </View>
        <Text
          className="min-w-0 flex-1 font-app text-[14px] leading-[21px] text-body"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {email ? t('askSam.contact.sent', { email }) : t('askSam.contact.sentNoEmail')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4 rounded-[14px] border border-line bg-card p-4">
      <View className="flex-row flex-wrap gap-2">
        {(['support', 'idea'] as const).map((option) => {
          const chosen = option === topic;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen }}
              onPress={() => setTopic(option)}
              className={`rounded-full border px-3.5 py-2 ${chosen ? 'border-transparent bg-tint' : 'border-line'}`}
            >
              <Text
                className={`font-app-semibold text-[13.5px] ${chosen ? 'text-tint-ink' : 'text-body'}`}
                maxFontSizeMultiplier={TEXT_CAP.control}
              >
                {t(option === 'support' ? 'askSam.contact.help' : 'askSam.contact.idea')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label={t('askSam.contact.name')}
        value={name}
        onChangeText={setName}
        optional
        autoComplete="name"
      />
      <TextField
        label={t('askSam.contact.message')}
        value={message}
        onChangeText={setMessage}
        multiline
        error={error}
        placeholder={t(
          topic === 'idea' ? 'askSam.contact.ideaPlaceholder' : 'askSam.contact.helpPlaceholder',
        )}
      />

      <View className="flex-row items-center justify-between gap-3">
        <Text
          className="min-w-0 flex-1 font-app text-[14px] leading-[20px] text-body"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('askSam.contact.includeChat')}
        </Text>
        <SwitchControl value={includeChat} onValueChange={setIncludeChat} />
      </View>

      {email ? (
        <Text
          className="font-app text-[13px] leading-[19px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('askSam.contact.replyTo', { email })}
        </Text>
      ) : null}

      <Button
        label={t(sending ? 'askSam.contact.sending' : 'askSam.contact.send')}
        onPress={send}
        disabled={sending}
      />
    </View>
  );
}

/** The person's own words first, then the chat, cut from the oldest end to fit. */
export function compose(message: string, lines: TranscriptLine[]): string {
  if (!lines.length) return message.slice(0, MAX_MESSAGE);
  const heading = `\n\n— ${t('askSam.contact.chatHeading')} —\n`;
  const room = MAX_MESSAGE - message.length - heading.length;
  if (room < 200) return message.slice(0, MAX_MESSAGE);
  let chat = lines
    .map((line) => `${line.from === 'user' ? 'Me' : 'Sam'}: ${plainText(line.text)}`)
    .join('\n');
  if (chat.length > room) chat = `…${chat.slice(chat.length - room + 1)}`;
  return `${message}${heading}${chat}`;
}
