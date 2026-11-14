import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/session.dart';
import '../../widgets/common.dart';

class AnnounceScreen extends StatefulWidget {
  const AnnounceScreen({super.key});
  @override
  State<AnnounceScreen> createState() => _AnnounceScreenState();
}

class _AnnounceScreenState extends State<AnnounceScreen> {
  final title = TextEditingController();
  final body = TextEditingController();
  String type = 'GENERAL';
  bool busy = false;

  Future<void> _send() async {
    if (title.text.trim().length < 2 || body.text.trim().length < 2) return showSnack(context, 'Add a title and a message', error: true);
    setState(() => busy = true);
    try {
      final n = await Api.instance.post('/tenant/notifications', {'audience': 'CANTEEN', 'canteenId': context.read<Session>().canteenId, 'title': title.text.trim(), 'body': body.text.trim(), 'type': type}) as Map;
      if (!mounted) return;
      showSnack(context, n['pushStatus'] == 'SENT' ? 'Announcement sent' : 'Saved to employees’ inbox');
      Navigator.pop(context);
    } catch (e) {
      if (mounted) showSnack(context, errorText(e), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New announcement')),
      body: ListView(padding: const EdgeInsets.all(18), children: [
        DropdownButtonFormField<String>(
          value: type,
          decoration: const InputDecoration(labelText: 'Type'),
          items: const [
            DropdownMenuItem(value: 'GENERAL', child: Text('General')),
            DropdownMenuItem(value: 'MENU', child: Text('Menu')),
            DropdownMenuItem(value: 'REMINDER', child: Text('Reminder')),
            DropdownMenuItem(value: 'SYSTEM', child: Text('Canteen timing / closure')),
          ],
          onChanged: (v) => setState(() => type = v ?? type),
        ),
        const SizedBox(height: 12),
        TextField(controller: title, maxLength: 80, decoration: const InputDecoration(labelText: 'Title')),
        TextField(controller: body, maxLength: 400, maxLines: 5, decoration: const InputDecoration(labelText: 'Message')),
        const SizedBox(height: 12),
        FilledButton.icon(onPressed: busy ? null : _send, icon: const Icon(Icons.send_rounded), label: Text(busy ? 'Sending…' : 'Send to this canteen')),
      ]),
    );
  }
}
