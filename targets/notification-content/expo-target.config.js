/**
 * The card that opens when a Skip notification is pressed and held: the
 * logo, the amount, when it lands and which card or account pays, with
 * "View …" and "Remind me in 1 hour" underneath.
 *
 * Shown for notifications in the `skip.item` category, set in Info.plist here
 * and sent by supabase/functions/send-push/index.ts.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'notification-content',
  name: 'SkipNotificationContent',
  bundleIdentifier: '.notification-content',
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI'],
};
