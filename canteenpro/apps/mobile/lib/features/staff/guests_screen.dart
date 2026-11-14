import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class GuestsScreen extends StatefulWidget {
  const GuestsScreen({super.key});
  @override
  State<GuestsScreen> createState() => _GuestsScreenState();
}

class _GuestsScreenState extends State<GuestsScreen> {
  final _key = GlobalKey<AsyncViewState<List<Map>>>();
  String get canteenId => context.read<Session>().canteenId ?? '';

  Future<List<Map>> _load() async => (((await Api.instance.get('/tenant/guests', {'canteenId': canteenId, 'pageSize': 100})) as Map)['items'] as List).cast<Map>();

  Future<void> _add() async {
    final name = TextEditingController(), phone = TextEditingController(), company = TextEditingController();
    String purpose = 'Client meeting';
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => Padding(
          padding: EdgeInsets.fromLTRB(20, 22, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Register guest', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Full name')),
            const SizedBox(height: 10),
            TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
            const SizedBox(height: 10),
            TextField(controller: company, decoration: const InputDecoration(labelText: 'Company')),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: purpose,
              decoration: const InputDecoration(labelText: 'Purpose'),
              items: ['Client meeting', 'Interview', 'Vendor visit', 'Contractor', 'Other'].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
              onChanged: (v) => set(() => purpose = v ?? purpose),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save guest')),
          ]),
        ),
      ),
    );
    if (ok != true || name.text.trim().isEmpty) return;
    try {
      await Api.instance.post('/tenant/guests', {'canteenId': canteenId, 'name': name.text.trim(), 'phone': phone.text.trim().isEmpty ? null : phone.text.trim(), 'company': company.text.trim().isEmpty ? null : company.text.trim(), 'purpose': purpose});
      _key.currentState?.reload();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    }
  }

  Future<void> _serve(Map g) async {
    final mode = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(padding: const EdgeInsets.all(16), child: Text('Serve meal to ${g['name']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
          for (final m in ['CASH', 'UPI', 'CARD', 'COMPANY', 'COMPLIMENTARY']) ListTile(title: Text(m == 'COMPANY' ? 'Bill to company' : titleCase(m)), onTap: () => Navigator.pop(ctx, m)),
        ]),
      ),
    );
    if (mode == null) return;
    try {
      final o = await Api.instance.post('/tenant/orders', {'canteenId': canteenId, 'consumerType': 'GUEST', 'guestId': g['id'], 'paymentMode': mode}) as Map;
      if (mounted) showSnack(context, '${o['session']?['name'] ?? 'Meal'} served · bill ${o['billNo']} · ${inr(asNum(o['total']))}');
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Guests')),
      floatingActionButton: FloatingActionButton.extended(onPressed: _add, icon: const Icon(Icons.person_add_alt_1), label: const Text('Register guest')),
      body: AsyncView<List<Map>>(
        key: _key,
        load: _load,
        builder: (context, list, _) => ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 100), physics: const AlwaysScrollableScrollPhysics(), children: [
          if (list.isEmpty) const EmptyView(icon: Icons.person_add_alt_1, title: 'No guests yet'),
          for (final g in list)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                child: Row(children: [
                  Avatar(name: g['name'], size: 40),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(g['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800)), Text([g['company'], g['purpose']].where((x) => x != null).join(' · '), style: const TextStyle(color: AppColors.muted, fontSize: 13))])),
                  FilledButton.tonal(onPressed: () => _serve(g), style: FilledButton.styleFrom(minimumSize: const Size(0, 40)), child: const Text('Serve')),
                ]),
              ),
            ),
        ]),
      ),
    );
  }
}
