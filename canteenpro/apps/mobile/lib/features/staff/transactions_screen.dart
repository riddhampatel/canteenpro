import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});
  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final _key = GlobalKey<AsyncViewState<Map>>();

  Future<Map> _load() async => await Api.instance.get('/tenant/orders', {'canteenId': context.read<Session>().canteenId, 'pageSize': 100}) as Map;

  Future<void> _cancel(Map o) async {
    final reason = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Cancel bill ${o['billNo']}?'),
        content: TextField(controller: reason, decoration: const InputDecoration(hintText: 'Reason (required)')),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Cancel bill'))],
      ),
    );
    if (ok != true) return;
    try {
      await Api.instance.post('/tenant/orders/${o['id']}/cancel', {'reason': reason.text.trim()});
      if (mounted) showSnack(context, o['paymentMode'] == 'WALLET' ? 'Bill cancelled and wallet refunded' : 'Bill cancelled');
      _key.currentState?.reload();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isManager = context.watch<Session>().isManager;
    return Scaffold(
      appBar: AppBar(title: const Text("Today's transactions")),
      body: AsyncView<Map>(
        key: _key,
        load: _load,
        builder: (context, d, _) {
          final items = ((d['items'] as List?) ?? []).cast<Map>();
          final s = (d['summary'] as Map?) ?? {};
          return ListView(padding: const EdgeInsets.all(16), physics: const AlwaysScrollableScrollPhysics(), children: [
            Row(children: [
              Expanded(child: StatTile(label: 'Meals', value: '${s['meals'] ?? 0}', icon: Icons.restaurant)),
              const SizedBox(width: 10),
              Expanded(child: StatTile(label: 'Collected', value: inr(asNum(s['total'])), icon: Icons.currency_rupee, color: AppColors.green)),
            ]),
            const SizedBox(height: 12),
            if (items.isEmpty) const EmptyView(title: 'No bills yet today'),
            for (final o in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AppCard(
                  onTap: isManager && o['status'] == 'COMPLETED' ? () => _cancel(o) : null,
                  child: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(o['employeeName'] ?? o['guestName'] ?? o['walkInName'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800)),
                        Text('${o['billNo']} · ${time(o['createdAt'])} · ${o['session'] ?? 'À la carte'}', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                      ]),
                    ),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text(inr(asNum(o['total'])), style: const TextStyle(fontWeight: FontWeight.w800)),
                      o['status'] == 'COMPLETED' ? Text(titleCase(o['paymentMode']), style: const TextStyle(fontSize: 12, color: AppColors.muted)) : Pill.red('Cancelled'),
                    ]),
                  ]),
                ),
              ),
            if (isManager && items.isNotEmpty) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Tap a bill to cancel it.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted))),
          ]);
        },
      ),
    );
  }
}
