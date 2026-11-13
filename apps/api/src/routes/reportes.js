const express = require('express');
const { supabase } = require('../config');
const { authRequired, loadProfile } = require('../auth');

const router = express.Router();
router.use(authRequired, loadProfile);

// Reportes e indicadores: conteos por estado, carrera y docente
router.get('/resumen', async (req, res) => {
  const { data: docs, error } = await supabase
    .from('memorias_documentos')
    .select('id, estado, carrera_id, docente_id, fecha_aprobacion, created_at, carreras(nombre), docente:perfiles!memorias_documentos_docente_id_fkey(nombre)');
  if (error) return res.status(500).json({ error: error.message });

  const porEstado = {};
  const porCarrera = {};
  const porDocente = {};
  for (const d of docs || []) {
    porEstado[d.estado] = (porEstado[d.estado] || 0) + 1;
    const c = d.carreras?.nombre || 'Sin carrera';
    porCarrera[c] = (porCarrera[c] || 0) + 1;
    if (d.docente_id) {
      const nombre = d.docente?.nombre || d.docente_id;
      porDocente[nombre] = (porDocente[nombre] || 0) + 1;
    }
  }

  const hoy = new Date();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();
  const aprobadosMes = (docs || []).filter(d => {
    if (!d.fecha_aprobacion) return false;
    const f = new Date(d.fecha_aprobacion);
    return f.getMonth() === mes && f.getFullYear() === anio;
  }).length;

  res.json({
    total: (docs || []).length,
    porEstado,
    porCarrera,
    porDocente,
    aprobadosMes
  });
});

router.get('/tiempos', async (req, res) => {
  // Tiempo promedio (dias) desde creacion hasta aprobacion
  const { data, error } = await supabase
    .from('memorias_documentos')
    .select('created_at, fecha_aprobacion')
    .not('fecha_aprobacion', 'is', null);
  if (error) return res.status(500).json({ error: error.message });

  const dias = (data || []).map(d =>
    (new Date(d.fecha_aprobacion) - new Date(d.created_at)) / 86400000
  );
  const promedio = dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : 0;
  res.json({ documentosAprobados: dias.length, diasPromedioAprobacion: Math.round(promedio * 10) / 10 });
});

module.exports = router;
