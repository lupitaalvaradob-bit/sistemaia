<script>
  import { onMount } from 'svelte';
  import { user } from '../lib/auth.js';
  import { api } from '../lib/api.js';

  export let id;

  let doc = null;
  let obs = [];
  let hist = [];
  let error = '';
  let nuevaObs = '';
  let comentarioEstado = '';

  const ESTADO_LABEL = {
    recibido: 'Recibido', en_revision: 'En revision', con_observaciones: 'Con observaciones',
    aprobado: 'Aprobado', almacenado: 'Almacenado'
  };
  const TRANSICIONES = {
    recibido: [['en_revision', 'Iniciar revision'], ['con_observaciones', 'Observaciones']],
    en_revision: [['con_observaciones', 'Con observaciones'], ['aprobado', 'Aprobar']],
    con_observaciones: [['en_revision', 'Reenviar a revision'], ['aprobado', 'Aprobar']],
    aprobado: [['almacenado', 'Almacenar']],
    almacenado: []
  };
  const ROLES_APRUEBAN = ['admin', 'director', 'revisor'];

  async function cargar() {
    try {
      [doc, obs, hist] = await Promise.all([
        api.documento(id), api.observaciones(id), api.historial(id)
      ]);
    } catch (e) { error = e.message; }
  }

  onMount(cargar);

  async function cambiarEstado(estado) {
    error = '';
    try {
      doc = await api.cambiarEstado(id, estado, comentarioEstado || null);
      comentarioEstado = '';
      hist = await api.historial(id);
      obs = await api.observaciones(id);
    } catch (e) { error = e.message; }
  }

  async function agregarObs(e) {
    e.preventDefault();
    if (!nuevaObs.trim()) return;
    try {
      await api.crearObservacion(id, nuevaObs.trim());
      nuevaObs = '';
      obs = await api.observaciones(id);
      hist = await api.historial(id);
      // si estaba en revision, marcar con observaciones
      if (doc.estado === 'en_revision') cambiarEstado('con_observaciones');
    } catch (e) { error = e.message; }
  }

  async function toggleObs(o) {
    try {
      await api.resolverObservacion(id, o.id, !o.resuelta);
      obs = await api.observaciones(id);
    } catch (e) { error = e.message; }
  }
</script>

{#if doc}
  <p><a href="#/documentos">← Volver a documentos</a></p>
  <div class="row spread">
    <h2>{doc.titulo}</h2>
    <span class="badge badge-{doc.estado}">{ESTADO_LABEL[doc.estado]}</span>
  </div>
  {#if error}<p class="error">{error}</p>{/if}

  <div class="grid cols-2">
    <div class="card">
      <h3>Detalle</h3>
      <table>
        <tbody>
          <tr><td class="muted">Estudiante</td><td>{doc.estudiante_nombre}</td></tr>
          <tr><td class="muted">Carrera</td><td>{doc.carreras?.nombre || '—'}</td></tr>
          <tr><td class="muted">Docente</td><td>{doc.docente?.nombre || '—'}</td></tr>
          {#if doc.revisor_id}<tr><td class="muted">Revisor asignado</td><td>Si</td></tr>{/if}
          <tr><td class="muted">Creado</td><td>{new Date(doc.created_at).toLocaleString()}</td></tr>
          {#if doc.fecha_aprobacion}<tr><td class="muted">Aprobado</td><td>{new Date(doc.fecha_aprobacion).toLocaleString()}</td></tr>{/if}
          {#if doc.archivo_url}<tr><td class="muted">Archivo</td><td><a href={doc.archivo_url} target="_blank">Abrir documento</a></td></tr>{/if}
        </tbody>
      </table>
      {#if doc.resumen}<p class="muted">{doc.resumen}</p>{/if}
    </div>

    <div class="card">
      <h3>Cambiar estado</h3>
      {#each TRANSICIONES[doc.estado] || [] as [estado, label]}
        {@const permitido = !['aprobado','almacenado'].includes(estado) || ROLES_APRUEBAN.includes($user?.rol)}
        {#if permitido}
          <div class="row" style="margin-bottom:.6rem">
            <button class="secondary" on:click={() => cambiarEstado(estado)}>{label} → {ESTADO_LABEL[estado]}</button>
          </div>
        {/if}
      {/each}
      {#if (TRANSICIONES[doc.estado] || []).length === 0}
        <p class="muted">El documento esta en estado final.</p>
      {/if}
      <label>Comentario (opcional)</label>
      <input bind:value={comentarioEstado} placeholder="Motivo del cambio de estado" />
    </div>
  </div>

  <div class="grid cols-2">
    <div class="card">
      <h3>Observaciones ({obs.filter(o => !o.resuelta).length} pendientes)</h3>
      {#each obs as o}
        <div class="obs" class:resuelta={o.resuelta}>
          <div class="row spread">
            <strong>{o.perfiles?.nombre || 'Usuario'}</strong>
            <span class="muted">{new Date(o.created_at).toLocaleDateString()}</span>
          </div>
          <p style="margin:.3rem 0">{o.texto}</p>
          <button class="secondary" style="padding:.25rem .6rem;font-size:.78rem" on:click={() => toggleObs(o)}>
            {o.resuelta ? 'Reabrir' : 'Marcar resuelta'}
          </button>
        </div>
      {:else}
        <p class="muted">Sin observaciones.</p>
      {/each}
      <form on:submit={agregarObs} class="row">
        <input bind:value={nuevaObs} placeholder="Nueva observacion..." />
        <button type="submit">Agregar</button>
      </form>
    </div>

    <div class="card">
      <h3>Historial / Trazabilidad</h3>
      {#each hist as h}
        <div class="obs">
          <div class="row spread">
            <strong>{h.accion}</strong>
            <span class="muted">{new Date(h.created_at).toLocaleString()}</span>
          </div>
          <p class="muted" style="margin:.2rem 0">{h.perfiles?.nombre || 'Sistema'}{h.comentario ? ' — ' + h.comentario : ''}</p>
        </div>
      {:else}
        <p class="muted">Sin movimientos.</p>
      {/each}
    </div>
  </div>
{:else if error}
  <p class="error">{error}</p>
{:else}
  <p class="muted">Cargando...</p>
{/if}
