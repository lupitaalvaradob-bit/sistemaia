const express = require('express');
const { supabase } = require('../config');
const { authRequired, loadProfile } = require('../auth');

const router = express.Router();
router.use(authRequired, loadProfile);

const ESTADOS = ['recibido', 'en_revision', 'con_observaciones', 'aprobado', 'almacenado'];

// Listado con filtros (rol docente solo ve los suyos; admin/director ven todo)
router.get('/', async (req, res) => {
  let q = supabase
    .from('memorias_documentos')
    .select('*, carreras(nombre), docente:perfiles!memorias_documentos_docente_id_fkey(nombre), estudiante:perfiles!memorias_documentos_estudiante_id_fkey(nombre)')
    .order('created_at', { ascending: false });

  const { estado, carrera_id, q: texto } = req.query;
  if (estado) q = q.eq('estado', estado);
  if (carrera_id) q = q.eq('carrera_id', carrera_id);
  if (texto) q = q.ilike('titulo', `%${texto}%`);
  if (req.perfil.rol === 'docente') q = q.eq('docente_id', req.perfil.id);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('memorias_documentos')
    .select('*, carreras(nombre), docente:perfiles!memorias_documentos_docente_id_fkey(nombre), estudiante:perfiles!memorias_documentos_estudiante_id_fkey(nombre)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Documento no encontrado' });
  res.json(data);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.titulo || !b.estudiante_nombre) {
    return res.status(400).json({ error: 'titulo y estudiante_nombre son obligatorios' });
  }
  const { data, error } = await supabase
    .from('memorias_documentos')
    .insert({
      titulo: b.titulo,
      resumen: b.resumen || null,
      estudiante_nombre: b.estudiante_nombre,
      estudiante_id: b.estudiante_id || null,
      carrera_id: b.carrera_id || req.perfil.carrera_id || null,
      docente_id: b.docente_id || req.perfil.id,
      archivo_url: b.archivo_url || null,
      estado: 'recibido'
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await supabase.from('memorias_historial').insert({
    documento_id: data.id, usuario_id: req.perfil.id, accion: 'creado', comentario: 'Documento registrado'
  });
  res.status(201).json(data);
});

// Transiciones de estado + observaciones + historial
const TRANSICIONES = {
  recibido: ['en_revision', 'con_observaciones'],
  en_revision: ['con_observaciones', 'aprobado'],
  con_observaciones: ['en_revision', 'aprobado'],
  aprobado: ['almacenado'],
  almacenado: []
};

router.patch('/:id/estado', async (req, res) => {
  const { estado, comentario } = req.body || {};
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado invalido' });

  const { data: doc } = await supabase.from('memorias_documentos').select('*').eq('id', req.params.id).single();
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
  if (!TRANSICIONES[doc.estado]?.includes(estado)) {
    return res.status(409).json({ error: `No se puede pasar de ${doc.estado} a ${estado}` });
  }
  // Solo admin/director/revisor pueden aprobar o almacenar
  if (['aprobado', 'almacenado'].includes(estado) && !['admin', 'director', 'revisor'].includes(req.perfil.rol)) {
    return res.status(403).json({ error: 'Solo revisores, directores o administradores pueden aprobar' });
  }

  const patch = { estado };
  if (estado === 'en_revision') patch.revisor_id = req.perfil.id;
  if (estado === 'aprobado') patch.fecha_aprobacion = new Date().toISOString();

  const { data, error } = await supabase.from('memorias_documentos').update(patch).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('memorias_historial').insert({
    documento_id: data.id, usuario_id: req.perfil.id,
    accion: `estado:${doc.estado}->${estado}`, comentario: comentario || null
  });
  res.json(data);
});

router.get('/:id/observaciones', async (req, res) => {
  const { data, error } = await supabase
    .from('memorias_observaciones')
    .select('*, perfiles(nombre)')
    .eq('documento_id', req.params.id)
    .order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:id/observaciones', async (req, res) => {
  const { texto, resuelta } = req.body || {};
  if (!texto) return res.status(400).json({ error: 'texto es obligatorio' });
  const { data, error } = await supabase
    .from('memorias_observaciones')
    .insert({ documento_id: req.params.id, autor_id: req.perfil.id, texto, resuelta: !!resuelta })
    .select('*, perfiles(nombre)')
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await supabase.from('memorias_historial').insert({
    documento_id: req.params.id, usuario_id: req.perfil.id, accion: 'observacion', comentario: texto
  });
  res.status(201).json(data);
});

router.patch('/:id/observaciones/:obsId', async (req, res) => {
  const { resuelta } = req.body || {};
  const { data, error } = await supabase
    .from('memorias_observaciones')
    .update({ resuelta: !!resuelta })
    .eq('id', req.params.obsId)
    .eq('documento_id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id/historial', async (req, res) => {
  const { data, error } = await supabase
    .from('memorias_historial')
    .select('*, perfiles(nombre)')
    .eq('documento_id', req.params.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
