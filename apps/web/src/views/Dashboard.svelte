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

<h2>Dashboard</h2>
{#if error}<p class="error">{error}</p>{/if}

{#if resumen}
  <div class="grid cols-4">
    <div class="card"><div class="stat">{resumen.total}</div><div class="stat-label">Documentos totales</div></div>
    <div class="card"><div class="stat">{resumen.aprobadosMes}</div><div class="stat-label">Aprobados este mes</div></div>
    <div class="card"><div class="stat">{tiempos?.diasPromedioAprobacion ?? '—'}</div><div class="stat-label">Dias promedio a aprobacion</div></div>
    <div class="card"><div class="stat">{Object.keys(resumen.porEstado).length}</div><div class="stat-label">Estados en uso</div></div>
  </div>

  <div class="grid cols-2">
    <div class="card">
      <h3>Documentos por estado</h3>
      <table>
        <tbody>
          {#each Object.entries(resumen.porEstado) as [estado, n]}
            <tr><td><span class="badge badge-{estado}">{ESTADO_LABEL[estado] || estado}</span></td><td style="text-align:right">{n}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h3>Documentos por carrera</h3>
      <table>
        <tbody>
          {#each Object.entries(resumen.porCarrera) as [carrera, n]}
            <tr><td>{carrera}</td><td style="text-align:right">{n}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{:else}
  <p class="muted">Cargando...</p>
{/if}
