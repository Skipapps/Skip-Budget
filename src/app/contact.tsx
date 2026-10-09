import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useSendMessage, type MessageTopic } from '@/api/contact';
import { useProfile } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { success, warn } from '@/lib/haptics';
import { useToast } from '@/providers/toast-context';
import { useUserEmail } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';
import { failureMessage } from '@/lib/failure';
import { t } from '@/i18n';

/**
 * Support and ideas share one inbox and form; the topic only changes the words and the email's
 * subject line. The address is shown but never editable: the server reads it from the session.
 */
function copyFor(topic: MessageTopic): { title: string; subtitle: string; placeholder: string } {
  return topic === 'idea'
    ? {
        title: t('support.idea'),
        subtitle: t('support.ideaDetail'),
        placeholder: t('support.contact.ideaPlaceholder'),
      }
    : {
        title: t('support.email'),
        subtitle: t('support.contact.supportSubtitle'),
        placeholder: t('support.contact.supportPlaceholder'),
      };
}

export default function ContactScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ topic?: string }>();
  const topic: MessageTopic = params.topic === 'idea' ? 'idea' : 'support';
  const copy = copyFor(topic);

  const email = useUserEmail();
  const profile = useProfile();
  const send = useSendMessage();
  const toast = useToast();

  const [name, setName] = useState(profile.data?.display_name ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      setError(t('support.contact.writeFirst'));
      warn();
      return;
    }

    setError(null);
    try {
      await send.mutateAsync({ topic, name: name.trim(), message: message.trim() });
      success();
      toast('toast.message.sent');
      setSent(true);
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
    }
  };

  if (sent) {
    return (
      <Screen title={copy.title} showBack>
        <View className="flex-1 items-center justify-center gap-6 px-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-accent/15">
            <Check size={36} color={colors.accentInk} strokeWidth={2.4} />
          </View>

          <View className="items-center gap-2">
            <Title flush>{t('support.contact.sent')}</Title>
            <Subtitle className="text-center">
              {t('support.contact.thanks', { email: email ?? '' })}
            </Subtitle>
          </View>

          <Button label={t('common.done')} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={copy.title} showBack avoidKeyboard>
      <Subtitle className="mt-2 w-full text-left">{copy.subtitle}</Subtitle>

      <View className="mt-7 w-full gap-5">
        <TextField
          label={t('support.contact.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('support.contact.namePlaceholder')}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <View className="w-full">
          <FieldLabel className="mb-2">{t('support.contact.emailLabel')}</FieldLabel>
          <View className="w-full rounded-[10px] border border-line bg-ink/[0.03] px-4 py-3.5">
            <Text className="font-app text-[15px] text-muted" maxFontSizeMultiplier={1.3}>
              {email ?? t('support.contact.signedIn')}
            </Text>
          </View>
          <Text className="mt-1.5 font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            {t('support.contact.replyNote')}
          </Text>
        </View>

        <View className="w-full">
          <FieldLabel className="mb-2">{t('support.contact.message')}</FieldLabel>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={copy.placeholder}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            maxLength={4000}
            className="min-h-[160px] w-full rounded-[10px] border border-line bg-card px-4 py-3.5 font-app text-[15px] text-ink"
            maxFontSizeMultiplier={1.3}
          />
          <Text
            className="mt-1.5 self-end font-app text-[12px] text-muted"
            maxFontSizeMultiplier={1.2}
          >
            {message.length} / 4000
          </Text>
        </View>
      </View>

      {error ? (
        <Text
          className="mt-4 w-full text-center font-app text-[13px] text-money-out"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-auto w-full pt-8">
        <Button
          label={send.isPending ? t('support.contact.sending') : t('support.contact.send')}
          onPress={() => void handleSend()}
          disabled={send.isPending}
        />
      </View>
    </Screen>
  );
}
