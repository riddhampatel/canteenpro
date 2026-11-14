import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String q = '';
  final _key = GlobalKey<AsyncViewState<List<Map>>>();

  Future<List<Map>> _load() async => ((await Api.instance.get('/employee/history', {'pageSize': 100})) as List).cast<Map>();

  IconData _icon(String? s) => switch (s) {
        'Breakfast' => Icons.free_breakfast_rounded,
        'Snacks' => Icons.cookie_rounded,
        'Dinner' => Icons.dinner_dining_rounded,
        _ => Icons.restaurant_rounded,
      };

  Future<void> _rate(Map o) async {
    int rating = 4;
    final comment = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => Padding(
          padding: EdgeInsets.fromLTRB(22, 24, 22, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('How was your ${o['session'] ?? 'meal'}?', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) => IconButton(iconSize: 40, onPressed: () => set(() => rating = i + 1), icon: Icon(i < rating ? Icons.star_rounded : Icons.star_outline_rounded, color: AppColors.amber))),
            ),
            TextField(controller: comment, maxLines: 3, decoration: const InputDecoration(hintText: 'Tell the canteen what you liked or what to improve (optional)')),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send feedback')),
          ]),
        ),
      ),
    );
    if (ok != true) return;
    try {
      await Api.instance.post('/employee/feedback', {'rating': rating, 'comment': comment.text.trim().isEmpty ? null : comment.text.trim(), 'orderId': o['id']});
      if (mounted) showSnack(context, 'Thanks for your feedback!');
      _key.currentState?.reload();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Meal History', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.primary)),
            const SizedBox(height: 12),
            TextField(onChanged: (v) => setState(() => q = v.toLowerCase()), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search meal history…')),
          ]),
        ),
        Expanded(
          child: AsyncView<List<Map>>(
            key: _key,
            load: _load,
            builder: (context, rows, _) {
              final list = rows.where((o) {
                final text = '${o['session']} ${(o['items'] as List).map((i) => i['name']).join(' ')}'.toLowerCase();
                return q.isEmpty || text.contains(q);
              }).toList();
              if (list.isEmpty) return ListView(children: const [EmptyView(icon: Icons.receipt_long_rounded, title: 'No meals yet', text: 'Meals you take at the canteen will show up here.')]);
              final children = <Widget>[];
              String? lastDay;
              for (final o in list) {
                final day = dayLabel(o['createdAt']);
                if (day != lastDay) {
                  children.add(Padding(
                    padding: const EdgeInsets.only(top: 14, bottom: 8),
                    child: Row(children: [
                      Text(day.toUpperCase(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.muted, letterSpacing: .8)),
                      const SizedBox(width: 10),
                      const Expanded(child: Divider()),
                    ]),
                  ));
                  lastDay = day;
                }
                final items = (o['items'] as List).cast<Map>();
                final cancelled = o['status'] != 'COMPLETED';
                children.add(Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: AppCard(
                    child: Row(children: [
                      Container(width: 48, height: 48, decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(14)), child: Icon(_icon(o['session']), color: AppColors.primary)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(items.map((i) => i['name']).join(', '), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          const SizedBox(height: 4),
                          Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                            Text(time(o['createdAt']), style: const TextStyle(color: AppColors.muted, fontSize: 13)),
                            if (o['session'] != null) Pill.grey(o['session']),
                            Text(inr(asNum(o['total'])), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          ]),
                        ]),
                      ),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        cancelled ? Pill.red('Cancelled') : Pill.green('Cleared'),
                        const SizedBox(height: 6),
                        if (!cancelled)
                          o['rating'] != null
                              ? Row(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.star_rounded, size: 16, color: AppColors.amber), Text('${o['rating']}', style: const TextStyle(fontWeight: FontWeight.w700))])
                              : GestureDetector(onTap: () => _rate(o), child: const Text('Rate', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700))),
                      ]),
                    ]),
                  ),
                ));
              }
              return ListView(padding: const EdgeInsets.fromLTRB(18, 0, 18, 120), physics: const AlwaysScrollableScrollPhysics(), children: children);
            },
          ),
        ),
      ]),
    );
  }
}
