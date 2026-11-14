import { publishWatercolorActivity } from './watercolor-bridge.js';

export const INTEGRATED_VOYAGE_SCHEMA = 'wayglass.integrated-voyage/v0.1';

// All values below are explicitly synthetic, never FAA measurements.
// Repeated runs use stable fixtures so the WTL ledger is reproducible.
export function syntheticWayglassVoyage({includeFictionalMythience=false}={}) {
  const baseline={
    source_ref:'synthetic:wayglass-baseline:001',
    observed_at:'2026-11-13T23:58:00.000Z',
    kind:'simulation',network:{p95_ms:800,error_rate:0.20},
    intelligence:{success_rate:0.70},fallback_independent:true,
  };
  const candidate={
    source_ref:'synthetic:wayglass-candidate:001',
    observed_at:'2026-11-13T23:59:00.000Z',
    kind:'simulation',network:{p95_ms:480,error_rate:0.05},
    intelligence:{success_rate:0.85},fallback_independent:true,
  };
  return {
    scenario:{
      mode:'repair',
      seeds:{
        infrastructure:{queue_capacity:24,timeout_ms:1200},
        intelligence:{concurrency:4,context_tokens:2048},
      },
      observation:baseline,
      trial:{
        baseline,candidate,
        configuration:{
          infrastructure:{queue_capacity:20,timeout_ms:1450},
          intelligence:{concurrency:3,context_tokens:1792},
        },
      },
      decision:'defer',approval_ref:null,
      mythience_request:includeFictionalMythience ? {
        traveller_id:'fictional:fixture',origin_universe:'fictional:home',
        destination_universe:'fictional:garden',
        ability:{id:'pigment',origin_universe:'fictional:home',modality:'watercolour'},
        history:[],field:{
          intention:0.85,shifting:0.85,porosity:0.8,resonance:0.9,compatibility:0.9,
        },
        consent:{traveller:true,origin:true,destination:true},
        event_id:'synthetic:crossing:001',
      }:null,
    },
    continuity:{
      world_id:'wayglass:home',
      identity_declarations:[{
        participant_id:'house:steward',
        declaration:'Synthetic test context; the real principal is verified by the host',
      }],
      stop_point:'Return to the ship with Wyrdrune, Observer and sensory receipts intact',
      next_owner:'house:steward',
      unresolved_wonder_questions:[
        'Which infrastructure and intelligence changes survive a witnessed Return?',
      ],
      revoked_refs:[],
    },
    observer_sources:null,
  };
}

export async function runWayglassIntegratedVoyage(payload,{
  fetchImpl=globalThis.fetch,
  signal=null,
  paint=publishWatercolorActivity,
}={}) {
  if(typeof fetchImpl!=='function')throw new TypeError('Explicit voyage transport required');
  const response=await fetchImpl('/api/v1/wayglass/wyrdrune/integrated-voyage',{
    method:'POST',headers:{'Content-Type':'application/json'},
    cache:'no-store',signal,body:JSON.stringify(payload),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data.error||'Integrated voyage host unavailable').slice(0,240));
  if(data.schema!==INTEGRATED_VOYAGE_SCHEMA)throw new Error('Unrecognised integrated voyage source');
  if(data.status==='sandbox-return-verified'){
    if(data.return_verification?.verdict!=='accepted' || typeof data.receipt_id!=='string' ||
      data.watercolor_event?.kind!=='fold:witness' ||
      data.watercolor_event.receipt?.receipt_id!==data.receipt_id) {
      throw new Error('Integrated voyage receipt is incomplete; no watercolour activity emitted');
    }
    if(signal?.aborted)throw new Error('Feather: no visual carry after stop');
    // Only a visual receipt crosses into the browser. No raw private observations,
    // model outputs or simulated 'intelligence' are imported as lived experiences.
    paint({
      kind:data.watercolor_event.kind,
      actor:data.watercolor_event.actor,
      receipt:data.watercolor_event.receipt,
      intensity:data.watercolor_event.intensity,
    });
  }
  return data;
}
