require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno ${key}. Revisa tu archivo .env`);
    process.exit(1);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = {
  supabase,
  port: Number(process.env.PORT || 4000),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  loadBalancerInstances: Math.max(1, Number(process.env.LOAD_BALANCER_INSTANCES || 3))
};
