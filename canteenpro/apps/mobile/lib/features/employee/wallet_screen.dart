import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: AsyncView<Map>(
        load: () async => await Api.instance.get('/employee/wallet', {'pageSize': 100}) as Map,
        builder: (context, d, _) {
          final items = ((d['items'] as List?) ?? []).cast<Map>();
          return ListView(padding: const EdgeInsets.all(18), physics: const AlwaysScrollableScrollPhysics(), children: [
            AppCard(
              color: AppColors.primary,
              borderColor: AppColors.primary,
              padding: const EdgeInsets.all(22),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Available balance', style: TextStyle(color: Color(0xFFBFD0FF))),
                Text(inr(asNum(d['balance']), decimals: true), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text('Recharge at the canteen counter or ask HR about your monthly allowance.', style: TextStyle(color: Color(0xFFBFD0FF), fontSize: 13)),
              ]),
            ),
            const SectionTitle('Transactions'),
            if (items.isEmpty) const EmptyView(title: 'No wallet activity yet'),
            for (final t in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AppCard(
                  child: Row(children: [
                    CircleAvatar(
                      backgroundColor: t['type'] == 'CREDIT' ? AppColors.greenSoft : AppColors.bg,
                      child: Icon(t['type'] == 'CREDIT' ? Icons.south_west_rounded : Icons.north_east_rounded, color: t['type'] == 'CREDIT' ? AppColors.green : AppColors.ink),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(titleCase(t['reason']), style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text('${dateTime(t['createdAt'])}${t['note'] != null ? ' · ${t['note']}' : ''}', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                      ]),
                    ),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('${t['type'] == 'CREDIT' ? '+' : '−'}${inr(asNum(t['amount']))}', style: TextStyle(fontWeight: FontWeight.w800, color: t['type'] == 'CREDIT' ? AppColors.green : AppColors.ink)),
                      Text('Bal ${inr(asNum(t['balanceAfter']))}', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                    ]),
                  ]),
                ),
              ),
          ]);
        },
      ),
    );
  }
}
