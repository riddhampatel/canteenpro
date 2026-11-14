import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'staff_shell.dart';

/// Counter mode: scan the employee's personal QR / ID card or type their code.
class ServeScreen extends StatefulWidget {
  const ServeScreen({super.key});
  @override
  State<ServeScreen> createState() => _ServeScreenState();
}

class _ServeScreenState extends State<ServeScreen> {
  MobileScannerController? camera;
  final code = TextEditingController();
  String? sessionId;
  bool override = false;
  bool busy = false;
  Map? result;
  String? error;
  List<Map> sessions = [];
  DateTime _last = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    try {
      final s = context.read<Session>();
      final list = (await Api.instance.get('/tenant/canteens') as List).cast<Map>();
      final c = list.firstWhere((x) => x['id'] == s.canteenId, orElse: () => list.isEmpty ? {} : list.first);
      if (mounted) setState(() => sessions = ((c['sessions'] as List?) ?? []).cast<Map>().where((x) => x['isActive'] == true).toList());
    } catch (_) {}
  }

  @override
  void dispose() {
    camera?.dispose();
    code.dispose();
    super.dispose();
  }

  void _toggleCamera() {
    setState(() {
      if (camera == null) {
        camera = MobileScannerController(detectionSpeed: DetectionSpeed.normal);
      } else {
        camera!.dispose();
        camera = null;
      }
    });
  }

  Future<void> _serve(String value) async {
    if (busy || value.trim().isEmpty) return;
    setState(() {
      busy = true;
      error = null;
      result = null;
    });
    try {
      final s = context.read<Session>();
      final r = await Api.instance.post('/tenant/orders/serve', {'canteenId': s.canteenId, 'code': value.trim(), 'mealSessionId': sessionId, 'override': override}) as Map;
      setState(() => result = r);
      code.clear();
    } catch (e) {
      setState(() => error = errorText(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void _onDetect(BarcodeCapture cap) {
    final v = cap.barcodes.map((b) => b.rawValue).whereType<String>().firstOrNull;
    if (v == null) return;
    // ignore repeat reads of the same card for 3 seconds
    if (DateTime.now().difference(_last).inSeconds < 3) return;
    _last = DateTime.now();
    _serve(v);
  }

  @override
  Widget build(BuildContext context) {
    final isManager = context.watch<Session>().isManager;
    return SafeArea(
      bottom: false,
      child: ListView(padding: const EdgeInsets.only(bottom: 120), children: [
        StaffHeader('Serve meals', trailing: IconButton.filledTonal(tooltip: camera == null ? 'Open camera' : 'Close camera', onPressed: _toggleCamera, icon: Icon(camera == null ? Icons.photo_camera_rounded : Icons.close_rounded))),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (camera != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  height: 260,
                  child: MobileScanner(
                    controller: camera,
                    onDetect: _onDetect,
                    errorBuilder: (context, e, child) => Container(color: Colors.black, alignment: Alignment.center, padding: const EdgeInsets.all(20), child: Text(e.errorCode == MobileScannerErrorCode.permissionDenied ? 'Allow camera access in Settings to scan.' : 'Camera could not start.', style: const TextStyle(color: Colors.white))),
                  ),
                ),
              ),
            const SizedBox(height: 12),
            TextField(
              controller: code,
              textInputAction: TextInputAction.go,
              onSubmitted: _serve,
              decoration: InputDecoration(
                hintText: 'Employee code, ID card or phone',
                prefixIcon: const Icon(Icons.badge_outlined),
                suffixIcon: IconButton(icon: const Icon(Icons.send_rounded), onPressed: () => _serve(code.text)),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: sessionId,
              decoration: const InputDecoration(labelText: 'Meal session'),
              items: [
                const DropdownMenuItem(value: null, child: Text('Auto (current time)')),
                ...sessions.map((s) => DropdownMenuItem(value: s['id'] as String, child: Text('${s['name']}  ${s['startTime']}–${s['endTime']}'))),
              ],
              onChanged: (v) => setState(() => sessionId = v),
            ),
            if (isManager)
              SwitchListTile(contentPadding: EdgeInsets.zero, value: override, onChanged: (v) => setState(() => override = v), title: const Text('Manager override', style: TextStyle(fontWeight: FontWeight.w700)), subtitle: const Text('Allow a second meal or skip the opt-in check')),
            const SizedBox(height: 8),
            if (busy) const LinearProgressIndicator(),
            if (result != null) _Result(ok: true, title: result!['employee']?['name'] ?? 'Served', text: '${result!['session']?['name'] ?? 'Meal'} served · ${result!['employee']?['employeeCode'] ?? ''}', sub: '${titleCase(result!['paymentMode'])} ${inr(asNum(result!['total']))}${asNum(result!['subsidyAmount']) > 0 ? ' + ${inr(asNum(result!['subsidyAmount']))} company' : ''}'),
            if (error != null) _Result(ok: false, title: 'Cannot serve', text: error!),
          ]),
        ),
      ]),
    );
  }
}

class _Result extends StatelessWidget {
  final bool ok;
  final String title, text;
  final String? sub;
  const _Result({required this.ok, required this.title, required this.text, this.sub});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: ok ? AppColors.greenSoft : AppColors.redSoft, borderRadius: BorderRadius.circular(20), border: Border.all(color: ok ? const Color(0xFF86EFAC) : const Color(0xFFFCA5A5), width: 2)),
      child: Row(children: [
        Icon(ok ? Icons.check_circle_rounded : Icons.cancel_rounded, size: 48, color: ok ? AppColors.green : AppColors.red),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: ok ? const Color(0xFF166534) : const Color(0xFF991B1B))),
            Text(text, style: const TextStyle(fontWeight: FontWeight.w600)),
            if (sub != null) Text(sub!, style: const TextStyle(color: AppColors.muted)),
          ]),
        ),
      ]),
    );
  }
}
