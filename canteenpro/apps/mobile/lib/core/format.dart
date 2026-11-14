import 'package:intl/intl.dart';

final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
final _inr2 = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);

String inr(num? n, {bool decimals = false}) => (decimals ? _inr2 : _inr).format(n ?? 0);
num asNum(dynamic v) => v is num ? v : num.tryParse('$v') ?? 0;

DateTime? parseDate(dynamic v) => v == null ? null : DateTime.tryParse(v.toString())?.toLocal();
String time(dynamic v) {
  final d = parseDate(v);
  return d == null ? '—' : DateFormat('hh:mm a').format(d);
}
String dateShort(dynamic v) {
  final d = parseDate(v);
  return d == null ? '—' : DateFormat('d MMM').format(d);
}
String dateTime(dynamic v) {
  final d = parseDate(v);
  return d == null ? '—' : DateFormat('d MMM, hh:mm a').format(d);
}
String dayLabel(dynamic v) {
  final d = parseDate(v);
  if (d == null) return '';
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(d.year, d.month, d.day);
  final diff = today.difference(day).inDays;
  if (diff == 0) return 'Today';
  if (diff == 1) return 'Yesterday';
  return DateFormat('EEE, d MMM').format(d);
}
String titleCase(String? s) => (s ?? '').toLowerCase().replaceAll('_', ' ').split(' ').map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1)).join(' ');
String initials(String? name) {
  final parts = (name ?? '?').trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  return parts.take(2).map((p) => p[0].toUpperCase()).join();
}
String todayIso() => DateFormat('yyyy-MM-dd').format(DateTime.now());
