import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class ItemDetailScreen extends StatelessWidget {
  final Map item;
  const ItemDetailScreen({super.key, required this.item});
  @override
  Widget build(BuildContext context) {
    final ok = item['isAvailable'] != false;
    final tags = ((item['tags'] as List?) ?? []).cast<String>();
    final highlights = ((item['highlights'] as List?) ?? []).cast<String>();
    return Scaffold(
      body: CustomScrollView(slivers: [
        SliverAppBar(
          expandedHeight: 260,
          pinned: true,
          backgroundColor: Colors.white,
          leading: Padding(
            padding: const EdgeInsets.all(8),
            child: CircleAvatar(backgroundColor: Colors.white, child: IconButton(icon: const Icon(Icons.arrow_back_ios_new, size: 18), onPressed: () => Navigator.pop(context))),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: item['imageUrl'] != null
                ? CachedNetworkImage(imageUrl: item['imageUrl'], fit: BoxFit.cover)
                : Container(color: AppColors.amberSoft, child: const Center(child: Text('🍛', style: TextStyle(fontSize: 90)))),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: AppCard(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(item['name'] ?? '', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800))),
                  ok ? Pill.green('Available today') : Pill.red('Sold out'),
                ]),
                const SizedBox(height: 6),
                Wrap(spacing: 12, children: [
                  if (item['session'] != null) Pill(item['session']),
                  if (item['calories'] != null) Text('🔥 Calorie count: ${item['calories']} kcal', style: const TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.w700)),
                ]),
                const SizedBox(height: 12),
                Text(item['description'] ?? '', style: const TextStyle(fontSize: 15, height: 1.5)),
                const SizedBox(height: 12),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  Pill.grey(titleCase(item['foodType'])),
                  for (final t in tags) Pill.grey(t),
                ]),
                const SizedBox(height: 14),
                Text(inr(asNum(item['price'])), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
                if (highlights.isNotEmpty) ...[
                  const Divider(height: 32),
                  const Text('Highlights & details', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 10),
                  for (final h in highlights)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Padding(padding: EdgeInsets.only(top: 7), child: CircleAvatar(radius: 3, backgroundColor: AppColors.primary)),
                        const SizedBox(width: 10),
                        Expanded(child: Text(h, style: const TextStyle(height: 1.45))),
                      ]),
                    ),
                ],
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}
