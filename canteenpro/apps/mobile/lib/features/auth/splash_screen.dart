import 'package:flutter/material.dart';
import '../../core/config.dart';
import '../../core/theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const AppLogo(size: 92),
          const SizedBox(height: 24),
          Text(AppConfig.appName, style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          const Text('Your daily meal companion', style: TextStyle(color: Color(0xFFBFD0FF), fontSize: 16)),
          const SizedBox(height: 36),
          const SizedBox(width: 120, child: LinearProgressIndicator(color: Colors.white, backgroundColor: Color(0x33FFFFFF), minHeight: 4)),
        ]),
      ),
    );
  }
}

class AppLogo extends StatelessWidget {
  final double size;
  const AppLogo({super.key, this.size = 72});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(size * .26), boxShadow: [BoxShadow(color: Colors.black.withOpacity(.08), blurRadius: 20, offset: const Offset(0, 8))]),
      child: Center(
        child: Container(
          width: size * .56,
          height: size * .56,
          decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: AppColors.primary, width: size * .07)),
          child: Center(child: Container(width: size * .22, height: size * .22, decoration: const BoxDecoration(color: Color(0xFFF2B200), shape: BoxShape.circle))),
        ),
      ),
    );
  }
}
