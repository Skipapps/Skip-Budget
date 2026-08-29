import { useMutation } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Sending a note to the team.
 *
 * The send happens in an Edge Function rather than here, because the email
 * provider's key would otherwise have to ship inside the app — where anyone
 * who downloads it can read it and send mail as skipapps.net. The app only
 * says what the message is; the server decides whether to send it and from
 * where.
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

      // A non-2xx arrives as an opaque error with the real reason in the body,
      // and that reason is written for the user — "Write a message first" is
      // more use than "Edge Function returned a non-2xx status code".
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not send that. Try again in a moment.');
      }

      throw new Error('Could not reach us just now. Check your connection and try again.');
    },
  });
}
