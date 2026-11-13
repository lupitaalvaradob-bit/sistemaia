import { createClient } from '@supabase/supabase-js';
import { writable } from 'svelte/store';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en apps/web/.env');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});

export const sbSession = writable(null);
export const sbUser = writable(null);

supabase.auth.getSession().then(({ data }) => {
  sbSession.set(data.session);
  sbUser.set(data.session?.user ?? null);
});

supabase.auth.onAuthStateChange((event, session) => {
  sbSession.set(session);
  sbUser.set(session?.user ?? null);
});
