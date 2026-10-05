/**
 * The card shown when a Skip notification is pressed and held.
 *
 * Used for notifications in the `skip.item` category, which supabase/functions/send-push sends.
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
