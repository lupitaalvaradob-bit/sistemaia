<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { user, setPerfil, clearSession, signOut } from './lib/auth.js';
  import { api } from './lib/api.js';
  import { sbSession } from './lib/supabase.js';
  import Login from './views/Login.svelte';
  import Dashboard from './views/Dashboard.svelte';
  import Documentos from './views/Documentos.svelte';
  import DocumentoDetalle from './views/DocumentoDetalle.svelte';
  import Reportes from './views/Reportes.svelte';
  import Usuarios from './views/Usuarios.svelte';

  let hash = location.hash || '#/dashboard';

  onMount(() => {
    const onHash = () => { hash = location.hash || '#/dashboard'; };
    window.addEventListener('hashchange', onHash);

    const unsubSession = sbSession.subscribe(async (session) => {
      if (session) {
        if (!get(user)) {
          try {
            const perfil = await api.me();
            setPerfil(perfil);
          } catch {
            clearSession();
          }
        }
      } else {
        clearSession();
      }
    });

    return () => {
      window.removeEventListener('hashchange', onHash);
      unsubSession();
    };
  });

  // parseo de ruta: '#/documentos/ID?x=y' -> { path, params }
  $: ({ path, params } = parse(hash));

  function parse(h) {
    const raw = h.replace(/^#/, '') || '/';
    const [p, query] = raw.split('?');
    const seg = p.split('/').filter(Boolean);
    const params = {};
    if (query) for (const pair of query.split('&')) {
      const [k, v] = pair.split('=');
      params[k] = decodeURIComponent(v || '');
    }
    let path = '/' + seg.join('/');
    if (seg[0] === 'documentos' && seg[1] && seg[1] !== 'nuevo') path = '/documentos/:id';
    return { path, params };
  }

  const links = [
    ['#/dashboard', 'Dashboard'],
    ['#/documentos', 'Documentos'],
    ['#/reportes', 'Reportes'],
    ['#/usuarios', 'Usuarios']
  ];

  function active(href) {
    return hash.startsWith(href) || (href === '#/documentos' && path.startsWith('/documentos'));
  }

  async function logout() {
    await signOut();
    hash = '#/login';
    location.hash = '#/login';
  }
</script>

{#if path === '/login' || !$sbSession}
  <Login onLogin={() => { hash = '#/dashboard'; location.hash = '#/dashboard'; }} />
{:else if !$user}
  <div class="login-wrap">
    <div class="card login-card">
      <p class="muted" style="text-align:center">Cargando sesion...</p>
    </div>
  </div>
{:else}
  <div class="layout">
    <nav class="sidebar">
      <h1>Sistema de Estadias</h1>
      {#each links as [href, label]}
        <a href={href} class:active={active(href)}>{label}</a>
      {/each}
      <div class="spacer"></div>
      <div class="user">{$user?.nombre}<br /><span class="muted">{$user?.rol}</span></div>
      <button class="secondary" on:click={logout}>Cerrar sesion</button>
    </nav>
    <main class="main">
      {#if path === '/dashboard' || path === '/'}
        <Dashboard />
      {:else if path === '/documentos' || path === '/documentos/nuevo'}
        <Documentos nuevo={path === '/documentos/nuevo'} />
      {:else if path === '/documentos/:id'}
        <DocumentoDetalle id={params.id} />
      {:else if path === '/reportes'}
        <Reportes />
      {:else if path === '/usuarios'}
        <Usuarios />
      {:else}
        <p class="muted">Pagina no encontrada. <a href="#/dashboard">Volver</a></p>
      {/if}
    </main>
  </div>
{/if}
