export const VALA_STREAM_SCHEMA = 'arcsweep.vala-matrix-stream/v1';
export const VALA_WORK_PROJECT_REF = 'frqrxmshxftpylwdtsdm';
export const VALA_WORK_URL = import.meta.env.VITE_VALA_SUPABASE_URL || 'https://frqrxmshxftpylwdtsdm.supabase.co';
export const VALA_WORK_PUBLISHABLE_KEY = import.meta.env.VITE_VALA_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_B7btDOIu8stjc7rEGOdjTw_yWpgetll';

let clientPromise;

export function getValaSupabase() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(
      VALA_WORK_URL,
      VALA_WORK_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    ));
  }
  return clientPromise;
}

export function normaliseValaFrame(frame) {
  if (!frame || typeof frame !== 'object') return null;
  const id = Number(frame.id);
  const step = Number(frame.step);
  const timestamp = Number(frame.timestamp);
  if (!Number.isFinite(id) || !Number.isFinite(step) || !Number.isFinite(timestamp)) return null;
  return {
    schema: VALA_STREAM_SCHEMA,
    id,
    step,
    timestamp,
    created_at: frame.created_at || null,
    raw_coordinates: frame.raw_coordinates ?? null,
    projected_coordinates: frame.projected_coordinates ?? null,
  };
}

export function numericCoordinates(value) {
  const out = [];
  const visit = (node) => {
    if (typeof node === 'number' && Number.isFinite(node)) {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node && typeof node === 'object') Object.values(node).forEach(visit);
  };
  visit(value);
  return out;
}

export async function readLatestValaFrame() {
  const supabase = await getValaSupabase();
  const { data, error } = await supabase
    .from('matrix_stream')
    .select('*')
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw error;
  return normaliseValaFrame(data?.[0]);
}

export async function initializeValaStreamAdapter({ onFrame, onStatus, onError } = {}) {
  const supabase = await getValaSupabase();
  let closed = false;

  const emitError = (error) => {
    if (!closed) onError?.(error instanceof Error ? error : new Error(String(error || 'Unknown Vala stream error')));
  };

  try {
    const latest = await readLatestValaFrame();
    if (latest && !closed) onFrame?.(latest, { source: 'snapshot' });
  } catch (error) {
    emitError(error);
  }

  const channel = supabase
    .channel('arcsweep:vala-work:matrix-stream')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'matrix_stream' },
      (payload) => {
        const frame = normaliseValaFrame(payload?.new);
        if (frame && !closed) onFrame?.(frame, { source: 'realtime' });
      },
    )
    .subscribe((status, error) => {
      if (closed) return;
      onStatus?.(status);
      if (error) emitError(error);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        emitError(new Error(`Vala Work Realtime channel ${String(status).toLowerCase()}.`));
      }
    });

  return async function detachValaStream() {
    if (closed) return;
    closed = true;
    await supabase.removeChannel(channel);
  };
}
