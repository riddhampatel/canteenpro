import 'package:flutter/foundation.dart';
import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'config.dart';
import 'session.dart';

/// OneSignal wiring. External IDs match the API: emp_<employeeId> / staff_<staffId>.
class Push {
  static bool _ready = false;

  static Future<void> init() async {
    if (AppConfig.oneSignalAppId.isEmpty) return;
    try {
      OneSignal.Debug.setLogLevel(kDebugMode ? OSLogLevel.warn : OSLogLevel.none);
      OneSignal.initialize(AppConfig.oneSignalAppId);
      await OneSignal.Notifications.requestPermission(true);
      _ready = true;
    } catch (e) {
      debugPrint('OneSignal init failed: $e');
    }
  }

  static void identify(Session s) {
    if (!_ready || !s.signedIn) return;
    try {
      if (s.mode == AppMode.employee) {
        OneSignal.login('emp_${s.employee['id']}');
        OneSignal.User.addTags({'tenantId': '${s.tenant['id']}', 'canteenId': '${(s.data['canteen'] as Map?)?['id'] ?? ''}', 'role': 'employee'});
      } else {
        OneSignal.login('staff_${s.user['id']}');
        OneSignal.User.addTags({'tenantId': '${s.tenant['id']}', 'role': s.role.toLowerCase()});
      }
    } catch (e) {
      debugPrint('OneSignal identify failed: $e');
    }
  }

  static void logout() {
    if (!_ready) return;
    try {
      OneSignal.logout();
    } catch (_) {}
  }
}
