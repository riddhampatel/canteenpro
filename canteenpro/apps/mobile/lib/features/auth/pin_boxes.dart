import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';

/// 4-digit PIN entry rendered as boxes over a single hidden TextField.
class PinBoxes extends StatefulWidget {
  final int length;
  final bool obscure;
  final bool autofocus;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onCompleted;
  const PinBoxes({super.key, this.length = 4, this.obscure = true, this.autofocus = false, this.onChanged, this.onCompleted});
  @override
  State<PinBoxes> createState() => _PinBoxesState();
}

class _PinBoxesState extends State<PinBoxes> {
  final ctrl = TextEditingController();
  final focus = FocusNode();

  @override
  void initState() {
    super.initState();
    focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    ctrl.dispose();
    focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final v = ctrl.text;
    return GestureDetector(
      onTap: () => focus.requestFocus(),
      child: Stack(children: [
        Opacity(
          opacity: 0,
          child: SizedBox(
            height: 60,
            child: TextField(
              controller: ctrl,
              focusNode: focus,
              autofocus: widget.autofocus,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(widget.length)],
              onChanged: (s) {
                setState(() {});
                widget.onChanged?.call(s);
                if (s.length == widget.length) widget.onCompleted?.call(s);
              },
            ),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.length, (i) {
            final filled = i < v.length;
            final active = focus.hasFocus && i == v.length;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 7),
              width: 56,
              height: 60,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: active ? AppColors.primary : AppColors.line, width: active ? 2 : 1.2),
              ),
              child: Text(filled ? (widget.obscure ? '•' : v[i]) : '', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
            );
          }),
        ),
      ]),
    );
  }
}
