import 'dart:async';
import 'dart:math' as math;
import 'package:material_ui/material_ui.dart';
import 'package:geolocator/geolocator.dart';

void main() {
  runApp(const VelocimetroApp());
}

class VelocimetroApp extends StatelessWidget {
  const VelocimetroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Velocímetro GPS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
        useMaterial3: true,
      ),
      home: const VelocimetroPage(),
    );
  }
}

class VelocimetroPage extends StatefulWidget {
  const VelocimetroPage({super.key});

  @override
  State<VelocimetroPage> createState() => _VelocimetroPageState();
}

class _VelocimetroPageState extends State<VelocimetroPage> {
  static const double maxKmh = 240.0;

  StreamSubscription<Position>? _sub;
  bool _tracking = false;
  String _status = 'Detenido';
  double _speedKmh = 0;
  double _maxSpeedKmh = 0;
  double _distanceKm = 0;
  int _elapsedSeconds = 0;
  Timer? _timer;

  Position? _lastPosition;
  DateTime? _lastTime;

  @override
  void dispose() {
    _sub?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _toggleTracking() async {
    if (_tracking) {
      await _stop();
      return;
    }
    await _start();
  }

  Future<void> _start() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _status = 'Activa el GPS del dispositivo');
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      setState(() => _status = 'Permiso de ubicación denegado');
      return;
    }

    _lastPosition = null;
    _lastTime = null;
    _distanceKm = 0;
    _elapsedSeconds = 0;
    _maxSpeedKmh = 0;
    _speedKmh = 0;

    setState(() {
      _tracking = true;
      _status = 'Obteniendo señal GPS…';
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsedSeconds++);
    });

    final settings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 0,
    );

    _sub = Geolocator.getPositionStream(locationSettings: settings)
        .listen(_onPosition, onError: _onError);
  }

  void _onPosition(Position position) {
    final now = position.timestamp;
    double speedMs = position.speed; // m/s

    final last = _lastPosition;
    final lastTime = _lastTime;
    if (last != null && lastTime != null) {
      final dt = now.difference(lastTime).inMilliseconds / 1000.0;
      if (dt > 0.2 && dt < 30) {
        final dist = Geolocator.distanceBetween(
          last.latitude,
          last.longitude,
          position.latitude,
          position.longitude,
        );
        final speedFromDistance = dist / dt;
        // Combina ambas fuentes: la derivada de distancia es más estable
        // cuando position.speed reporta 0 en algunos dispositivos.
        speedMs = speedMs > 0 ? speedMs * 0.6 + speedFromDistance * 0.4
                             : speedFromDistance;
        _distanceKm += dist / 1000.0;
      }
    }
    _lastPosition = position;
    _lastTime = now;

    final kmh = speedMs * 3.6;
    // Suavizado exponencial para una aguja estable
    final smoothed = _tracking && _speedKmh > 0
        ? _speedKmh * 0.7 + kmh * 0.3
        : kmh;

    if (!mounted) return;
    setState(() {
      _speedKmh = smoothed;
      if (smoothed > _maxSpeedKmh) _maxSpeedKmh = smoothed;
      _status = position.accuracy < 50
          ? 'GPS activo'
          : 'Señal débil (±${position.accuracy.round()} m)';
    });
  }

  void _onError(Object error) {
    if (!mounted) return;
    setState(() {
      _status = 'Error: $error';
      _tracking = false;
    });
    _timer?.cancel();
  }

  Future<void> _stop() async {
    await _sub?.cancel();
    _sub = null;
    _timer?.cancel();
    _timer = null;
    if (!mounted) return;
    setState(() {
      _tracking = false;
      _status = 'Detenido';
    });
  }

  String get _elapsedLabel {
    final h = _elapsedSeconds ~/ 3600;
    final m = (_elapsedSeconds % 3600) ~/ 60;
    final s = _elapsedSeconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  double get _avgSpeed =>
      _elapsedSeconds > 0 ? _distanceKm / (_elapsedSeconds / 3600.0) : 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _tracking ? Colors.green : Colors.red;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Velocímetro GPS'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 16),
            Text(
              _status,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: _tracking ? Colors.green : theme.colorScheme.error,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Center(
                child: SizedBox(
                  width: 320,
                  height: 320,
                  child: CustomPaint(
                    painter: _GaugePainter(
                      speed: _speedKmh,
                      maxSpeed: maxKmh,
                      color: _tracking ? Colors.blueAccent : Colors.grey,
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _speedKmh.toStringAsFixed(0),
                            style: theme.textTheme.displayLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              fontSize: 72,
                              color: theme.colorScheme.onSurface,
                            ),
                          ),
                          Text(
                            'km/h',
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              letterSpacing: 4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _StatCard(
                    label: 'Máxima',
                    value: '${_maxSpeedKmh.toStringAsFixed(0)} km/h',
                  ),
                  _StatCard(
                    label: 'Promedio',
                    value: '${_avgSpeed.toStringAsFixed(1)} km/h',
                  ),
                  _StatCard(
                    label: 'Distancia',
                    value: '${_distanceKm.toStringAsFixed(2)} km',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Tiempo: $_elapsedLabel',
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: 24),
            FloatingActionButton.extended(
              onPressed: _toggleTracking,
              backgroundColor: color,
              icon: Icon(_tracking ? Icons.stop : Icons.play_arrow),
              label: Text(
                _tracking ? 'DETENER' : 'INICIAR',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;

  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double speed;
  final double maxSpeed;
  final Color color;

  _GaugePainter({required this.speed, required this.maxSpeed, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 24;
    final strokeWidth = 18.0;

    const startAngle = math.pi * 0.75;
    const sweepAngle = math.pi * 1.5;

    final bgPaint = Paint()
      ..color = Colors.grey.shade300
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      bgPaint,
    );

    final fraction = (speed / maxSpeed).clamp(0.0, 1.0);
    final fgPaint = Paint()
      ..shader = SweepGradient(
        startAngle: startAngle,
        endAngle: startAngle + sweepAngle,
        colors: [Colors.green, Colors.yellow, Colors.red],
        stops: const [0.0, 0.6, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle * fraction,
      false,
      fgPaint,
    );

    // Marcas de velocidad cada 20 km/h
    final tickPaint = Paint()
      ..color = Colors.grey.shade600
      ..strokeWidth = 2;
    for (var v = 0; v <= maxSpeed; v += 20) {
      final a = startAngle + sweepAngle * (v / maxSpeed);
      final inner = radius - strokeWidth / 2 - 10;
      final outer = radius - strokeWidth / 2 - 2;
      canvas.drawLine(
        Offset(
          center.dx + inner * math.cos(a),
          center.dy + inner * math.sin(a),
        ),
        Offset(
          center.dx + outer * math.cos(a),
          center.dy + outer * math.sin(a),
        ),
        tickPaint,
      );
    }
  }

  @override
  bool shouldRepaint(_GaugePainter oldDelegate) =>
      oldDelegate.speed != speed ||
      oldDelegate.maxSpeed != maxSpeed ||
      oldDelegate.color != color;
}
