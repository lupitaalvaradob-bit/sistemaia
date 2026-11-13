<script>
  import { onMount } from 'svelte';
  import { user } from '../lib/auth.js';
  import { api } from '../lib/api.js';

  export let nuevo = false;

  let docs = [];
  let carreras = [];
  let filtroEstado = '';
  let filtroTexto = '';
  let error = '';

  // formulario nuevo
  let titulo = '', resumenTxt = '', estudiante = '', carreraId = '', archivoUrl = '';
  let guardando = false;

  const ESTADOS = ['', 'recibido', 'en_revision', 'con_observaciones', 'aprobado', 'almacenado'];
  const ESTADO_LABEL = {
    recibido: 'Recibido', en_revision: 'En revision', con_observaciones: 'Con observaciones',
    aprobado: 'Aprobado', almacenado: 'Almacenado'
  };

  async function cargar() {
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTexto) params.set('q', filtroTexto);
      docs = await api.documentos('?' + params.toString());
    } catch (e) { error = e.message; }
  }

  onMount(async () => {
    try { carreras = await api.carreras(); } catch {}
    cargar();
  });

  async function crear(e) {
    e.preventDefault();
    guardando = true; error = '';
    try {
      await api.crearDocumento({
        titulo, resumen: resumenTxt, estudiante_nombre: estudiante,
        carrera_id: carreraId || null, archivo_url: archivoUrl || null
      });
      titulo = resumenTxt = estudiante = archivoUrl = '';
      location.hash = '#/documentos';
      cargar();
    } catch (err) { error = err.message; }
    finally { guardando = false; }
  }

  function ver(id) { location.hash = `#/documentos/${id}`; }
</script>

{#if nuevo}
  <h2>Registrar documento de estadia</h2>
  <div class="card" style="max-width:640px">
    <form on:submit={crear}>
      <label>Titulo de la memoria</label>
      <input bind:value={titulo} required placeholder="Ej. Sistema de gestion academica" />
      <label>Resumen</label>
      <textarea bind:value={resumenTxt} rows="3" placeholder="Breve descripcion del trabajo"></textarea>
      <div class="form-row">
        <div>
          <label>Nombre del estudiante</label>
          <input bind:value={estudiante} required />
        </div>
        <div>
          <label>Carrera</label>
          <select bind:value={carreraId}>
            <option value="">— Seleccionar —</option>
            {#each carreras as c}<option value={c.id}>{c.nombre}</option>{/each}
          </select>
        </div>
      </div>
      <label>URL del archivo (PDF/Drive)</label>
      <input bind:value={archivoUrl} placeholder="https://..." />
      {#if error}<p class="error">{error}</p>{/if}
      <div class="row" style="margin-top:1rem">
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar'}</button>
        <a class="btn secondary" href="#/documentos">Cancelar</a>
      </div>
    </form>
  </div>
{:else}
  <div class="row spread">
    <h2>Documentos</h2>
    <a class="btn" href="#/documentos/nuevo">+ Nuevo documento</a>
  </div>

  <div class="card row">
    <select bind:value={filtroEstado} on:change={cargar} style="width:auto">
      {#each ESTADOS as e}<option value={e}>{e ? ESTADO_LABEL[e] : 'Todos los estados'}</option>{/each}
    </select>
    <input bind:value={filtroTexto} on:keydown={(e) => e.key === 'Enter' && cargar()} placeholder="Buscar por titulo..." style="max-width:260px" />
    <button class="secondary" on:click={cargar}>Buscar</button>
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="card" style="padding:0">
    <table>
      <thead><tr><th>Titulo</th><th>Estudiante</th><th>Carrera</th><th>Docente</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>
        {#each docs as d}
          <tr style="cursor:pointer" on:click={() => ver(d.id)}>
            <td>{d.titulo}</td>
            <td>{d.estudiante_nombre}</td>
            <td>{d.carreras?.nombre || '—'}</td>
            <td>{d.docente?.nombre || '—'}</td>
            <td><span class="badge badge-{d.estado}">{ESTADO_LABEL[d.estado]}</span></td>
            <td class="muted">{new Date(d.created_at).toLocaleDateString()}</td>
          </tr>
        {:else}
          <tr><td colspan="6" class="muted" style="text-align:center;padding:1.5rem">Sin documentos</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
