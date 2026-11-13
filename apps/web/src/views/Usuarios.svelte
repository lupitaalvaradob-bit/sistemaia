<script>
  import { onMount } from 'svelte';
  import { user } from '../lib/auth.js';
  import { api } from '../lib/api.js';

  let usuarios = [];
  let carreras = [];
  let error = '';
  let msg = '';

  let email = '', password = '', nombre = '', rol = 'docente', carreraId = '';
  let guardando = false;
  let mostrarForm = false;

  let editId = null;
  let editRol = 'docente';
  let editCarreraId = '';
  let editActivo = true;

  async function cargar() {
    try {
      [usuarios, carreras] = await Promise.all([api.usuarios(), api.carreras()]);
    } catch (e) { error = e.message; }
  }
  onMount(cargar);

  async function crear(e) {
    e.preventDefault();
    guardando = true; error = ''; msg = '';
    try {
      await api.registro({ email, password, nombre, rol, carrera_id: carreraId || null });
      msg = `Usuario ${email} creado`;
      email = password = nombre = ''; carreraId = '';
      mostrarForm = false;
      cargar();
    } catch (err) { error = err.message; }
    finally { guardando = false; }
  }

  function startEdit(u) {
    editId = u.id;
    editRol = u.rol;
    editCarreraId = u.carrera_id || '';
    editActivo = u.activo;
    error = ''; msg = '';
  }

  async function saveEdit(u) {
    error = ''; msg = '';
    try {
      await api.actualizarUsuario(u.id, {
        rol: editRol,
        carrera_id: editCarreraId || null,
        activo: editActivo
      });
      msg = `Usuario ${u.email} actualizado`;
      editId = null;
      cargar();
    } catch (err) { error = err.message; }
  }
</script>

<h2>Usuarios</h2>
{#if error}<p class="error">{error}</p>{/if}
{#if msg}<p style="color:var(--ok)">{msg}</p>{/if}

{#if $user?.rol === 'admin'}
  <div style="margin-bottom:1rem">
    <button on:click={() => { mostrarForm = !mostrarForm; error = ''; msg = ''; }}>
      {mostrarForm ? 'Cancelar' : 'Nuevo usuario'}
    </button>
  </div>
{/if}

{#if $user?.rol === 'admin' && mostrarForm}
  <div class="card" style="max-width:640px">
    <h3>Nuevo usuario</h3>
    <form on:submit={crear}>
      <div class="form-row">
        <div><label>Nombre</label><input bind:value={nombre} required /></div>
        <div><label>Email</label><input type="email" bind:value={email} required /></div>
      </div>
      <div class="form-row">
        <div><label>Contrasena</label><input type="password" bind:value={password} required minlength="6" /></div>
        <div>
          <label>Rol</label>
          <select bind:value={rol}>
            <option value="docente">Docente</option>
            <option value="revisor">Revisor</option>
            <option value="director">Director</option>
            <option value="estudiante">Estudiante</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <label>Carrera</label>
      <select bind:value={carreraId}>
        <option value="">— Sin carrera —</option>
        {#each carreras as c}<option value={c.id}>{c.nombre}</option>{/each}
      </select>
      <div style="margin-top:1rem"><button type="submit" disabled={guardando}>Crear usuario</button></div>
    </form>
  </div>
{/if}

<div class="card" style="padding:0">
  <table>
    <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Carrera</th><th>Estado</th>{#if $user?.rol === 'admin'}<th></th>{/if}</tr></thead>
    <tbody>
      {#each usuarios as u}
        {#if editId === u.id}
          <tr>
            <td>{u.nombre}</td>
            <td>{u.email}</td>
            <td>
              <select bind:value={editRol}>
                <option value="docente">Docente</option>
                <option value="revisor">Revisor</option>
                <option value="director">Director</option>
                <option value="estudiante">Estudiante</option>
                <option value="admin">Admin</option>
              </select>
            </td>
            <td>
              <select bind:value={editCarreraId}>
                <option value="">— Sin carrera —</option>
                {#each carreras as c}<option value={c.id}>{c.nombre}</option>{/each}
              </select>
            </td>
            <td>
              <label style="display:flex;align-items:center;gap:.4rem">
                <input type="checkbox" bind:checked={editActivo} /> Activo
              </label>
            </td>
            <td>
              <button on:click={() => saveEdit(u)}>Guardar</button>
              <button class="secondary" on:click={() => editId = null}>Cancelar</button>
            </td>
          </tr>
        {:else}
          <tr>
            <td>{u.nombre}</td>
            <td>{u.email}</td>
            <td><span class="badge badge-recibido">{u.rol}</span></td>
            <td class="muted">{u.carrera_id ? (carreras.find(c => c.id === u.carrera_id)?.nombre || '—') : '—'}</td>
            <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
            {#if $user?.rol === 'admin'}
              <td><button class="secondary" on:click={() => startEdit(u)}>Editar</button></td>
            {/if}
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
</div>
