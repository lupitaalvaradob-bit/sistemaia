<script>
  import { api } from '../lib/api.js';
  import { signInWithPassword, signInWithGoogle, signUpWithPassword, setPerfil } from '../lib/auth.js';

  export let onLogin;

  let mode = 'login'; // 'login' | 'registro'
  let nombre = '';
  let email = '';
  let password = '';
  let error = '';
  let notice = '';
  let loading = false;

  function switchMode(m) {
    mode = m;
    error = '';
    notice = '';
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    notice = '';
    loading = true;
    try {
      if (mode === 'registro') {
        const result = await signUpWithPassword(email, password, nombre);
        if (!result.session) {
          notice = 'Cuenta creada. Revisa tu correo para confirmar la cuenta y luego inicia sesion.';
          mode = 'login';
          return;
        }
      }
      await signInWithPassword(email, password);
      const perfil = await api.me();
      setPerfil(perfil);
      onLogin();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function google() {
    error = '';
    loading = true;
    try {
      await signInWithGoogle();
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }
</script>

<div class="login-wrap">
  <div class="card login-card">
    <h1>Sistema de Estadias</h1>
    <p class="muted" style="text-align:center">Administra, revisa y da seguimiento a las memorias de estadia</p>

    <div class="row" style="margin-bottom:1rem">
      <button
        type="button"
        class:secondary={mode !== 'login'}
        style="flex:1"
        on:click={() => switchMode('login')}
      >Iniciar sesion</button>
      <button
        type="button"
        class:secondary={mode !== 'registro'}
        style="flex:1"
        on:click={() => switchMode('registro')}
      >Crear cuenta</button>
    </div>

    <form on:submit={submit}>
      {#if mode === 'registro'}
        <label for="nombre">Nombre completo</label>
        <input id="nombre" type="text" bind:value={nombre} required placeholder="Juan Perez" />
      {/if}
      <label for="email">Correo electronico</label>
      <input id="email" type="email" bind:value={email} required placeholder="usuario@correo.com" />
      <label for="pass">Contrasena</label>
      <input id="pass" type="password" bind:value={password} required minlength="6" placeholder="Minimo 6 caracteres" />
      {#if error}<p class="error">{error}</p>{/if}
      {#if notice}<p class="muted">{notice}</p>{/if}
      <div style="margin-top:1rem">
        <button type="submit" disabled={loading} style="width:100%">
          {loading ? 'Procesando...' : mode === 'registro' ? 'Registrarme' : 'Ingresar'}
        </button>
      </div>
    </form>
    <div style="margin-top:.8rem">
      <button class="secondary" style="width:100%" on:click={google} disabled={loading}>
        Continuar con Google
      </button>
    </div>
    <p class="muted" style="margin-top:1rem">
      Demo: admin@demo.com / admin123 · docente@demo.com / docente123
    </p>
  </div>
</div>
