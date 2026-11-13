const express = require('express');
const { supabase } = require('../config');
const { authRequired, requireRole, loadProfile } = require('../auth');

const router = express.Router();

const PERFIL_SELECT = 'id, email, nombre, rol, carrera_id, activo, created_at';

// Crear usuario: registra en Supabase Auth y crea su perfil en la tabla perfiles.
router.post('/registro', authRequired, loadProfile, requireRole('admin'), async (req, res) => {
  const { email, password, nombre, rol, carrera_id } = req.body || {};
  if (!email || !password || !nombre || !rol) {
    return res.status(400).json({ error: 'email, password, nombre y rol son obligatorios' });
  }

  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
    user_metadata: { nombre, rol }
  });
  if (authErr) return res.status(400).json({ error: authErr.message });

  const authUser = created.user;
  const emailFinal = authUser.email || email.toLowerCase().trim();

  const { data: existente } = await supabase
    .from('perfiles')
    .select('id')
    .eq('email', emailFinal)
    .maybeSingle();

  let perfil;
  if (existente) {
    const { data, error } = await supabase
      .from('perfiles')
      .update({ nombre, rol, carrera_id: carrera_id || null })
      .eq('id', existente.id)
      .select('id, email, nombre, rol, carrera_id')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    perfil = data;
  } else {
    const { data, error } = await supabase
      .from('perfiles')
      .insert({
        id: authUser.id,
        email: emailFinal,
        password_hash: 'supabase-auth',
        nombre,
        rol,
        carrera_id: carrera_id || null
      })
      .select('id, email, nombre, rol, carrera_id')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    perfil = data;
  }

  res.status(201).json(perfil);
});

router.get('/yo', authRequired, loadProfile, async (req, res) => {
  const { data: carrera } = req.perfil.carrera_id
    ? await supabase.from('carreras').select('id, nombre').eq('id', req.perfil.carrera_id).single()
    : { data: null };
  res.json({ ...req.perfil, carrera });
});

router.get('/usuarios', authRequired, loadProfile, requireRole('admin', 'director'), async (req, res) => {
  const { data, error } = await supabase
    .from('perfiles')
    .select(PERFIL_SELECT)
    .order('nombre');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/usuarios/:id', authRequired, loadProfile, requireRole('admin'), async (req, res) => {
  const { nombre, rol, carrera_id, activo } = req.body || {};
  const patch = {};
  if (nombre !== undefined) patch.nombre = nombre;
  if (rol !== undefined) patch.rol = rol;
  if (carrera_id !== undefined) patch.carrera_id = carrera_id || null;
  if (activo !== undefined) patch.activo = !!activo;

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  const { data, error } = await supabase
    .from('perfiles')
    .update(patch)
    .eq('id', req.params.id)
    .select(PERFIL_SELECT)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
