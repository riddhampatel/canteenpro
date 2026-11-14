import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

/// Employee scans the daily counter QR to record their meal.
/// The controller is created once per visit and always disposed —
/// this fixes the "controllerAlreadyInitialized" camera error of the old app.
class ScanScreen extends StatefulWidget {
  final VoidCallback onDone;
  const ScanScreen({super.key, required this.onDone});
  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> with WidgetsBindingObserver {
  final MobileScannerController controller = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates, facing: CameraFacing.back);
  bool handling = false;
  bool torch = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) controller.stop();
    if (state == AppLifecycleState.resumed && !handling) controller.start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture cap) async {
    if (handling) return;
    final code = cap.barcodes.map((b) => b.rawValue).whereType<String>().firstOrNull;
    if (code == null) return;
    setState(() => handling = true);
    await controller.stop();
    Map? result;
    String? error;
    try {
      result = await Api.instance.post('/employee/scan', {'code': code}) as Map;
    } catch (e) {
      error = errorText(e);
    }
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => _ResultSheet(result: result, error: error),
    );
    if (!mounted) return;
    if (result != null) {
      widget.onDone();
    } else {
      setState(() => handling = false);
      controller.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size.width * .72;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(children: [
        Positioned.fill(
          child: MobileScanner(
            controller: controller,
            onDetect: _onDetect,
            errorBuilder: (context, error, child) => _CameraError(error: error, onRetry: () => controller.start()),
          ),
        ),
        // dim outside the frame
        Positioned.fill(child: CustomPaint(painter: _FramePainter(size))),
        SafeArea(
          child: Column(children: [
            const SizedBox(height: 16),
            const Text('Scan QR', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Point at the QR code at the canteen counter', style: TextStyle(color: Colors.white70)),
            const Spacer(),
            if (handling) const CircularProgressIndicator(color: Colors.white),
            const Spacer(),
            Container(
              margin: const EdgeInsets.fromLTRB(24, 0, 24, 110),
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
              decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(22)),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                _RoundBtn(icon: torch ? Icons.flash_on_rounded : Icons.flash_off_rounded, label: 'Flashlight', onTap: () async {
                  await controller.toggleTorch();
                  setState(() => torch = !torch);
                }),
                _RoundBtn(icon: Icons.cameraswitch_rounded, label: 'Switch', onTap: () => controller.switchCamera()),
              ]),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _RoundBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _RoundBtn({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(40),
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            CircleAvatar(radius: 24, backgroundColor: Colors.white24, child: Icon(icon, color: Colors.white)),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
          ]),
        ),
      );
}

class _FramePainter extends CustomPainter {
  final double box;
  _FramePainter(this.box);
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCenter(center: Offset(size.width / 2, size.height / 2 - 30), width: box, height: box);
    final rr = RRect.fromRectAndRadius(rect, const Radius.circular(28));
    canvas.drawPath(Path.combine(PathOperation.difference, Path()..addRect(Offset.zero & size), Path()..addRRect(rr)), Paint()..color = Colors.black54);
    canvas.drawRRect(rr, Paint()
      ..color = const Color(0xFF60A5FA)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4);
  }

  @override
  bool shouldRepaint(covariant _FramePainter old) => old.box != box;
}

class _CameraError extends StatelessWidget {
  final MobileScannerException error;
  final VoidCallback onRetry;
  const _CameraError({required this.error, required this.onRetry});
  @override
  Widget build(BuildContext context) {
    final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;
    return Container(
      color: Colors.black,
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.no_photography_outlined, color: Colors.white70, size: 48),
          const SizedBox(height: 12),
          Text(denied ? 'Camera permission is off' : 'Camera could not start', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(denied ? 'Allow camera access in your phone settings to scan the canteen QR.' : 'Close other apps using the camera and try again.', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 16),
          OutlinedButton(onPressed: onRetry, style: OutlinedButton.styleFrom(foregroundColor: Colors.white, minimumSize: const Size(140, 44)), child: const Text('Try again')),
        ]),
      ),
    );
  }
}

class _ResultSheet extends StatelessWidget {
  final Map? result;
  final String? error;
  const _ResultSheet({this.result, this.error});
  @override
  Widget build(BuildContext context) {
    final ok = result != null;
    final order = (result?['order'] as Map?) ?? {};
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          CircleAvatar(radius: 38, backgroundColor: ok ? AppColors.greenSoft : AppColors.redSoft, child: Icon(ok ? Icons.check_rounded : Icons.close_rounded, size: 44, color: ok ? AppColors.green : AppColors.red)),
          const SizedBox(height: 14),
          Text(ok ? (result!['message'] ?? 'Meal confirmed') : 'Could not record meal', textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          if (!ok) Text(error ?? '', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted)),
          if (ok) ...[
            Text('Bill ${order['billNo']} · ${time(order['createdAt'])}', style: const TextStyle(color: AppColors.muted)),
            const SizedBox(height: 14),
            AppCard(
              color: AppColors.bg,
              child: Column(children: [
                Row(children: [const Expanded(child: Text('You paid')), Text('${inr(asNum(order['total']))} · ${titleCase(order['paymentMode'])}', style: const TextStyle(fontWeight: FontWeight.w800))]),
                if (result!['walletBalance'] != null) ...[
                  const SizedBox(height: 6),
                  Row(children: [const Expanded(child: Text('Wallet balance')), Text(inr(asNum(result!['walletBalance']), decimals: true), style: const TextStyle(fontWeight: FontWeight.w800))]),
                ],
              ]),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(onPressed: () => Navigator.pop(context), child: Text(ok ? 'Done' : 'Scan again')),
        ]),
      ),
    );
  }
}
