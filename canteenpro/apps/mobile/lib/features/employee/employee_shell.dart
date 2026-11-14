import 'package:flutter/material.dart';
import '../../widgets/common.dart';
import 'home_screen.dart';
import 'scan_screen.dart';
import 'history_screen.dart';
import 'profile_screen.dart';

class EmployeeShell extends StatefulWidget {
  const EmployeeShell({super.key});
  @override
  State<EmployeeShell> createState() => _EmployeeShellState();
}

class _EmployeeShellState extends State<EmployeeShell> {
  int index = 0;
  // Scan is built only while visible so the camera is opened/closed exactly once per visit.
  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      HomeScreen(onScan: () => setState(() => index = 1)),
      ScanScreen(onDone: () => setState(() => index = 2)),
      const HistoryScreen(),
      const ProfileScreen(),
    ];
    return Scaffold(
      extendBody: true,
      body: pages[index],
      bottomNavigationBar: FloatingNav(
        index: index,
        onTap: (i) => setState(() => index = i),
        icons: const [Icons.home_rounded, Icons.qr_code_scanner_rounded, Icons.receipt_long_rounded, Icons.person_rounded],
        labels: const ['Home', 'Scan', 'History', 'Profile'],
      ),
    );
  }
}
