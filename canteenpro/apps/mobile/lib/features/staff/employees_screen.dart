import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

/// Look up an employee, recharge wallet, reset app PIN.
class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});
  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  List<Map> results = [];
  Timer? _debounce;
  bool loading = false;

  void _search(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      if (q.trim().length < 2) return setState(() => results = []);
      setState(() => loading = true);
      try {
        final r = (await Api.instance.get('/tenant/orders/lookup', {'q': q.trim()}) as List).cast<Map>();
        if (mounted) setState(() => results = r);
      } catch (e) {
        if (mounted) showSnack(context, errorText(e), error: true);
      } finally {
        if (mounted) setState(() => loading = false);
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _recharge(Map e) async {
    final amt = TextEditingController();
    final ref = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 22, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Recharge ${e['name']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          Text('Current balance ${inr(asNum(e['walletBalance']))}', style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 14),
          Wrap(spacing: 8, children: [for (final v in [200, 500, 1000, 2000]) ActionChip(label: Text('₹$v'), onPressed: () => amt.text = '$v')]),
          const SizedBox(height: 10),
          TextField(controller: amt, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount (₹)')),
          const SizedBox(height: 10),
          TextField(controller: ref, decoration: const InputDecoration(labelText: 'UPI ref / receipt no. (optional)')),
          const SizedBox(height: 16),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add money')),
        ]),
      ),
    );
    final amount = num.tryParse(amt.text) ?? 0;
    if (ok != true || amount <= 0) return;
    try {
      final r = await Api.instance.post('/tenant/employees/${e['id']}/wallet', {'type': 'CREDIT', 'amount': amount, 'reason': 'RECHARGE', 'reference': ref.text.trim().isEmpty ? null : ref.text.trim()}) as Map;
      if (!mounted) return;
      showSnack(context, 'New balance ${inr(asNum(r['balance']))}');
      setState(() => e['walletBalance'] = r['balance']);
    } catch (err) {
      if (mounted) showSnack(context, errorText(err), error: true);
    }
  }

  Future<void> _resetPin(Map e) async {
    try {
      final r = await Api.instance.post('/tenant/employees/${e['id']}/reset-pin') as Map;
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('New app PIN'),
          content: Text('${r['pin']}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, letterSpacing: 10)),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Done'))],
        ),
      );
    } catch (err) {
      if (mounted) showSnack(context, errorText(err), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isManager = context.watch<Session>().isManager;
    return Scaffold(
      appBar: AppBar(title: const Text('Employees')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(autofocus: true, onChanged: _search, decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Name, employee code or phone')),
        if (loading) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator()),
        const SizedBox(height: 12),
        for (final e in results)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: AppCard(
              child: Column(children: [
                Row(children: [
                  Avatar(name: e['name'], url: e['photoUrl'], size: 42),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(e['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800)), Text('${e['employeeCode']} · ${e['department'] ?? '—'}', style: const TextStyle(color: AppColors.muted, fontSize: 13))])),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text(inr(asNum(e['walletBalance'])), style: const TextStyle(fontWeight: FontWeight.w800)), Text(titleCase(e['defaultPayMode']), style: const TextStyle(fontSize: 12, color: AppColors.muted))]),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: FilledButton.tonalIcon(onPressed: () => _recharge(e), style: FilledButton.styleFrom(minimumSize: const Size(0, 42)), icon: const Icon(Icons.account_balance_wallet_outlined, size: 18), label: const Text('Recharge'))),
                  if (isManager) ...[
                    const SizedBox(width: 8),
                    Expanded(child: OutlinedButton.icon(onPressed: () => _resetPin(e), style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42)), icon: const Icon(Icons.password_rounded, size: 18), label: const Text('Reset PIN'))),
                  ],
                ]),
              ]),
            ),
          ),
        if (results.isEmpty && !loading) const EmptyView(icon: Icons.person_search_rounded, title: 'Search for an employee', text: 'Type at least 2 characters.'),
      ]),
    );
  }
}
