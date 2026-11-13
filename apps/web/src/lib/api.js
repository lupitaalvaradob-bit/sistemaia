import { getAccessToken, clearSession, signOut } from './auth.js';

const BASE = '/api';

async function request(method, path, body) {
  const token = await getAccessToken();
  if (!token) {
    clearSession();
    location.hash = '#/login';
    throw new Error('Sesion expirada');
  }

  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await signOut();
    location.hash = '#/login';
  }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  me: () => request('GET', '/auth/yo'),
  registro: (b) => request('POST', '/auth/registro', b),
  documentos: (params = '') => request('GET', '/documentos' + params),
  documento: (id) => request('GET', `/documentos/${id}`),
  crearDocumento: (b) => request('POST', '/documentos', b),
  cambiarEstado: (id, estado, comentario) => request('PATCH', `/documentos/${id}/estado`, { estado, comentario }),
  observaciones: (id) => request('GET', `/documentos/${id}/observaciones`),
  crearObservacion: (id, texto) => request('POST', `/documentos/${id}/observaciones`, { texto }),
  resolverObservacion: (id, obsId, resuelta) => request('PATCH', `/documentos/${id}/observaciones/${obsId}`, { resuelta }),
  historial: (id) => request('GET', `/documentos/${id}/historial`),
  resumen: () => request('GET', '/reportes/resumen'),
  tiempos: () => request('GET', '/reportes/tiempos'),
  carreras: () => request('GET', '/carreras'),
  usuarios: () => request('GET', '/auth/usuarios'),
  actualizarUsuario: (id, b) => request('PATCH', `/auth/usuarios/${id}`, b)
};
