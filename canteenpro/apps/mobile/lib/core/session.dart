import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api.dart';
import 'push.dart';

enum AppMode { employee, staff }

/// Holds the signed-in user (employee or staff) and persists it securely.
class Session extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  static const _key = 'cp_session_v1';

  bool ready = false;
  AppMode? mode;
  String? token;
  Map<String, dynamic> data = {}; // login payload (employee/tenant/canteen or user/tenant/canteens)
  bool mustChangePin = false;
  String? canteenId; // staff: selected canteen

  bool get signedIn => token != null && mode != null;
  Map<String, dynamic> get tenant => (data['tenant'] as Map?)?.cast<String, dynamic>() ?? {};
  Map<String, dynamic> get employee => (data['employee'] as Map?)?.cast<String, dynamic>() ?? {};
  Map<String, dynamic> get user => (data['user'] as Map?)?.cast<String, dynamic>() ?? {};
  List<Map<String, dynamic>> get canteens => ((data['canteens'] as List?) ?? []).map((e) => (e as Map).cast<String, dynamic>()).toList();
  String get role => user['role']?.toString() ?? '';
  bool get isManager => role == 'OWNER' || role == 'MANAGER';
  Map<String, dynamic>? get currentCanteen {
    for (final c in canteens) {
      if (c['id'] == canteenId) return c;
    }
    return canteens.isEmpty ? null : canteens.first;
  }

  Future<void> load() async {
    Api.instance.onUnauthorized = logout;
    try {
      final raw = await _storage.read(key: _key);
      if (raw != null) {
        final m = jsonDecode(raw) as Map<String, dynamic>;
        mode = m['mode'] == 'staff' ? AppMode.staff : AppMode.employee;
        token = m['token'] as String?;
        data = (m['data'] as Map).cast<String, dynamic>();
        canteenId = m['canteenId'] as String?;
        mustChangePin = m['mustChangePin'] == true;
        Api.instance.token = token;
        Push.identify(this);
      }
    } catch (_) {
      await _storage.delete(key: _key);
    }
    ready = true;
    notifyListeners();
  }

  Future<void> _save() => _storage.write(
        key: _key,
        value: jsonEncode({'mode': mode?.name, 'token': token, 'data': data, 'canteenId': canteenId, 'mustChangePin': mustChangePin}),
      );

  Future<void> loginEmployee(String phone, String pin) async {
    final r = await Api.instance.post('/employee/auth/login', {'phone': phone, 'pin': pin}) as Map<String, dynamic>;
    mode = AppMode.employee;
    token = r['token'] as String;
    data = r;
    mustChangePin = r['mustChangePin'] == true;
    Api.instance.token = token;
    await _save();
    Push.identify(this);
    notifyListeners();
  }

  Future<void> loginStaff(String email, String password) async {
    final r = await Api.instance.post('/auth/login', {'email': email, 'password': password}) as Map<String, dynamic>;
    mode = AppMode.staff;
    token = r['token'] as String;
    data = r;
    final list = (r['canteens'] as List?) ?? [];
    canteenId = list.isNotEmpty ? (list.first as Map)['id'] as String : null;
    Api.instance.token = token;
    await _save();
    Push.identify(this);
    notifyListeners();
  }

  Future<void> pinChanged() async {
    mustChangePin = false;
    await _save();
    notifyListeners();
  }

  Future<void> selectCanteen(String id) async {
    canteenId = id;
    await _save();
    notifyListeners();
  }

  Future<void> logout() async {
    Push.logout();
    mode = null;
    token = null;
    data = {};
    canteenId = null;
    Api.instance.token = null;
    await _storage.delete(key: _key);
    notifyListeners();
  }
}
