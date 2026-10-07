/**
 * Android notification small icon and accent colour, without the rest of the expo-notifications config plugin.
 *
 * Android draws a notification's small icon from its alpha channel only. With none configured it falls back to the
 * launcher icon, which is opaque, so the status bar shows a white square. This copies `assets/notification-icon.png`
 * (the XORR mark, white on transparent) into the drawable folders and points expo-notifications' manifest metadata at
 * it. The full expo-notifications plugin would also add an iOS `aps-environment` entitlement for remote push, which this
 * build does not use (its notifications are all local), so only the Android half is applied.
 */
const { withNotificationsAndroid } = require('expo-notifications/plugin/build/withNotificationsAndroid');

module.exports = function withAndroidNotificationIcon(config, { icon, color }) {
  return withNotificationsAndroid(config, { icon, color });
};
