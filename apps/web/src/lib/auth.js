import { writable } from 'svelte/store';
import { supabase } from './supabase.js';

const PERFIL_KEY = 'estadia_perfil';

export const user = writable(null);

export function setPerfil(perfil) {
  localStorage.setItem(PERFIL_KEY, JSON.stringify(perfil));
  user.set(perfil);
}

export function clearSession() {
  localStorage.removeItem(PERFIL_KEY);
  user.set(null);
}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithPassword(email, password, nombre) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } }
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/' }
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  clearSession();
}

// Restaura el perfil guardado al recargar la pagina
try {
  const saved = JSON.parse(localStorage.getItem(PERFIL_KEY));
  if (saved) user.set(saved);
} catch {
  localStorage.removeItem(PERFIL_KEY);
}
