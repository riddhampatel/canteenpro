import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const primary = Color(0xFF1E3A8A);
  static const primaryDark = Color(0xFF172E6E);
  static const primarySoft = Color(0xFFE8EEFC);
  static const bg = Color(0xFFF4F6FB);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const line = Color(0xFFE2E8F0);
  static const green = Color(0xFF16A34A);
  static const greenSoft = Color(0xFFE7F7EE);
  static const red = Color(0xFFDC2626);
  static const redSoft = Color(0xFFFDECEC);
  static const amber = Color(0xFFF59E0B);
  static const amberSoft = Color(0xFFFFF4DB);
  static const violet = Color(0xFF8B5CF6);
}

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary, primary: AppColors.primary, surface: Colors.white),
    scaffoldBackgroundColor: AppColors.bg,
  );
  final text = GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(bodyColor: AppColors.ink, displayColor: AppColors.ink);
  return base.copyWith(
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.bg,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      foregroundColor: AppColors.primary,
      titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.w800, color: AppColors.primary),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(50),
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.primary, width: 1.6)),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
