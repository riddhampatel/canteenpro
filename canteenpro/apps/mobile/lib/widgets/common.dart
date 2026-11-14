import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';

void showSnack(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg), backgroundColor: error ? AppColors.red : AppColors.ink));
}

String errorText(Object e) => e is ApiException ? e.message : 'Something went wrong. Please try again.';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final VoidCallback? onTap;
  final Color? borderColor;
  const AppCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.color, this.onTap, this.borderColor});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color ?? Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: padding,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: borderColor ?? AppColors.line)),
          child: child,
        ),
      ),
    );
  }
}

class Pill extends StatelessWidget {
  final String text;
  final Color color;
  final Color bg;
  final IconData? icon;
  const Pill(this.text, {super.key, this.color = AppColors.primary, this.bg = AppColors.primarySoft, this.icon});

  factory Pill.green(String t, {IconData? icon}) => Pill(t, color: AppColors.green, bg: AppColors.greenSoft, icon: icon);
  factory Pill.red(String t, {IconData? icon}) => Pill(t, color: AppColors.red, bg: AppColors.redSoft, icon: icon);
  factory Pill.amber(String t, {IconData? icon}) => Pill(t, color: const Color(0xFFB45309), bg: AppColors.amberSoft, icon: icon);
  factory Pill.grey(String t) => Pill(t, color: AppColors.muted, bg: const Color(0xFFF1F5F9));

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 13, color: color), const SizedBox(width: 4)],
        Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class FoodDot extends StatelessWidget {
  final String? type;
  const FoodDot(this.type, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = type == 'NON_VEG' ? AppColors.red : type == 'EGG' ? AppColors.amber : AppColors.green;
    return Container(
      width: 14,
      height: 14,
      padding: const EdgeInsets.all(2.5),
      decoration: BoxDecoration(border: Border.all(color: c, width: 1.5), borderRadius: BorderRadius.circular(3)),
      child: DecoratedBox(decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
    );
  }
}

class Avatar extends StatelessWidget {
  final String? name;
  final String? url;
  final double size;
  const Avatar({super.key, this.name, this.url, this.size = 44});
  @override
  Widget build(BuildContext context) {
    if (url != null && url!.isNotEmpty) {
      return CircleAvatar(radius: size / 2, backgroundImage: NetworkImage(url!));
    }
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: AppColors.primarySoft,
      child: Text(initials(name), style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: size * .36)),
    );
  }
}

class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? hint;
  const StatTile({super.key, required this.label, required this.value, required this.icon, this.color = AppColors.primary, this.hint});
  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.muted))),
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: color.withOpacity(.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 18, color: color),
          ),
        ]),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        if (hint != null) Text(hint!, style: const TextStyle(fontSize: 12, color: AppColors.muted)),
      ]),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 22, bottom: 10),
      child: Row(children: [
        Expanded(child: Text(text, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800))),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

class EmptyView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? text;
  const EmptyView({super.key, this.icon = Icons.inbox_outlined, required this.title, this.text});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(children: [
        Icon(icon, size: 44, color: AppColors.muted.withOpacity(.6)),
        const SizedBox(height: 12),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        if (text != null) ...[const SizedBox(height: 4), Text(text!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted))],
      ]),
    );
  }
}

/// FutureBuilder with loading, error + retry, and pull-to-refresh.
class AsyncView<T> extends StatefulWidget {
  final Future<T> Function() load;
  final Widget Function(BuildContext, T, Future<void> Function() reload) builder;
  const AsyncView({super.key, required this.load, required this.builder});
  @override
  State<AsyncView<T>> createState() => AsyncViewState<T>();
}

class AsyncViewState<T> extends State<AsyncView<T>> {
  late Future<T> _f;
  @override
  void initState() {
    super.initState();
    _f = widget.load();
  }

  Future<void> reload() async {
    final f = widget.load();
    setState(() => _f = f);
    try {
      await f;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _f,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));
        }
        if (snap.hasError) {
          return ListView(physics: const AlwaysScrollableScrollPhysics(), children: [
            const SizedBox(height: 80),
            EmptyView(icon: Icons.wifi_off_rounded, title: 'Could not load', text: errorText(snap.error!)),
            Center(child: TextButton.icon(onPressed: reload, icon: const Icon(Icons.refresh), label: const Text('Try again'))),
          ]);
        }
        return RefreshIndicator(onRefresh: reload, child: widget.builder(context, snap.data as T, reload));
      },
    );
  }
}

/// Floating rounded bottom navigation (matches the original app style).
class FloatingNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;
  final List<IconData> icons;
  final List<String> labels;
  const FloatingNav({super.key, required this.index, required this.onTap, required this.icons, required this.labels});
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Container(
        height: 68,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(34),
          boxShadow: [BoxShadow(color: AppColors.ink.withOpacity(.08), blurRadius: 24, offset: const Offset(0, 8))],
        ),
        padding: const EdgeInsets.all(8),
        child: Row(
          children: List.generate(icons.length, (i) {
            final on = i == index;
            return Expanded(
              child: Semantics(
                label: labels[i],
                selected: on,
                button: true,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onTap(i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(color: on ? AppColors.primarySoft : Colors.transparent, borderRadius: BorderRadius.circular(26)),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(icons[i], color: on ? AppColors.primary : AppColors.muted, size: 24),
                      if (on) Text(labels[i], style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                    ]),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
