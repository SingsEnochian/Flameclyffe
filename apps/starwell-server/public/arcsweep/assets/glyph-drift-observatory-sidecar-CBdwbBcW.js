import{d as e}from"./storage-DvVPqrEr.js";import{i as t,n,o as r,r as i,t as a}from"./glyph-continuity-19iksBhE.js";import{a as o,i as s,n as c,r as l}from"./glyph-continuity-state-2j6HcGOc.js";var u=`glyph.blind-return-context/v1`;function d(e,t){if(!e)throw Error(`GLYPH_BLIND_CONTEXT: ${t}`)}function f(e){if(!e||typeof e!=`object`||Object.isFrozen(e))return e;for(let t of Object.values(e))f(t);return Object.freeze(e)}function p({earthSeal:e,pairId:t=null}={}){return d(e?.schema===a,`a narrative seal is required`),d(e.side===`earth`,`the return context requires an Earth-side seal`),f({schema:u,schema_version:1,pair_id:t==null?null:String(t),earth:{seal_id:e.seal_id,content_hash:e.content_hash,sealed_at:e.sealed_at,character_count:e.character_count},allowed_context_fields:Object.freeze([`earth.seal_id`,`earth.content_hash`,`earth.sealed_at`,`earth.character_count`])})}var m=!1,h=!1;function g(e=``){return String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function _(){return!!document.querySelector(`.nav-button.active[data-room="deep-observer"]`)}function v(e){let t=e.worlds?.find(t=>t.id===e.activeWorldId)||e.worlds?.[0]||null;return{world:t,premaqc:t&&e.premaqcByWorld?.[t.id]||null}}function y(e,t){return(Array.isArray(e.records?.relationships)?e.records.relationships:[]).filter(e=>!e.worldId||e.worldId===t.id).map((e,n)=>({id:String(e.id||`relationship-${n+1}`),from:String(e.from||t.id),to:String(e.to||e.title||`relationship-${n+1}`),type:String(e.relationship||e.type||`relationship`),weight:1}))}function b(e,t){return e.heartbeats.filter(e=>e?.world_id===t&&e?.heartbeat?.signature)}function x(e,t){return[...b(e,t)].reverse()[0]||null}function S(e,t){return[...e.blindPairs].reverse().find(e=>e?.world_id===t&&!e?.comparison)||null}function C(e,t){return[...e.blindPairs].reverse().find(e=>e?.world_id===t&&e?.comparison)||null}function w(e){if(!e?.render?.points?.length)return`<div class="glyph-empty">No glyph heartbeat yet.</div>`;let t=e.render.points,n=t.map(e=>`<line x1="128" y1="128" x2="${e.x}" y2="${e.y}" />`).join(``),r=t.map(e=>`<g><circle cx="${e.x}" cy="${e.y}" r="4" /><text x="${e.x}" y="${e.y-9}" text-anchor="middle">${g(e.axis)}</text></g>`).join(``),i=e.render.phase_marker?`<line class="phase" x1="128" y1="128" x2="${e.render.phase_marker.x}" y2="${e.render.phase_marker.y}" /><circle class="phase" cx="${e.render.phase_marker.x}" cy="${e.render.phase_marker.y}" r="5" />`:``;return`<svg class="glyph-continuity-svg" viewBox="0 0 256 256" role="img" aria-label="Deterministic Glyph Continuity signature">
    <circle class="ring" cx="128" cy="128" r="112" />
    <circle class="ring inner" cx="128" cy="128" r="56" />
    <g class="spokes">${n}</g>
    <polygon points="${g(e.render.polygon)}" />
    <g class="nodes">${r}</g>
    ${i}
  </svg>`}function T(e){if(!e)return`<p class="muted">No drift receipt yet.</p>`;if(!e.metrics)return`<p class="muted">${e.history_count}/${e.settings.minimum_history} prior heartbeats available. The first continuity envelope is still forming.</p>`;let t=e.metrics;return`<dl class="facts glyph-drift-facts">
    <div><dt>Structural Δ</dt><dd>${Number(t.structural_distance).toFixed(4)}</dd></div>
    <div><dt>Semantic Δ</dt><dd>${Number(t.semantic_distance).toFixed(4)}</dd></div>
    <div><dt>Envelope</dt><dd>${Number(t.robust_envelope).toFixed(4)}</dd></div>
    <div><dt>Trend slope</dt><dd>${Number(t.trend_slope).toFixed(4)}</dd></div>
    <div><dt>Reference Δ</dt><dd>${Number(t.reference_distance).toFixed(4)}</dd></div>
    <div><dt>Topology Δ</dt><dd>${Number(t.topology_distance).toFixed(4)}</dd></div>
  </dl>`}function E(e,t){let n=b(e,t).slice(-12).reverse();return n.length?`<ol class="glyph-heartbeat-history">${n.map(e=>`<li><b>${g(e.drift?.classification||`UNCLASSIFIED`)}</b> · ${g(e.heartbeat.observed_at)} · <code>${g(e.heartbeat.signature.signature_id)}</code></li>`).join(``)}</ol>`:`<p class="muted">No glyph heartbeats receipted for this world yet.</p>`}function D(e){let t=e?.comparison;return t?`<div class="glyph-blind-result">
    <p><b>Blind comparison receipted.</b> Both narrative hashes were sealed before reveal.</p>
    <dl class="facts">
      <div><dt>Lexical overlap</dt><dd>${Number(t.metrics.lexical_jaccard).toFixed(3)}</dd></div>
      <div><dt>Length ratio</dt><dd>${Number(t.metrics.length_ratio).toFixed(3)}</dd></div>
      <div><dt>Earth tokens</dt><dd>${t.metrics.earth_token_count}</dd></div>
      <div><dt>Return tokens</dt><dd>${t.metrics.return_token_count}</dd></div>
    </dl>
    <div class="grid two compact-grid">
      <article><p class="eyebrow">Earth narrative · revealed</p><p>${g(e.earth.text)}</p></article>
      <article><p class="eyebrow">Return narrative · revealed</p><p>${g(e.return.text)}</p></article>
    </div>
    <details><summary>Comparison receipt</summary><pre>${g(JSON.stringify(t,null,2))}</pre></details>
  </div>`:``}function O(e,t){let n=S(e,t),r=C(e,t);return n?n.return?.seal?`<div class="glyph-blind-stage">
    <p class="callout"><b>Both sides sealed.</b> Reveal gate is open.</p>
    <dl class="facts">
      <div><dt>Earth hash</dt><dd><code>${g(n.earth.seal.content_hash)}</code></dd></div>
      <div><dt>Return hash</dt><dd><code>${g(n.return.seal.content_hash)}</code></dd></div>
    </dl>
    <p class="muted">Reveal verifies both hashes before comparing the sealed texts.</p>
    <button type="button" data-glyph-reveal>Reveal and compare sealed narratives</button>
  </div>`:`<div class="glyph-blind-stage">
      <p class="callout"><b>Earth side sealed.</b> <code>${g(n.earth.seal.content_hash)}</code></p>
      <p class="muted">Return-side context contains only: ${g(n.return_context.allowed_context_fields.join(`, `))}. Earth prose remains withheld.</p>
      <form data-glyph-return-seal class="stack compact-stack">
        <label>Independent return narrative<textarea name="returnText" rows="5" required placeholder="Record the return before reveal."></textarea></label>
        <button type="submit">Seal return narrative</button>
      </form>
    </div>`:`<div class="glyph-blind-stage">
      <p class="muted">Seal the Earth-side narrative first. The return stage receives only the seal metadata and hash, never the Earth prose.</p>
      <form data-glyph-earth-seal class="stack compact-stack">
        <label>Earth-side observation narrative<textarea name="earthText" rows="5" required placeholder="Record the first side exactly as observed."></textarea></label>
        <button type="submit">Seal Earth narrative</button>
      </form>
      ${D(r)}
    </div>`}async function k(t=``){let n=await e(),r=s(n),{world:i,premaqc:a}=v(n);if(!i)return``;let o=x(r,i.id),c=o?.heartbeat?.signature||null,l=o?.drift||null,u=l?.classification||`NO_HEARTBEAT`,d=l?.review_required?` · REVIEW REQUIRED`:l?.review_recommended?` · REVIEW RECOMMENDED`:``,f=a?.receipt_id||a?.id||null;return`<section class="panel glyph-drift-observatory" data-glyph-drift-observatory>
    <div class="section-heading compact-heading"><div>
      <p class="eyebrow">Observer heartbeat · Living Glyph</p>
      <h2>Glyph Drift Observatory</h2>
      <p class="muted">PREMAQC becomes a deterministic glyph signature. Heartbeats establish a continuity envelope; structural, semantic, topology and directional movement remain separately receipted.</p>
    </div></div>
    ${t?`<p class="callout">${g(t)}</p>`:``}
    <div class="grid two glyph-observatory-grid">
      <article class="glyph-stage">
        ${w(c)}
        <p class="glyph-classification"><b>${g(u)}</b>${g(d)}</p>
        ${c?`<p class="muted"><code>${g(c.signature_id)}</code></p>`:``}
        ${T(l)}
        <button type="button" data-glyph-heartbeat ${a?.state?``:`disabled`}>Receipt glyph heartbeat</button>
        <p class="muted">${f?`Current PREMAQC source: ${g(f)}`:`No receipted PREMAQC state is available for this world yet.`}</p>
      </article>
      <article>
        <p class="eyebrow">Continuity wake</p><h3>Recent heartbeats</h3>
        ${E(r,i.id)}
      </article>
    </div>
    <details class="glyph-blind-comparison" open>
      <summary>Blinded paired narrative comparison</summary>
      ${O(r,i.id)}
    </details>
  </section>`}function A(){if(document.querySelector(`#glyph-drift-observatory-style`))return;let e=document.createElement(`style`);e.id=`glyph-drift-observatory-style`,e.textContent=`
    .glyph-drift-observatory{margin-top:1rem}.glyph-observatory-grid{align-items:start}.glyph-stage{text-align:center}.glyph-continuity-svg{width:min(100%,360px);aspect-ratio:1;margin:0 auto;overflow:visible}.glyph-continuity-svg .ring{fill:none;stroke:color-mix(in srgb,var(--green) 22%,transparent);stroke-width:1.5}.glyph-continuity-svg .ring.inner{stroke-dasharray:4 7}.glyph-continuity-svg .spokes line{stroke:color-mix(in srgb,var(--green) 34%,transparent);stroke-width:1}.glyph-continuity-svg polygon{fill:color-mix(in srgb,var(--gold) 14%,transparent);stroke:var(--gold);stroke-width:3;stroke-linejoin:round}.glyph-continuity-svg .nodes circle{fill:var(--panel-solid);stroke:var(--green);stroke-width:2}.glyph-continuity-svg text{fill:var(--text);font-size:11px;font-weight:700}.glyph-continuity-svg .phase{stroke:var(--green);fill:var(--green);stroke-width:2}.glyph-classification{font-size:1.05rem;letter-spacing:.04em}.glyph-drift-facts{text-align:left}.glyph-heartbeat-history{max-height:26rem;overflow:auto;padding-left:1.4rem}.glyph-heartbeat-history li{margin:.45rem 0;word-break:break-word}.glyph-empty{min-height:220px;display:grid;place-items:center;border:1px dashed color-mix(in srgb,var(--green) 32%,transparent);border-radius:16px}.glyph-blind-comparison{margin-top:1rem;padding-top:1rem;border-top:1px solid color-mix(in srgb,var(--gold) 24%,transparent)}.glyph-blind-comparison>summary{cursor:pointer;font-weight:700;font-size:1.05rem}.glyph-blind-stage{margin-top:1rem}.glyph-blind-stage code{word-break:break-all}.glyph-blind-result{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--green) 28%,transparent);border-radius:12px}.glyph-blind-result pre{max-height:24rem;overflow:auto;white-space:pre-wrap}
  `,document.head.appendChild(e)}async function j(e=``){if(!_())return;let t=document.querySelector(`main.content`);if(!t)return;let n=await k(e),r=document.querySelector(`[data-glyph-drift-observatory]`);r?r.outerHTML=n:t.insertAdjacentHTML(`beforeend`,n)}async function M(){if(!(m||!_()||document.querySelector(`[data-glyph-drift-observatory]`))&&document.querySelector(`main.content`)){m=!0;try{A(),await j()}catch(e){console.warn(`Glyph Drift Observatory could not mount:`,e)}finally{m=!1}}}document.addEventListener(`click`,async r=>{if(h)return;let a=r.target.closest(`[data-glyph-heartbeat]`);if(a){h=!0,a.disabled=!0;try{let r=await e(),i=s(r),{world:a,premaqc:c}=v(r);if(!a||!c?.state)throw Error(`A receipted PREMAQC state is required for a glyph heartbeat.`);let u=b(i,a.id),d=await t({world:a,premaqc:c,relationships:y(r,a),confidence:c.confidence??1,phase:c.phase??null}),f=await n({history:u.map(e=>e.heartbeat),current:d});l(i,{schema:`glyph.continuity-entry/v1`,world_id:a.id,heartbeat:d,drift:f}),await o(i,{reason:`glyph-continuity-heartbeat`,heartbeat_id:d.heartbeat_id}),await j(`${f.classification} · ${d.signature.signature_id}`)}catch(e){await j(`Glyph heartbeat stopped: ${e.message}`)}finally{h=!1}return}let c=r.target.closest(`[data-glyph-reveal]`);if(c){h=!0,c.disabled=!0;try{let t=await e(),n=s(t),{world:r}=v(t),a=S(n,r?.id);if(!a?.earth?.seal||!a?.return?.seal)throw Error(`Both narrative seals are required before reveal.`);a.comparison=await i({earthSeal:a.earth.seal,earthText:a.earth.text,returnSeal:a.return.seal,returnText:a.return.text}),a.revealed_at=a.comparison.compared_at,await o(n,{reason:`glyph-blind-comparison-reveal`,comparison_id:a.comparison.comparison_id}),await j(`Blind comparison receipted: ${a.comparison.comparison_id}`)}catch(e){await j(`Blind comparison stopped: ${e.message}`)}finally{h=!1}}},!0),document.addEventListener(`submit`,async t=>{if(h)return;let n=t.target.closest(`[data-glyph-earth-seal]`),i=t.target.closest(`[data-glyph-return-seal]`);if(n||i){t.preventDefault(),h=!0;try{let t=await e(),a=s(t),{world:l}=v(t);if(!l)throw Error(`An active world is required.`);if(n){let e=String(new FormData(n).get(`earthText`)||``),t=await r({side:`earth`,text:e,source:`observer-earth`}),i=`glyph-blind-pair-${t.fingerprint.slice(0,24)}`,s=p({earthSeal:t,pairId:i});c(a,{schema:`glyph.blind-pair/v1`,pair_id:i,world_id:l.id,created_at:t.sealed_at,earth:{seal:t,text:e},return:null,return_context:s,comparison:null}),await o(a,{reason:`glyph-blind-earth-seal`,pair_id:i}),await j(`Earth narrative sealed: ${t.seal_id}`);return}let u=S(a,l.id);if(!u?.earth?.seal)throw Error(`Seal the Earth narrative first.`);let d=String(new FormData(i).get(`returnText`)||``),f=await r({side:`return`,text:d,source:`observer-return`});u.return={seal:f,text:d},await o(a,{reason:`glyph-blind-return-seal`,pair_id:u.pair_id}),await j(`Return narrative sealed: ${f.seal_id}. Reveal gate open.`)}catch(e){await j(`Blind pair stopped: ${e.message}`)}finally{h=!1}}},!0),new MutationObserver(()=>{M()}).observe(document.documentElement,{childList:!0,subtree:!0}),window.addEventListener(`arcsweep:glyph-continuity-updated`,()=>{_()&&j()}),document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,()=>{M()},{once:!0}):M();