const { supabase } = require('./config');

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
  req.authUser = data.user;
  next();
}

async function loadProfile(req, res, next) {
  const authUser = req.authUser;
  const email = authUser.email || `${authUser.id}@sin-email.local`;

  let { data: perfil } = await supabase
    .from('perfiles')
    .select('id, email, nombre, rol, carrera_id, activo')
    .eq('email', email)
    .maybeSingle();

  if (!perfil) {
    ({ data: perfil } = await supabase
      .from('perfiles')
      .select('id, email, nombre, rol, carrera_id, activo')
      .eq('id', authUser.id)
      .maybeSingle());
  }

  if (!perfil) {
    const nombre =
      authUser.user_metadata?.nombre ||
      authUser.user_metadata?.full_name ||
      email.split('@')[0] ||
      'Usuario';

    const { data: nuevo, error: insErr } = await supabase
      .from('perfiles')
      .insert({
        id: authUser.id,
        email,
        password_hash: 'supabase-auth',
        nombre,
        rol: 'estudiante',
        carrera_id: null
      })
      .select('id, email, nombre, rol, carrera_id, activo')
      .single();

    if (insErr) return res.status(500).json({ error: insErr.message });
    perfil = nuevo;
  }

  if (!perfil.activo) {
    return res.status(403).json({ error: 'Usuario inactivo' });
  }

  req.perfil = perfil;
  req.user = { sub: perfil.id, email: perfil.email, rol: perfil.rol };
  next();
}

// Roles: admin, director, revisor, docente, estudiante
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.perfil || !roles.includes(req.perfil.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta accion' });
    }
    next();
  };
}

module.exports = { authRequired, requireRole, loadProfile };
