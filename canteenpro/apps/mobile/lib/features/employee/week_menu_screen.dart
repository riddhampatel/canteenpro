import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class WeekMenuScreen extends StatelessWidget {
  const WeekMenuScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("This week's menu")),
      body: AsyncView<List<Map>>(
        load: () async => ((await Api.instance.get('/employee/menu')) as List).cast<Map>(),
        builder: (context, rows, _) {
          if (rows.isEmpty) return ListView(children: const [EmptyView(icon: Icons.calendar_month_rounded, title: 'No menu published yet')]);
          final byDate = <String, List<Map>>{};
          for (final r in rows) {
            byDate.putIfAbsent(r['date'], () => []).add(r);
          }
          return ListView(padding: const EdgeInsets.all(16), children: [
            for (final e in byDate.entries) ...[
              Padding(padding: const EdgeInsets.only(top: 12, bottom: 8), child: Text(dayLabel(e.key), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary))),
              for (final m in e.value)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: AppCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(m['session'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      for (final i in (m['items'] as List).cast<Map>())
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          child: Row(children: [FoodDot(i['foodType']), const SizedBox(width: 8), Expanded(child: Text(i['name'])), Text(inr(asNum(i['price'])), style: const TextStyle(color: AppColors.muted))]),
                        ),
                    ]),
                  ),
                ),
            ],
          ]);
        },
      ),
    );
  }
}
