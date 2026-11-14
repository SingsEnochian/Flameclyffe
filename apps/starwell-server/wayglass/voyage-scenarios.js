'use strict';

// Fixed, source-labelled demonstration scenarios. They are NOT live telemetry,
// FAA measurements, AI provider activity or autonomous production tuning.
// Their candidate configuration is checked by executable native Wyrdrune.
const SCHEMA='wayglass.first-voyage-scenario/v0.1';
const SEEDS=Object.freeze({
  infrastructure:Object.freeze({queue_capacity:24,timeout_ms:1200}),
  intelligence:Object.freeze({concurrency:4,context_tokens:2048}),
});
const SCENARIOS=Object.freeze({
  repair:Object.freeze({
    label:'Storm · shelter the system',
    baseline:Object.freeze({p95_ms:800,error_rate:.20,success_rate:.70}),
    candidate:Object.freeze({p95_ms:480,error_rate:.05,success_rate:.85}),
    configuration:Object.freeze({
      infrastructure:Object.freeze({queue_capacity:20,timeout_ms:1450}),
      intelligence:Object.freeze({concurrency:3,context_tokens:1792}),
    }),
  }),
  expand:Object.freeze({
    label:'Clear skies · make room to grow',
    baseline:Object.freeze({p95_ms:300,error_rate:.02,success_rate:.85}),
    candidate:Object.freeze({p95_ms:260,error_rate:.015,success_rate:.91}),
    configuration:Object.freeze({
      infrastructure:Object.freeze({queue_capacity:28,timeout_ms:1150}),
      intelligence:Object.freeze({concurrency:5,context_tokens:2176}),
    }),
  }),
});
function buildVoyageScenario({mode='repair',fictionConsent=false,principalId='house:steward',now=new Date()}={}){
  if(!Object.hasOwn(SCENARIOS,mode))throw new TypeError('Unknown demonstration scenario');
  if(typeof fictionConsent!=='boolean')throw new TypeError('Fictional crossing choice must be Boolean');
  if(principalId!=='house:steward')throw new TypeError('Scenario principal belongs to authenticated House only');
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new TypeError('Valid host clock required');
  const scenario=SCENARIOS[mode],time=now.getTime();
  const observation=(metrics,label,offset)=>({
    kind:'simulation',
    source_ref:'wayglass:demo:'+mode+':'+label+'/v1',
    observed_at:new Date(time+offset).toISOString(),
    network:{p95_ms:metrics.p95_ms,error_rate:metrics.error_rate},
    intelligence:{success_rate:metrics.success_rate},
    fallback_independent:true,
  });
  const baseline=observation(scenario.baseline,'before',0);
  const candidate=observation(scenario.candidate,'after',1);
  return {
    schema:SCHEMA,
    scenario_label:scenario.label,
    request:{
      world_id:'wayglass:ship:demonstration',
      next_owner:principalId,
      identity_declarations:[{
        participant_id:principalId,
        declaration:'House-authenticated caller controls this simulated demonstration',
      }],
      recorded_at:new Date(time+2).toISOString(),
      stop_point:'Owner inspects the simulated Wyrdrune proposal and decides whether to explore again.',
      coevolution:{
        seeds:SEEDS,mode,observation:baseline,
        trial:{baseline,candidate,configuration:scenario.configuration},
      },
      mythience:{
        request:{
          traveller_id:'traveller:demonstration',
          origin_universe:'universe:emberglass',
          destination_universe:'universe:opal-garden',
          ability:{id:'ability:refraction',origin_universe:'universe:emberglass',modality:'symbolic'},
          history:[],
          field:{intention:.9,shifting:.9,porosity:.9,resonance:.9,compatibility:.9},
          consent:{traveller:fictionConsent,origin:fictionConsent,destination:fictionConsent},
          event_id:'encounter:'+mode,
        },
      },
    },
    simulation_only:true,never_claims_real_world_measurement:true,
  };
}
module.exports={SCHEMA,SEEDS,SCENARIOS,buildVoyageScenario};
