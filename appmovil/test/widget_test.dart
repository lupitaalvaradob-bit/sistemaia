import 'package:flutter_test/flutter_test.dart';

import 'package:velocimetro/main.dart';

void main() {
  testWidgets('Velocimetro smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const VelocimetroApp());
    await tester.pumpAndSettle();

    expect(find.text('Velocímetro GPS'), findsWidgets);
    expect(find.text('km/h'), findsOneWidget);
    expect(find.text('INICIAR'), findsOneWidget);
  });
}
