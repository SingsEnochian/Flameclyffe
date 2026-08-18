const url = import.meta.env.VITE_SUPABASE_URL || 'https://rufrmjyusalnifpegllj.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_z69-aAbQvzFFDRk4SHDYrQ_FuqirkLD';

let clientPromise;

export function getKelyranSupabase() {
  if (!clientPromise) clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
  return clientPromise;
}

export async function kelyranAuthUser() {
  const client = await getKelyranSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user || null;
}

export async function requestKelyranMagicLink(email, redirectTo = globalThis.location?.href) {
  const address = String(email || '').trim();
  if (!address) throw new Error('Enter the email used for Flameclyffe.');
  const client = await getKelyranSupabase();
  const { error } = await client.auth.signInWithOtp({ email: address, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
  return address;
}

export async function signOutKelyran() {
  const client = await getKelyranSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
