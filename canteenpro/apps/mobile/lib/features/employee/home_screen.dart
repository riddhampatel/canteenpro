import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'item_detail_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onScan;
  const HomeScreen({super.key, required this.onScan});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _key = GlobalKey<AsyncViewState<Map<String, dynamic>>>();
  String filter = 'All';
  final Set<String> _busy = {};

  Future<Map<String, dynamic>> _load() async => (await Api.instance.get('/employee/home') as Map).cast<String, dynamic>();

  Future<void> _optIn(Map s, bool eating) async {
    setState(() => _busy.add(s['id']));
    try {
      await Api.instance.put('/employee/opt-ins', {'mealSessionId': s['id'], 'status': eating ? 'OPTED_IN' : 'OPTED_OUT'});
      if (mounted) showSnack(context, eating ? 'Thanks! ${s['name']} counted for you.' : 'Got it — you’re not eating ${s['name']}.');
      await _key.currentState?.reload();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    } finally {
      if (mounted) setState(() => _busy.remove(s['id']));
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: AsyncView<Map<String, dynamic>>(
        key: _key,
        load: _load,
        builder: (context, d, reload) {
          final sessions = ((d['sessions'] as List?) ?? []).cast<Map>();
          final optable = sessions.where((s) => s['optInCutoff'] != null && s['optInOpen'] == true && s['served'] != true).toList();
          final names = ['All', ...sessions.map((s) => s['name'].toString())];
          final items = <Map>[];
          for (final s in sessions) {
            if (filter != 'All' && s['name'] != filter) continue;
            for (final i in (s['items'] as List? ?? [])) {
              items.add({...(i as Map), 'session': s['name']});
            }
          }
          final current = sessions.where((s) => s['id'] == d['currentSessionId']).toList();
          final unread = asNum(d['unreadNotifications']).toInt();
          return ListView(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 120),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Hi ${d['employee']?['name']?.toString().split(' ').first ?? ''} 👋', style: const TextStyle(color: AppColors.muted, fontWeight: FontWeight.w600)),
                    Text(d['tenant']?['name'] ?? '', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  ]),
                ),
                IconButton(
                  tooltip: 'Notifications',
                  onPressed: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
                    reload();
                  },
                  icon: Badge(isLabelVisible: unread > 0, label: Text('$unread'), child: const Icon(Icons.notifications_none_rounded, size: 28)),
                ),
              ]),
              const SizedBox(height: 14),
              // Wallet + scan quick card
              AppCard(
                color: AppColors.primary,
                borderColor: AppColors.primary,
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Canteen wallet', style: TextStyle(color: Color(0xFFBFD0FF), fontWeight: FontWeight.w600)),
                      Text(inr(asNum(d['employee']?['walletBalance']), decimals: true), style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
                      if (current.isNotEmpty) Text('${current.first['name']} is being served now', style: const TextStyle(color: Color(0xFFBFD0FF), fontSize: 13)),
                    ]),
                  ),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary, minimumSize: const Size(0, 46)),
                    onPressed: widget.onScan,
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Scan'),
                  ),
                ]),
              ),
              for (final s in optable) ...[
                const SizedBox(height: 14),
                _OptInCard(session: s, busy: _busy.contains(s['id']), onChanged: (v) => _optIn(s, v)),
              ],
              SectionTitle("Today's menu"),
              SizedBox(
                height: 42,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: names
                      .map((n) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(n),
                              selected: filter == n,
                              onSelected: (_) => setState(() => filter = n),
                              selectedColor: AppColors.primary,
                              labelStyle: TextStyle(color: filter == n ? Colors.white : AppColors.ink, fontWeight: FontWeight.w700),
                              showCheckmark: false,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                            ),
                          ))
                      .toList(),
                ),
              ),
              const SizedBox(height: 10),
              if (items.isEmpty) const EmptyView(icon: Icons.restaurant_menu_rounded, title: 'Menu not published yet', text: 'Check back a little later.'),
              for (final i in items) ...[
                _MenuItemCard(item: i, served: sessions.any((s) => s['name'] == i['session'] && s['served'] == true)),
                const SizedBox(height: 10),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _OptInCard extends StatelessWidget {
  final Map session;
  final bool busy;
  final ValueChanged<bool> onChanged;
  const _OptInCard({required this.session, required this.busy, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    final status = session['optInStatus'];
    final eating = status == 'OPTED_IN';
    return AppCard(
      color: eating ? AppColors.greenSoft : Colors.white,
      borderColor: eating ? const Color(0xFFB7E4C7) : AppColors.line,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text("Today's ${session['name']} opt-in", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800))),
          if (status != null) eating ? Pill.green('Opted in') : Pill.red('Opted out') else Pill.amber('No reply'),
        ]),
        const SizedBox(height: 4),
        Text('Confirm if you are having ${session['name'].toString().toLowerCase()} at the canteen today. Closes at ${session['optInCutoff']}.', style: const TextStyle(color: AppColors.muted)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: busy ? null : () => onChanged(false),
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 44), backgroundColor: status == 'OPTED_OUT' ? AppColors.redSoft : null),
              child: const Text('Not eating'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton(
              onPressed: busy ? null : () => onChanged(true),
              style: FilledButton.styleFrom(minimumSize: const Size(0, 44), backgroundColor: AppColors.green),
              child: Text(eating ? 'Eating ✓' : 'Eating'),
            ),
          ),
        ]),
      ]),
    );
  }
}

class _MenuItemCard extends StatelessWidget {
  final Map item;
  final bool served;
  const _MenuItemCard({required this.item, required this.served});
  @override
  Widget build(BuildContext context) {
    final ok = item['isAvailable'] != false;
    return AppCard(
      padding: const EdgeInsets.all(10),
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ItemDetailScreen(item: item))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            width: 92,
            height: 92,
            child: item['imageUrl'] != null
                ? CachedNetworkImage(imageUrl: item['imageUrl'], fit: BoxFit.cover, errorWidget: (_, __, ___) => const _Placeholder())
                : const _Placeholder(),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              FoodDot(item['foodType']),
              const SizedBox(width: 6),
              Expanded(child: Text(item['name'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
              ok ? Pill.green('Available') : Pill.red('Sold out'),
            ]),
            const SizedBox(height: 4),
            Text(item['description'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
            const SizedBox(height: 6),
            Wrap(spacing: 10, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
              Pill.grey(item['session'] ?? ''),
              if (item['calories'] != null) Text('🔥 ${item['calories']} kcal', style: const TextStyle(fontSize: 12, color: AppColors.muted)),
              Text(inr(asNum(item['price'])), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
              if (served) Pill.green('Served', icon: Icons.check),
            ]),
          ]),
        ),
      ]),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();
  @override
  Widget build(BuildContext context) => Container(color: AppColors.amberSoft, child: const Center(child: Text('🍛', style: TextStyle(fontSize: 34))));
}
