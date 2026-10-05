import { useMutation } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Messages go through an Edge Function so the email provider's key never ships inside the app.
 * The app only says what the message is; the server decides whether and from where to send it.
 */

export type MessageTopic = 'support' | 'idea';

export type OutgoingMessage = {
  topic: MessageTopic;
  name: string;
  message: string;
};

export function useSendMessage() {
  return useMutation({
    mutationFn: async (values: OutgoingMessage) => {
      const { error } = await supabase.functions.invoke('send-message', { body: values });
      if (!error) return;

      // A non-2xx arrives as an opaque error; the real reason, written for the user, is in the
      // body.
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not send that. Try again in a moment.');
      }

      throw new Error('Could not reach us just now. Check your connection and try again.');
    },
  });
}
