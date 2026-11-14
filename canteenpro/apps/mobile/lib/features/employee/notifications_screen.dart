import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _key = GlobalKey<AsyncViewState<List<Map>>>();
  Future<List<Map>> _load() async => ((await Api.instance.get('/employee/notifications')) as List).cast<Map>();

  (IconData, Color, Color) _style(String? t) => switch (t) {
        'MENU' => (Icons.restaurant_rounded, AppColors.primary, AppColors.primarySoft),
        'REMINDER' => (Icons.alarm_rounded, AppColors.violet, const Color(0xFFF1ECFE)),
        'WALLET' => (Icons.account_balance_wallet_rounded, AppColors.green, AppColors.greenSoft),
        'SYSTEM' => (Icons.schedule_rounded, const Color(0xFF0EA5E9), const Color(0xFFE6F6FD)),
        _ => (Icons.campaign_rounded, AppColors.amber, AppColors.amberSoft),
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async {
              await Api.instance.post('/employee/notifications/read-all');
              _key.currentState?.reload();
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: AsyncView<List<Map>>(
        key: _key,
        load: _load,
        builder: (context, list, _) {
          final unread = list.where((n) => n['isRead'] != true).length;
          return ListView(padding: const EdgeInsets.all(16), physics: const AlwaysScrollableScrollPhysics(), children: [
            if (unread > 0)
              AppCard(
                color: AppColors.primarySoft,
                borderColor: AppColors.primarySoft,
                child: Row(children: [const Icon(Icons.notifications_active_rounded, color: AppColors.primary), const SizedBox(width: 10), Text('You have $unread unread notification${unread == 1 ? '' : 's'}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700))]),
              ),
            if (list.isEmpty) const EmptyView(icon: Icons.notifications_off_outlined, title: 'No notifications', text: 'Menu updates and reminders will appear here.'),
            for (final n in list) ...[
              const SizedBox(height: 10),
              Builder(builder: (_) {
                final (icon, color, bg) = _style(n['type']);
                final read = n['isRead'] == true;
                return AppCard(
                  borderColor: read ? AppColors.line : const Color(0xFFBFD0FF),
                  onTap: read
                      ? null
                      : () async {
                          await Api.instance.post('/employee/notifications/${n['id']}/read');
                          _key.currentState?.reload();
                        },
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Pill(titleCase(n['type']), color: color, bg: bg),
                          const Spacer(),
                          Text(dayLabel(n['createdAt']) == 'Today' ? time(n['createdAt']) : dayLabel(n['createdAt']), style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                          if (!read) const Padding(padding: EdgeInsets.only(left: 6), child: CircleAvatar(radius: 4, backgroundColor: AppColors.primary)),
                        ]),
                        const SizedBox(height: 6),
                        Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        const SizedBox(height: 2),
                        Text(n['body'] ?? '', style: const TextStyle(color: AppColors.muted)),
                      ]),
                    ),
                  ]),
                );
              }),
            ],
          ]);
        },
      ),
    );
  }
}
