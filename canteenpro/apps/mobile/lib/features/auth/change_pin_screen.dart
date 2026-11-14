import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'pin_boxes.dart';

class ChangePinScreen extends StatefulWidget {
  final bool firstLogin;
  const ChangePinScreen({super.key, this.firstLogin = false});
  @override
  State<ChangePinScreen> createState() => _ChangePinScreenState();
}

class _ChangePinScreenState extends State<ChangePinScreen> {
  String current = '', next = '', confirm = '';
  bool busy = false;
  Key k1 = UniqueKey(), k2 = UniqueKey(), k3 = UniqueKey();

  Future<void> _save() async {
    if (next != confirm) return showSnack(context, 'New PINs do not match', error: true);
    setState(() => busy = true);
    try {
      await Api.instance.post('/employee/auth/change-pin', {'currentPin': current, 'newPin': next});
      if (!mounted) return;
      await context.read<Session>().pinChanged();
      if (!mounted) return;
      showSnack(context, 'PIN updated');
      if (!widget.firstLogin) Navigator.pop(context);
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget label(String t) => Padding(padding: const EdgeInsets.only(top: 22, bottom: 10), child: Text(t, style: const TextStyle(fontWeight: FontWeight.w700)));
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.firstLogin ? 'Set your own PIN' : 'Change PIN'),
        actions: [if (widget.firstLogin) TextButton(onPressed: () => context.read<Session>().logout(), child: const Text('Sign out'))],
      ),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (widget.firstLogin)
          const Text('For your security, replace the PIN your canteen manager gave you.', style: TextStyle(color: AppColors.muted)),
        label('Current PIN'),
        PinBoxes(key: k1, onChanged: (v) => setState(() => current = v)),
        label('New PIN'),
        PinBoxes(key: k2, onChanged: (v) => setState(() => next = v)),
        label('Confirm new PIN'),
        PinBoxes(key: k3, onChanged: (v) => setState(() => confirm = v)),
        const SizedBox(height: 28),
        FilledButton(
          onPressed: busy || current.length != 4 || next.length != 4 || confirm.length != 4 ? null : _save,
          child: Text(busy ? 'Saving…' : 'Save PIN'),
        ),
      ]),
    );
  }
}
