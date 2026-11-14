import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'staff_shell.dart';

const _sessionColors = {'Breakfast': Color(0xFF2563EB), 'Lunch': Color(0xFF16A34A), 'Snacks': Color(0xFFF59E0B), 'Dinner': Color(0xFF8B5CF6)};

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String range = 'today';
  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    return SafeArea(
      bottom: false,
      child: Column(children: [
        const StaffHeader('Dashboard'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
          child: SegmentedButton<String>(
            segments: const [ButtonSegment(value: 'today', label: Text('Today')), ButtonSegment(value: 'week', label: Text('Week')), ButtonSegment(value: 'month', label: Text('Month'))],
            selected: {range},
            onSelectionChanged: (v) => setState(() => range = v.first),
          ),
        ),
        Expanded(
          child: AsyncView<Map>(
            key: ValueKey(range),
            load: () async => await Api.instance.get('/tenant/dashboard', {'canteenId': s.canteenId, 'range': range}) as Map,
            builder: (context, d, _) {
              final k = (d['kpis'] as Map?) ?? {};
              final menu = (d['menuStatus'] as Map?) ?? {};
              final alerts = ((d['alerts'] as List?) ?? []).cast<Map>();
              final recent = ((d['recent'] as List?) ?? []).cast<Map>();
              return ListView(padding: const EdgeInsets.fromLTRB(18, 8, 18, 120), physics: const AlwaysScrollableScrollPhysics(), children: [
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.35,
                  children: [
                    StatTile(label: 'Meals served', value: '${k['meals'] ?? 0}', icon: Icons.restaurant_rounded, hint: '${k['uniqueEaters'] ?? 0} employees'),
                    StatTile(label: 'Collected', value: inr(asNum(k['revenue'])), icon: Icons.currency_rupee_rounded, color: AppColors.green),
                    StatTile(label: 'Company subsidy', value: inr(asNum(k['subsidy'])), icon: Icons.apartment_rounded, color: AppColors.violet),
                    StatTile(label: "Today's menu", value: menu['published'] == true ? 'Live' : 'Not set', icon: Icons.check_circle_outline, color: menu['published'] == true ? AppColors.green : AppColors.amber, hint: '${menu['items'] ?? 0} items · ${menu['soldOut'] ?? 0} sold out'),
                  ],
                ),
                const SectionTitle('Meal volume'),
                AppCard(child: SizedBox(height: 210, child: _Chart(chart: (d['chart'] as Map?) ?? {}))),
                if (alerts.isNotEmpty) ...[
                  const SectionTitle('Alerts'),
                  for (final a in alerts)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: AppCard(
                        color: a['level'] == 'danger' ? AppColors.redSoft : a['level'] == 'warning' ? AppColors.amberSoft : Colors.white,
                        child: Row(children: [
                          Icon(a['level'] == 'info' ? Icons.info_outline : Icons.warning_amber_rounded, color: a['level'] == 'danger' ? AppColors.red : const Color(0xFFB45309)),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(a['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)), Text(a['text'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.muted))])),
                        ]),
                      ),
                    ),
                ],
                const SectionTitle('Who ate today'),
                if (recent.isEmpty) const EmptyView(title: 'No meals served yet today'),
                for (final r in recent)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: AppCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(children: [
                        Avatar(name: r['name'], size: 38),
                        const SizedBox(width: 10),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(r['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)), Text(r['department'] ?? titleCase(r['consumerType']), style: const TextStyle(fontSize: 12, color: AppColors.muted))])),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Pill.grey(r['session'] ?? 'À la carte'), const SizedBox(height: 4), Text(time(r['createdAt']), style: const TextStyle(fontSize: 12, color: AppColors.muted))]),
                      ]),
                    ),
                  ),
              ]);
            },
          ),
        ),
      ]),
    );
  }
}

class _Chart extends StatelessWidget {
  final Map chart;
  const _Chart({required this.chart});
  @override
  Widget build(BuildContext context) {
    final sessions = ((chart['sessions'] as List?) ?? []).cast<String>();
    final rows = ((chart['rows'] as List?) ?? []).cast<Map>();
    if (rows.isEmpty || sessions.isEmpty) return const Center(child: Text('No meals in this period', style: TextStyle(color: AppColors.muted)));
    final show = rows.length > 14 ? rows.sublist(rows.length - 14) : rows;
    return BarChart(BarChartData(
      gridData: FlGridData(show: true, drawVerticalLine: false),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            getTitlesWidget: (v, meta) {
              final i = v.toInt();
              if (i < 0 || i >= show.length) return const SizedBox.shrink();
              final date = show[i]['date'].toString();
              return Padding(padding: const EdgeInsets.only(top: 4), child: Text(date.substring(8), style: const TextStyle(fontSize: 10)));
            },
          ),
        ),
      ),
      barGroups: [
        for (var i = 0; i < show.length; i++)
          BarChartGroupData(x: i, barRods: [
            BarChartRodData(
              toY: sessions.fold<double>(0, (a, s) => a + asNum(show[i][s]).toDouble()),
              width: show.length > 7 ? 8 : 18,
              borderRadius: BorderRadius.circular(4),
              rodStackItems: () {
                double from = 0;
                return sessions.map((s) {
                  final v = asNum(show[i][s]).toDouble();
                  final item = BarChartRodStackItem(from, from + v, _sessionColors[s] ?? AppColors.muted);
                  from += v;
                  return item;
                }).toList();
              }(),
            ),
          ]),
      ],
    ));
  }
}
