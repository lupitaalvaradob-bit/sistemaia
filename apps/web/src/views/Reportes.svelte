<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';

  let resumen = null;
  let tiempos = null;
  let error = '';

  onMount(async () => {
    try {
      [resumen, tiempos] = await Promise.all([api.resumen(), api.tiempos()]);
    } catch (e) { error = e.message; }
  });

  const ESTADO_LABEL = {
    recibido: 'Recibidos', en_revision: 'En revision', con_observaciones: 'Con observaciones',
    aprobado: 'Aprobados', almacenado: 'Almacenados'
  };
</script>

<h2>Reportes e indicadores</h2>
{#if error}<p class="error">{error}</p>{/if}

{#if resumen && tiempos}
  <div class="grid cols-4">
    <div class="card"><div class="stat">{resumen.total}</div><div class="stat-label">Total documentos</div></div>
    <div class="card"><div class="stat">{resumen.aprobadosMes}</div><div class="stat-label">Aprobados este mes</div></div>
    <div class="card"><div class="stat">{tiempos.diasPromedioAprobacion}</div><div class="stat-label">Dias promedio a aprobacion</div></div>
    <div class="card"><div class="stat">{tiempos.documentosAprobados}</div><div class="stat-label">Documentos aprobados (hist.)</div></div>
  </div>

  <div class="grid cols-2">
    <div class="card">
      <h3>Por estado</h3>
      <table>
        <thead><tr><th>Estado</th><th>Cantidad</th><th>%</th></tr></thead>
        <tbody>
          {#each Object.entries(resumen.porEstado) as [estado, n]}
            <tr>
              <td><span class="badge badge-{estado}">{ESTADO_LABEL[estado] || estado}</span></td>
              <td>{n}</td>
              <td class="muted">{resumen.total ? Math.round(n / resumen.total * 100) : 0}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h3>Por carrera</h3>
      <table>
        <thead><tr><th>Carrera</th><th>Documentos</th></tr></thead>
        <tbody>
          {#each Object.entries(resumen.porCarrera) as [carrera, n]}
            <tr><td>{carrera}</td><td>{n}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h3>Documentos por docente</h3>
    <table>
      <thead><tr><th>Docente</th><th>Documentos</th></tr></thead>
      <tbody>
        {#each Object.entries(resumen.porDocente) as [nombre, n]}
          <tr><td>{nombre}</td><td>{n}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="muted">Cargando reportes...</p>
{/if}
