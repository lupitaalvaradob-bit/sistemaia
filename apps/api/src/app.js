const express = require('express');
const cors = require('cors');
const { loadBalancer, stats } = require('./loadBalancer');
const { webOrigin } = require('./config');

const authRoutes = require('./routes/auth');
const documentoRoutes = require('./routes/documentos');
const reporteRoutes = require('./routes/reportes');
const carreraRoutes = require('./routes/carreras');

const app = express();

app.use(cors({ origin: [webOrigin, 'http://localhost:5173'].filter(Boolean) }));
app.use(express.json({ limit: '5mb' }));
app.use(loadBalancer);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, instance: req.instance.id, uptime: process.uptime() });
});
app.get('/api/balanceador', (req, res) => res.json({ instances: stats() }));

app.use('/api/auth', authRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/carreras', carreraRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
