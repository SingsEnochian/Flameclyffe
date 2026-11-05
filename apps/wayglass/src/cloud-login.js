import { createClient } from '@supabase/supabase-js';
import { configureWayglassCloudAuth } from './route-client.js';
const url = import.meta.env.VITE_WAYGLASS_SUPABASE_URL;
const key = import.meta.env.VITE_WAYGLASS_SUPABASE_PUBLISHABLE_KEY;
export function installWayglassCloudLogin(host = document.body) {
  if (!url || !key || !import.meta.env.VITE_WAYGLASS_CLOUD_FUNCTION_URL) return null;
  const client = createClient(url, key);
  configureWayglassCloudAuth(async () => (await client.auth.getSession()).data.session?.access_token || null);
  const panel = document.createElement('section');
  panel.className = 'wg-cloud-login glass-panel';
  panel.setAttribute('aria-label', 'Cloud access');
  panel.innerHTML = '<strong>Wayglass · Cloud Access</strong><span data-cloud-state role="status">Checking session…</span><form data-cloud-form><input type="email" name="email" required placeholder="Owner email" aria-label="Owner email"><button class="glass-chip" type="submit">Email sign-in link</button></form><button class="glass-chip" type="button" data-cloud-signout hidden>Sign out</button>';
  host.prepend(panel);
  const status = panel.querySelector('[data-cloud-state]');
  const form = panel.querySelector('[data-cloud-form]');
  const signout = panel.querySelector('[data-cloud-signout]');
  async function refresh() {
    const { data } = await client.auth.getUser();
    const signedIn = Boolean(data.user);
    status.textContent = signedIn ? 'Signed in · ' + data.user.email : 'Sign in to use hosted cognition';
    form.hidden = signedIn; signout.hidden = !signedIn;
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    status.textContent = error ? error.message : 'Check your email for the sign-in link';
  });
  signout.addEventListener('click', async () => { await client.auth.signOut(); await refresh(); });
  client.auth.onAuthStateChange(() => { void refresh(); });
  void refresh();
  return client;
}
