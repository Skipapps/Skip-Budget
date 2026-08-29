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
import { useUserEmail } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';

/**
 * One form for both ways of writing in.
 *
 * Support and ideas go to the same inbox and want the same three things, so
 * they are the same screen with a different heading rather than two screens
 * that will drift apart. The topic only changes the words and the subject line
 * the email arrives under.
 *
 * The address is shown but never editable. It is read from the session on the
 * server anyway, so a field here would be a box you can type in that changes
 * nothing — worse than no box at all.
 */

const COPY: Record<MessageTopic, { title: string; subtitle: string; placeholder: string }> = {
  support: {
    title: 'Email support',
    subtitle: 'Tell us what went wrong and we will look into it.',
    placeholder: 'What happened, and what were you doing when it did?',
  },
  idea: {
    title: 'Share an idea',
    subtitle: 'What should Skip do next?',
    placeholder: 'Describe the thing you wish Skip could do.',
  },
};

export default function ContactScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ topic?: string }>();
  const topic: MessageTopic = params.topic === 'idea' ? 'idea' : 'support';
  const copy = COPY[topic];

  const email = useUserEmail();
  const profile = useProfile();
  const send = useSendMessage();

  const [name, setName] = useState(profile.data?.display_name ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Write a message first.');
      warn();
      return;
    }

    setError(null);
    try {
      await send.mutateAsync({ topic, name: name.trim(), message: message.trim() });
      success();
      setSent(true);
    } catch (thrown) {
      warn();
      setError((thrown as Error).message);
    }
  };

  if (sent) {
    return (
      <Screen showBack>
        <View className="flex-1 items-center justify-center gap-6 px-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-accent/15">
            <Check size={36} color={colors.accentInk} strokeWidth={2.4} />
          </View>

          <View className="items-center gap-2">
            <Title>Sent</Title>
            <Subtitle className="text-center">
              Thanks — we read every one. If it needs an answer it will come to {email}.
            </Subtitle>
          </View>

          <Button label="Done" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showBack avoidKeyboard>
      <Title align="left" className="mt-1 w-full">
        {copy.title}
      </Title>
      <Subtitle className="mt-2 w-full text-left">{copy.subtitle}</Subtitle>

      <View className="mt-7 w-full gap-5">
        <TextField
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder="What should we call you?"
          autoCapitalize="words"
          returnKeyType="next"
        />

        <View className="w-full">
          <FieldLabel className="mb-2">Your email</FieldLabel>
          <View className="w-full rounded-[10px] border border-line bg-ink/[0.03] px-4 py-3.5">
            <Text className="font-poppins text-[15px] text-muted" maxFontSizeMultiplier={1.3}>
              {email ?? 'Signed in'}
            </Text>
          </View>
          <Text className="mt-1.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            We reply to the address you signed in with.
          </Text>
        </View>

        <View className="w-full">
          <FieldLabel className="mb-2">Message</FieldLabel>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={copy.placeholder}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            maxLength={4000}
            className="min-h-[160px] w-full rounded-[10px] border border-line bg-card px-4 py-3.5 font-poppins text-[15px] text-ink"
            maxFontSizeMultiplier={1.3}
          />
          <Text
            className="mt-1.5 self-end font-poppins text-[12px] text-muted"
            maxFontSizeMultiplier={1.2}
          >
            {message.length} / 4000
          </Text>
        </View>
      </View>

      {error ? (
        <Text
          className="mt-4 w-full text-center font-poppins text-[13px] text-money-out"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-auto w-full pt-8">
        <Button
          label={send.isPending ? 'Sending…' : 'Send'}
          onPress={() => void handleSend()}
          disabled={send.isPending}
        />
      </View>
    </Screen>
  );
}
