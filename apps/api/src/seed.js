// Seed inicial: carreras y usuarios de prueba usando Supabase Auth.
// Uso: npm run seed --workspace=apps/api
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const { supabase } = require('./config');

async function findAuthUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return (data.users || []).find((u) => u.email === email) || null;
}

async function ensureAuthUser({ email, password, nombre, rol }) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol }
  });
  if (error) throw error;
  return data.user;
}

async function main() {
  const carreras = [
    { nombre: 'Ingenieria en Sistemas', codigo: 'ING-SIS' },
    { nombre: 'Ingenieria Civil', codigo: 'ING-CIV' },
    { nombre: 'Administracion de Empresas', codigo: 'ADM-EMP' }
  ];
  for (const c of carreras) {
    const { error } = await supabase.from('carreras').upsert(c, { onConflict: 'nombre' });
    if (error) console.error('carrera', c.nombre, error.message);
  }

  const { data: carrerasData } = await supabase.from('carreras').select('id, nombre');
  const carreraId = (nombre) => carrerasData.find((c) => c.nombre === nombre)?.id || null;

  const usuarios = [
    { email: 'admin@demo.com', password: 'admin123', nombre: 'Administrador', rol: 'admin', carrera_id: null },
    { email: 'director@demo.com', password: 'director123', nombre: 'Director Carrera', rol: 'director', carrera_id: carreraId('Ingenieria en Sistemas') },
    { email: 'revisor@demo.com', password: 'revisor123', nombre: 'Revisor', rol: 'revisor', carrera_id: carreraId('Ingenieria en Sistemas') },
    { email: 'docente@demo.com', password: 'docente123', nombre: 'Docente Guia', rol: 'docente', carrera_id: carreraId('Ingenieria en Sistemas') },
    { email: 'estudiante@demo.com', password: 'estudiante123', nombre: 'Estudiante Demo', rol: 'estudiante', carrera_id: carreraId('Ingenieria en Sistemas') }
  ];

  for (const u of usuarios) {
    try {
      const authUser = await ensureAuthUser(u);

      const { data: porEmail } = await supabase
        .from('perfiles')
        .select('id')
        .eq('email', u.email)
        .maybeSingle();

      if (porEmail) {
        const { error } = await supabase
          .from('perfiles')
          .update({ nombre: u.nombre, rol: u.rol, carrera_id: u.carrera_id })
          .eq('id', porEmail.id);
        console.log(error ? `error ${u.email}: ${error.message}` : `actualizado: ${u.email} (${u.rol})`);
        continue;
      }

      const { error } = await supabase.from('perfiles').insert({
        id: authUser.id,
        email: authUser.email,
        password_hash: 'supabase-auth',
        nombre: u.nombre,
        rol: u.rol,
        carrera_id: u.carrera_id
      });
      console.log(error ? `error ${u.email}: ${error.message}` : `creado: ${u.email} (${u.rol})`);
    } catch (e) {
      console.error(`error ${u.email}:`, e.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
