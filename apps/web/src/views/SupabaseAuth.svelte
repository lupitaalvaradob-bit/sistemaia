<script>
  import { supabase, sbUser } from '../lib/supabase.js';

  let email = '';
  let password = '';
  let error = '';
  let notice = '';
  let loading = false;

  async function run(fn) {
    error = '';
    notice = '';
    loading = true;
    try {
      await fn();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  const google = () => run(async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' }
    });
    if (err) throw err;
  });

  const signUp = () => run(async () => {
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) throw err;
    notice = data.session
      ? 'Cuenta creada e iniciada sesion.'
      : 'Cuenta creada. Revisa tu correo para confirmar la cuenta (si la confirmacion esta activada).';
  });

  const signIn = () => run(async () => {
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) throw err;
    notice = 'Sesion iniciada con email/password.';
  });

  const signOut = () => run(async () => {
    const { error: err } = await supabase.auth.signOut();
    if (err) throw err;
    notice = 'Sesion cerrada.';
  });
</script>

<div class="login-wrap">
  <div class="card login-card" style="width:560px;max-width:94vw">
    <h1>Supabase Auth (prueba)</h1>
    <p class="muted" style="text-align:center">
      Crea usuarios en <code>auth.users</code> con Google OAuth o email/password.
      Esta pantalla no usa el JWT propio del sistema.
    </p>

    {#if $sbUser}
      <div class="card" style="background:var(--panel-2)">
        <strong>Usuario autenticado en Supabase:</strong>
        <pre class="muted" style="white-space:pre-wrap;font-size:.75rem;margin:.6rem 0 0">{JSON.stringify($sbUser, null, 2)}</pre>
      </div>
      <button class="secondary" style="width:100%" on:click={signOut} disabled={loading}>Cerrar sesion Supabase</button>
    {:else}
      <button style="width:100%" on:click={google} disabled={loading}>
        {loading ? 'Redirigiendo...' : 'Continuar con Google'}
      </button>

      <div class="row spread" style="margin:1rem 0">
        <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
        <span class="muted">o con email</span>
        <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
      </div>

      <label for="sb-email">Correo electronico</label>
      <input id="sb-email" type="email" bind:value={email} placeholder="usuario@correo.com" />
      <label for="sb-pass">Contrasena</label>
      <input id="sb-pass" type="password" bind:value={password} placeholder="Minimo 6 caracteres" />

      <div class="row" style="margin-top:1rem">
        <button style="flex:1" on:click={signUp} disabled={loading || !email || !password}>Crear cuenta</button>
        <button class="secondary" style="flex:1" on:click={signIn} disabled={loading || !email || !password}>Iniciar sesion</button>
      </div>
    {/if}

    {#if error}<p class="error">{error}</p>{/if}
    {#if notice}<p class="muted">{notice}</p>{/if}

    <p class="muted" style="margin-top:1rem;text-align:center">
      <a href="#/login">Volver al login del sistema</a>
    </p>
  </div>
</div>
