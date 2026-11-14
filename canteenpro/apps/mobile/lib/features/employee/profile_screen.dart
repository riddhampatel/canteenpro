import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../auth/change_pin_screen.dart';
import 'wallet_screen.dart';
import 'notifications_screen.dart';
import 'week_menu_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<Map> _load() async => await Api.instance.get('/employee/me') as Map;

  void _showQr(BuildContext context, Map me) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('My meal QR', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const Text('Show this to the cashier to get served', style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 18),
            QrImageView(data: me['qr'], size: 230, eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: AppColors.primary)),
            const SizedBox(height: 10),
            Text('${me['name']} · ${me['employeeCode']}', style: const TextStyle(fontWeight: FontWeight.w700)),
          ]),
        ),
      ),
    );
  }

  Future<void> _diet(BuildContext context, Map me, VoidCallback reload) async {
    final v = await showModalBottomSheet<String>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          for (final t in ['VEG', 'NON_VEG', 'EGG', 'VEGAN', 'JAIN'])
            ListTile(title: Text(titleCase(t)), trailing: me['dietaryPref'] == t ? const Icon(Icons.check, color: AppColors.primary) : null, onTap: () => Navigator.pop(context, t)),
        ]),
      ),
    );
    if (v == null) return;
    await Api.instance.patch('/employee/me', {'dietaryPref': v});
    reload();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: AsyncView<Map>(
        load: _load,
        builder: (context, me, reload) {
          final stats = (me['stats'] as Map?) ?? {};
          return ListView(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 120),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              const Center(child: Text('Profile', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary))),
              const SizedBox(height: 16),
              AppCard(
                padding: const EdgeInsets.all(18),
                child: Column(children: [
                  Row(children: [
                    Avatar(name: me['name'], url: me['photoUrl'], size: 72),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(me['name'] ?? '', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                        Text('ID: ${me['employeeCode']}', style: const TextStyle(color: AppColors.muted)),
                        const SizedBox(height: 6),
                        if (me['department'] != null) Pill('${me['department']} Dept'),
                      ]),
                    ),
                    IconButton.filledTonal(tooltip: 'My meal QR', onPressed: () => _showQr(context, me), icon: const Icon(Icons.qr_code_2_rounded)),
                  ]),
                  const SizedBox(height: 18),
                  InkWell(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen())),
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF0F1E4F)]), borderRadius: BorderRadius.circular(18)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          const Expanded(child: Text('CANTEEN WALLET', style: TextStyle(color: Color(0xFFBFD0FF), letterSpacing: 1.4, fontWeight: FontWeight.w700, fontSize: 12))),
                          Pill(titleCase(me['defaultPayMode']), color: Colors.white, bg: Colors.white24),
                        ]),
                        const SizedBox(height: 10),
                        Text(inr(asNum(me['walletBalance']), decimals: true), style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
                        if (asNum(me['monthlyAllowance']) > 0) Text('+${inr(asNum(me['monthlyAllowance']))} allowance every month', style: const TextStyle(color: Color(0xFFBFD0FF), fontSize: 13)),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(children: [
                    Expanded(child: _Mini(label: 'Meals this month', value: '${stats['mealsThisMonth'] ?? 0}')),
                    const SizedBox(width: 10),
                    Expanded(child: _Mini(label: 'Spent this month', value: inr(asNum(stats['spentThisMonth'])))),
                  ]),
                  const Divider(height: 30),
                  ListTile(contentPadding: EdgeInsets.zero, title: const Text('Dietary preference', style: TextStyle(fontWeight: FontWeight.w600)), trailing: Pill.grey(titleCase(me['dietaryPref'])), onTap: () => _diet(context, me, reload)),
                  ListTile(contentPadding: EdgeInsets.zero, title: const Text('Status', style: TextStyle(fontWeight: FontWeight.w600)), trailing: Pill.green(titleCase(me['status']), icon: Icons.check_circle_outline)),
                  ListTile(contentPadding: EdgeInsets.zero, title: const Text('Canteen', style: TextStyle(fontWeight: FontWeight.w600)), trailing: Text(me['canteen']?['name'] ?? '', style: const TextStyle(color: AppColors.muted))),
                ]),
              ),
              const SizedBox(height: 14),
              AppCard(
                padding: EdgeInsets.zero,
                child: Column(children: [
                  _Link(icon: Icons.calendar_month_rounded, text: "This week's menu", onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WeekMenuScreen()))),
                  _Link(icon: Icons.notifications_none_rounded, text: 'Notifications', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))),
                  _Link(icon: Icons.account_balance_wallet_outlined, text: 'Wallet history', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen()))),
                  _Link(icon: Icons.password_rounded, text: 'Change PIN', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePinScreen()))),
                ]),
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: AppColors.red),
                onPressed: () => context.read<Session>().logout(),
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Logout'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Mini extends StatelessWidget {
  final String label, value;
  const _Mini({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.bg, borderRadius: BorderRadius.circular(14)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        ]),
      );
}

class _Link extends StatelessWidget {
  final IconData icon;
  final String text;
  final VoidCallback onTap;
  const _Link({required this.icon, required this.text, required this.onTap});
  @override
  Widget build(BuildContext context) => ListTile(leading: Icon(icon, color: AppColors.primary), title: Text(text, style: const TextStyle(fontWeight: FontWeight.w600)), trailing: const Icon(Icons.chevron_right), onTap: onTap);
}
