import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../widgets/common.dart';
import 'dashboard_screen.dart';
import 'serve_screen.dart';
import 'staff_menu_screen.dart';
import 'more_screen.dart';

/// Owner / manager / cashier / kitchen experience.
class StaffShell extends StatefulWidget {
  const StaffShell({super.key});
  @override
  State<StaffShell> createState() => _StaffShellState();
}

class _StaffShellState extends State<StaffShell> {
  int index = 0;
  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    final canServe = s.role != 'KITCHEN';
    final tabs = <(IconData, String, Widget)>[
      (Icons.space_dashboard_rounded, 'Dashboard', const DashboardScreen()),
      if (canServe) (Icons.qr_code_scanner_rounded, 'Serve', const ServeScreen()),
      (Icons.restaurant_menu_rounded, 'Menu', const StaffMenuScreen()),
      (Icons.grid_view_rounded, 'More', const MoreScreen()),
    ];
    if (index >= tabs.length) index = 0;
    return Scaffold(
      extendBody: true,
      // keyed by canteen so every tab reloads when the canteen changes
      body: KeyedSubtree(key: ValueKey('${s.canteenId}-$index'), child: tabs[index].$3),
      bottomNavigationBar: FloatingNav(
        index: index,
        onTap: (i) => setState(() => index = i),
        icons: tabs.map((t) => t.$1).toList(),
        labels: tabs.map((t) => t.$2).toList(),
      ),
    );
  }
}

/// Header with canteen switcher, reused by staff screens.
class StaffHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const StaffHeader(this.title, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 12, 12, 6),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF1E3A8A))),
            if (s.canteens.length > 1)
              PopupMenuButton<String>(
                onSelected: (id) => s.selectCanteen(id),
                itemBuilder: (_) => s.canteens.map((c) => PopupMenuItem(value: c['id'] as String, child: Text(c['name'] ?? ''))).toList(),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Flexible(child: Text(s.currentCanteen?['name'] ?? '', overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600))),
                  const Icon(Icons.expand_more, size: 18, color: Color(0xFF64748B)),
                ]),
              )
            else
              Text(s.currentCanteen?['name'] ?? s.tenant['name'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ]),
        ),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

