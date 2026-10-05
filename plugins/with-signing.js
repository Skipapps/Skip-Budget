const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Pins the Apple team and turns on automatic signing.
 *
 * `expo prebuild` regenerates ios/ from scratch, so a team set by hand in Xcode is lost and device
 * builds fail with "no account for team". Automatic signing lets Xcode renew the certificate and
 * profile itself instead of breaking when a profile expires.
 */
const withSigning = (config, { teamId }) =>
  withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(configurations)) {
      const build = configurations[key];
      // Comment entries sit alongside real ones in this section.
      if (!build || typeof build !== 'object' || !build.buildSettings) continue;

      const settings = build.buildSettings;
      // Only the app target; the Pods project signs itself and must be left alone.
      if (settings.PRODUCT_NAME !== '"$(TARGET_NAME)"' && !settings.PRODUCT_BUNDLE_IDENTIFIER) {
        continue;
      }

      settings.DEVELOPMENT_TEAM = teamId;
      settings.CODE_SIGN_STYLE = 'Automatic';
    }

    return mod;
  });

module.exports = withSigning;
