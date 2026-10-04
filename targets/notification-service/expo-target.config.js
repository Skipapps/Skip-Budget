/**
 * Attaches the brand logo, or the category's icon, to a Skip notification
 * before iOS shows it — the thumbnail on the right of the banner.
 *
 * Runs only for pushes the server marks with `mutable-content` (see
 * supabase/functions/send-push/index.ts). It has a few seconds; on a slow
 * network the notification goes out without a picture rather than late.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'notification-service',
  name: 'SkipNotificationService',
  bundleIdentifier: '.notification-service',
  deploymentTarget: '16.4',
};
