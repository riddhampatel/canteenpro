import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/config.dart';
import 'core/push.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'features/auth/splash_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/change_pin_screen.dart';
import 'features/employee/employee_shell.dart';
import 'features/staff/staff_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor: Colors.transparent, statusBarIconBrightness: Brightness.dark));
  await Push.init();
  final session = Session();
  session.load();
  runApp(ChangeNotifierProvider.value(value: session, child: const CanteenApp()));
}

class CanteenApp extends StatelessWidget {
  const CanteenApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const RootGate(),
    );
  }
}

/// Decides which experience to show based on the session.
class RootGate extends StatelessWidget {
  const RootGate({super.key});
  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    Widget child;
    if (!s.ready) {
      child = const SplashScreen();
    } else if (!s.signedIn) {
      child = const LoginScreen();
    } else if (s.mode == AppMode.employee && s.mustChangePin) {
      child = const ChangePinScreen(firstLogin: true);
    } else if (s.mode == AppMode.employee) {
      child = const EmployeeShell();
    } else {
      child = const StaffShell();
    }
    return AnimatedSwitcher(duration: const Duration(milliseconds: 250), child: KeyedSubtree(key: ValueKey(child.runtimeType), child: child));
  }
}
