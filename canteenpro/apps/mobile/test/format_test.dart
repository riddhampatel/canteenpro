import 'package:flutter_test/flutter_test.dart';
import 'package:canteenpro/core/format.dart';

void main() {
  test('initials', () {
    expect(initials('Ananya Iyer'), 'AI');
    expect(initials('Rosey'), 'R');
  });
  test('titleCase', () => expect(titleCase('PAST_DUE'), 'Past Due'));
  test('inr', () => expect(inr(1500).contains('1,500'), true));
}
