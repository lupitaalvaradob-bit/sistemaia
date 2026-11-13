const express = require('express');
const { supabase } = require('../config');
const { authRequired, loadProfile } = require('../auth');

const router = express.Router();
router.use(authRequired, loadProfile);

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('carreras').select('*').order('nombre');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  if (!['admin', 'director'].includes(req.perfil.rol)) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }
  const { nombre, codigo } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
  const { data, error } = await supabase.from('carreras').insert({ nombre, codigo: codigo || null }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
