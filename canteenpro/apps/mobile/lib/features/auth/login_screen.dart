import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'splash_screen.dart';
import 'pin_boxes.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool staff = false;
  int step = 0; // employee: 0 phone, 1 pin
  bool busy = false;
  String? err;
  String pin = '';
  bool showPin = false;
  List<dynamic> accounts = [];
  final phone = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();

  @override
  void dispose() {
    phone.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() fn) async {
    setState(() {
      busy = true;
      err = null;
    });
    try {
      await fn();
    } catch (e) {
      if (mounted) setState(() => err = errorText(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _checkPhone() => _run(() async {
        final digits = phone.text.replaceAll(RegExp(r'\D'), '');
        if (digits.length < 10) throw ApiException(0, 'Enter your 10-digit mobile number');
        final r = await Api.instance.post('/employee/auth/check', {'phone': digits}) as Map;
        if (r['exists'] != true) throw ApiException(0, 'This number is not registered. Ask your canteen manager to add you.');
        setState(() {
          accounts = (r['accounts'] as List?) ?? [];
          step = 1;
          pin = '';
        });
      });

  Future<void> _loginEmployee() => _run(() => context.read<Session>().loginEmployee(phone.text.replaceAll(RegExp(r'\D'), ''), pin));
  Future<void> _loginStaff() => _run(() => context.read<Session>().loginStaff(email.text.trim(), password.text));

  @override
  Widget build(BuildContext context) {
    final orgName = accounts.isNotEmpty ? (accounts.first as Map)['tenantName']?.toString() : null;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFFDDE6FB), AppColors.bg])),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Container(
                padding: const EdgeInsets.fromLTRB(22, 28, 22, 22),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(.08), blurRadius: 30, offset: const Offset(0, 14))]),
                child: Column(children: [
                  const AppLogo(size: 76),
                  const SizedBox(height: 16),
                  Text(orgName ?? AppConfig.appName, textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(staff ? 'Canteen staff sign in' : step == 0 ? 'Sign in to your account' : 'Enter your 4-digit PIN', style: const TextStyle(color: AppColors.muted)),
                  const SizedBox(height: 20),
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment(value: false, label: Text('Employee'), icon: Icon(Icons.badge_outlined)),
                      ButtonSegment(value: true, label: Text('Canteen staff'), icon: Icon(Icons.storefront_outlined)),
                    ],
                    selected: {staff},
                    onSelectionChanged: (v) => setState(() {
                      staff = v.first;
                      err = null;
                      step = 0;
                    }),
                  ),
                  const SizedBox(height: 22),
                  if (!staff && step == 0) ...[
                    const Align(alignment: Alignment.centerLeft, child: Text('Mobile number', style: TextStyle(fontWeight: FontWeight.w700))),
                    const SizedBox(height: 8),
                    TextField(
                      controller: phone,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: const InputDecoration(prefixIcon: Icon(Icons.phone_outlined), prefixText: '+91  ', hintText: '98765 43210'),
                      onSubmitted: (_) => _checkPhone(),
                    ),
                    const SizedBox(height: 18),
                    FilledButton(onPressed: busy ? null : _checkPhone, child: busy ? const _Spin() : const Text('Continue')),
                  ],
                  if (!staff && step == 1) ...[
                    AppCard(
                      color: const Color(0xFFF1F5FE),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(children: [
                        const Icon(Icons.phone_outlined, size: 18, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(child: Text('+91 ${phone.text}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary))),
                        TextButton(onPressed: () => setState(() => step = 0), child: const Text('Edit')),
                      ]),
                    ),
                    const SizedBox(height: 18),
                    PinBoxes(length: 4, obscure: !showPin, autofocus: true, onChanged: (v) => setState(() => pin = v), onCompleted: (v) {
                      pin = v;
                      _loginEmployee();
                    }),
                    TextButton.icon(onPressed: () => setState(() => showPin = !showPin), icon: Icon(showPin ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18), label: Text(showPin ? 'Hide PIN' : 'Show PIN')),
                    const SizedBox(height: 6),
                    FilledButton(onPressed: busy || pin.length != 4 ? null : _loginEmployee, child: busy ? const _Spin() : const Text('Login')),
                    const SizedBox(height: 6),
                    const Text('Forgot your PIN? Ask the canteen manager to reset it.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted, fontSize: 13)),
                  ],
                  if (staff) ...[
                    AutofillGroup(
                      child: Column(children: [
                        TextField(controller: email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], decoration: const InputDecoration(prefixIcon: Icon(Icons.mail_outline), hintText: 'Work email')),
                        const SizedBox(height: 12),
                        TextField(controller: password, obscureText: true, autofillHints: const [AutofillHints.password], decoration: const InputDecoration(prefixIcon: Icon(Icons.lock_outline), hintText: 'Password'), onSubmitted: (_) => _loginStaff()),
                      ]),
                    ),
                    const SizedBox(height: 18),
                    FilledButton(onPressed: busy ? null : _loginStaff, child: busy ? const _Spin() : const Text('Sign in')),
                  ],
                  if (err != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.redSoft, borderRadius: BorderRadius.circular(12)),
                      child: Text(err!, style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w600)),
                    ),
                  ],
                  const Divider(height: 36),
                  GestureDetector(
                    onTap: () => launchUrl(Uri.parse('https://wa.me/${AppConfig.supportWhatsApp}'), mode: LaunchMode.externalApplication),
                    child: const Text.rich(TextSpan(text: 'Need help? ', style: TextStyle(color: AppColors.muted), children: [TextSpan(text: 'Chat with support', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700))])),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Spin extends StatelessWidget {
  const _Spin();
  @override
  Widget build(BuildContext context) => const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white));
}
