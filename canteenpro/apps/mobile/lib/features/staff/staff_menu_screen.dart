import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'staff_shell.dart';

/// Today's menu with sold-out toggles + headcount forecast.
class StaffMenuScreen extends StatefulWidget {
  const StaffMenuScreen({super.key});
  @override
  State<StaffMenuScreen> createState() => _StaffMenuScreenState();
}

class _StaffMenuScreenState extends State<StaffMenuScreen> {
  final _key = GlobalKey<AsyncViewState<List<dynamic>>>();

  Future<List<dynamic>> _load() async {
    final id = context.read<Session>().canteenId;
    return Future.wait([
      Api.instance.get('/tenant/menu/daily', {'canteenId': id}),
      Api.instance.get('/tenant/opt-ins/forecast', {'canteenId': id}),
    ]);
  }

  Future<void> _toggle(Map item) async {
    try {
      await Api.instance.patch('/tenant/menu/daily-items/${item['id']}', {'isAvailable': item['isAvailable'] != true});
      _key.currentState?.reload();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = context.watch<Session>().role != 'CASHIER';
    return SafeArea(
      bottom: false,
      child: Column(children: [
        const StaffHeader("Today's menu"),
        Expanded(
          child: AsyncView<List<dynamic>>(
            key: _key,
            load: _load,
            builder: (context, data, _) {
              final day = ((data[0]['days'] as List).first as Map);
              final sessions = (day['sessions'] as List).cast<Map>();
              final forecast = ((data[1]['sessions'] as List?) ?? []).cast<Map>();
              return ListView(padding: const EdgeInsets.fromLTRB(18, 8, 18, 120), physics: const AlwaysScrollableScrollPhysics(), children: [
                for (final s in sessions) ...[
                  Builder(builder: (_) {
                    final f = forecast.where((x) => x['session']['id'] == s['session']['id']).firstOrNull;
                    return Padding(
                      padding: const EdgeInsets.only(top: 14, bottom: 8),
                      child: Row(children: [
                        Expanded(child: Text('${s['session']['name']}  ·  ${s['session']['startTime']}–${s['session']['endTime']}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
                        if (f != null) Pill('Prepare ~${f['predicted']}', icon: Icons.soup_kitchen_outlined),
                      ]),
                    );
                  }),
                  if ((s['items'] as List).isEmpty) const AppCard(child: Text('No dishes planned. Add them from the web console.', style: TextStyle(color: AppColors.muted))),
                  for (final i in (s['items'] as List).cast<Map>())
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: AppCard(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        child: Row(children: [
                          FoodDot(i['foodType']),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(i['name'] ?? '', style: TextStyle(fontWeight: FontWeight.w700, decoration: i['isAvailable'] == true ? null : TextDecoration.lineThrough)),
                              Text(inr(asNum(i['price'])), style: const TextStyle(color: AppColors.muted, fontSize: 13)),
                            ]),
                          ),
                          Text(i['isAvailable'] == true ? 'Available' : 'Sold out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: i['isAvailable'] == true ? AppColors.green : AppColors.red)),
                          Switch(value: i['isAvailable'] == true, onChanged: canEdit ? (_) => _toggle(i) : null),
                        ]),
                      ),
                    ),
                ],
              ]);
            },
          ),
        ),
      ]),
    );
  }
}
