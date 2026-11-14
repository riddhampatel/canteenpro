import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'staff_shell.dart';
import 'guests_screen.dart';
import 'transactions_screen.dart';
import 'employees_screen.dart';
import 'announce_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    void go(Widget w) => Navigator.push(context, MaterialPageRoute(builder: (_) => w));
    final tiles = <(IconData, String, String, Widget, bool)>[
      (Icons.receipt_long_rounded, 'Transactions', 'Bills & meals, cancel with refund', const TransactionsScreen(), s.role != 'KITCHEN'),
      (Icons.person_add_alt_1_rounded, 'Guests', 'Register visitors and serve meals', const GuestsScreen(), s.role != 'KITCHEN'),
      (Icons.groups_rounded, 'Employees', 'Look up, recharge wallet, reset PIN', const EmployeesScreen(), s.isManager || s.role == 'CASHIER'),
      (Icons.campaign_rounded, 'Announcement', 'Push a message to employees', const AnnounceScreen(), s.isManager),
    ];
    return SafeArea(
      bottom: false,
      child: ListView(padding: const EdgeInsets.only(bottom: 120), children: [
        const StaffHeader('More'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Column(children: [
            AppCard(
              child: Row(children: [
                Avatar(name: s.user['name']),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(s.user['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)), Text('${s.tenant['name']} · ${s.role.toLowerCase()}', style: const TextStyle(color: AppColors.muted))])),
              ]),
            ),
            const SizedBox(height: 12),
            for (final t in tiles.where((t) => t.$5))
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: AppCard(
                  onTap: () => go(t.$4),
                  child: Row(children: [
                    Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(12)), child: Icon(t.$1, color: AppColors.primary)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(t.$2, style: const TextStyle(fontWeight: FontWeight.w800)), Text(t.$3, style: const TextStyle(color: AppColors.muted, fontSize: 13))])),
                    const Icon(Icons.chevron_right),
                  ]),
                ),
              ),
            const SizedBox(height: 8),
            const Text('Reports, billing and settings are in the web console.', style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 16),
            FilledButton.icon(style: FilledButton.styleFrom(backgroundColor: AppColors.red), onPressed: () => s.logout(), icon: const Icon(Icons.logout_rounded), label: const Text('Sign out')),
          ]),
        ),
      ]),
    );
  }
}
