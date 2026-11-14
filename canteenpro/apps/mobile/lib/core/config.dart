/// Build-time configuration. Override with --dart-define, e.g.
/// flutter run --dart-define=API_URL=https://api.canteenpro.in/api --dart-define=ONESIGNAL_APP_ID=xxxx
class AppConfig {
  /// Android emulator reaches the host machine at 10.0.2.2
  static const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:4000/api');
  static const oneSignalAppId = String.fromEnvironment('ONESIGNAL_APP_ID', defaultValue: '');
  static const appName = String.fromEnvironment('APP_NAME', defaultValue: 'CanteenPro');
  static const supportWhatsApp = String.fromEnvironment('SUPPORT_WHATSAPP', defaultValue: '919427572571');
}
