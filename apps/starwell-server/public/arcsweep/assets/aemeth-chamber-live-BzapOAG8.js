import{n as e,t}from"./aemeth-lens-CxkHz0fS.js";import{a as n}from"./aemeth-oxalpha-transport-C9arOqL_.js";import{f as r,m as i}from"./house-runtime-COzjIIOZ.js";var a=`sloane-3188-geometry-v1`,o=Object.freeze({id:`sloane-ms-3188-sigillum-dei-aemeth-1582`,title:`Sigillum Dei Aemeth`,author:`John Dee`,date:`1582`,source:`British Museum / British Library, Sloane MS 3188`,publicReference:`https://commons.wikimedia.org/wiki/File:Sloane3188-john_dee.png`,rightsState:`public-domain`,geometryAuthority:`primary-manuscript witness`,geometryVersion:a,transcriptionState:`pending-manuscript-and-derived-name verification`,comparisonWitness:Object.freeze({title:`Enochian Magick Reference · Appendix A`,location:`private archive · PDF page 37 / printed page 33`,rightsState:`restricted`,publicAssetAllowed:!1,use:`private structural comparison only; no traced raster or modern typesetting committed`})}),s=Math.PI*2,c=e=>Number(e.toFixed(3));function l(e,t,n,r=-Math.PI/2,i=500){let a=r+s*t/n;return Object.freeze({x:c(i+e*Math.cos(a)),y:c(i+e*Math.sin(a))})}function u(e,t,n=-Math.PI/2){return Array.from({length:e},(r,i)=>l(t,i,e,n))}function d(e,t,n,r=-Math.PI/2){if(!Number.isInteger(e)||e<3)throw Error(`Star count must be an integer >= 3.`);if(!Number.isInteger(t)||t<1||t>=e)throw Error(`Star step must be between 1 and count - 1.`);let i=u(e,n,r),a=[],o=new Set,s=0;for(;!o.has(s);)o.add(s),a.push(i[s]),s=(s+t)%e;return a}var f=e=>e.map(({x:e,y:t})=>`${e},${t}`).join(` `);function p({count:e=40,innerRadius:t=402,outerRadius:n=474,rotation:r=-Math.PI/2}={}){return Array.from({length:e},(i,a)=>{let o=l(t,a,e,r),s=l(n,a,e,r);return`<line data-aemeth-sigil-sector="${a+1}" x1="${o.x}" y1="${o.y}" x2="${s.x}" y2="${s.y}" />`}).join(``)}function m({innerRadius:e,outerRadius:t,rotation:n=-Math.PI/2,className:r=``}){return Array.from({length:7},(i,a)=>{let o=l(e,a,7,n),s=l(t,a,7,n);return`<line class="${r}" data-aemeth-sevenfold-ray="${a+1}" x1="${o.x}" y1="${o.y}" x2="${s.x}" y2="${s.y}" />`}).join(``)}function h(){let e=-Math.PI/2;return Object.freeze({schema:`arcsweep.aemeth-sigil-geometry/v1`,id:`sigillum-dei-aemeth`,version:a,viewBox:`0 0 1000 1000`,witness:o,layers:Object.freeze([Object.freeze({id:`outer-boundary`,kind:`circle`,radius:474}),Object.freeze({id:`outer-annulus-midline`,kind:`circle`,radius:438}),Object.freeze({id:`outer-annulus-inner`,kind:`circle`,radius:402}),Object.freeze({id:`outer-annulus-sectors`,kind:`radial-grid`,count:40,rotation:e}),Object.freeze({id:`outer-heptagon`,kind:`regular-polygon`,count:7,radius:392,rotation:e}),Object.freeze({id:`great-heptagram`,kind:`star-polygon`,count:7,step:2,radius:382,rotation:e}),Object.freeze({id:`middle-heptagon`,kind:`regular-polygon`,count:7,radius:288,rotation:e}),Object.freeze({id:`middle-heptagram`,kind:`star-polygon`,count:7,step:2,radius:276,rotation:e}),Object.freeze({id:`inner-heptagon`,kind:`regular-polygon`,count:7,radius:202,rotation:e}),Object.freeze({id:`inner-sevenfold-rays`,kind:`radial-grid`,count:7,innerRadius:118,outerRadius:202,rotation:e}),Object.freeze({id:`central-heptagram`,kind:`star-polygon`,count:7,step:2,radius:136,rotation:e}),Object.freeze({id:`central-heptagon`,kind:`regular-polygon`,count:7,radius:83,rotation:e})]),inscriptions:Object.freeze({status:`pending-verification`,committed:!1,reason:`geometry is separated from manuscript/name transcription so modern private typesetting is never copied into the public vector`})})}function g({className:e=`aemeth-sigillum-svg`,title:t=`Sigillum Dei Aemeth · structural geometry`}={}){let n=h(),r=-Math.PI/2,i=u(7,392,r),a=d(7,2,382,r),o=u(7,288,r),s=d(7,2,276,r),c=u(7,202,r),l=d(7,2,136,r),g=u(7,83,r);return`<svg class="${e}" data-aemeth-sigillum="${n.version}" viewBox="${n.viewBox}" role="img" aria-label="${t}">
    <title>${t}</title>
    <g class="aemeth-sigil-layer aemeth-sigil-boundaries" data-aemeth-sigil-layer="outer-boundaries">
      <circle cx="500" cy="500" r="474" />
      <circle cx="500" cy="500" r="438" />
      <circle cx="500" cy="500" r="402" />
      ${p({count:40,innerRadius:402,outerRadius:474,rotation:r})}
    </g>
    <g class="aemeth-sigil-layer aemeth-sigil-sevenfold" data-aemeth-sigil-layer="outer-sevenfold">
      <polygon data-aemeth-sigil-shape="outer-heptagon" points="${f(i)}" />
      <polygon data-aemeth-sigil-shape="great-heptagram" points="${f(a)}" />
    </g>
    <g class="aemeth-sigil-layer aemeth-sigil-middle" data-aemeth-sigil-layer="middle-sevenfold">
      <polygon data-aemeth-sigil-shape="middle-heptagon" points="${f(o)}" />
      <polygon data-aemeth-sigil-shape="middle-heptagram" points="${f(s)}" />
    </g>
    <g class="aemeth-sigil-layer aemeth-sigil-inner" data-aemeth-sigil-layer="inner-sevenfold">
      <polygon data-aemeth-sigil-shape="inner-heptagon" points="${f(c)}" />
      ${m({innerRadius:118,outerRadius:202,rotation:r,className:`aemeth-sigil-inner-ray`})}
      <polygon data-aemeth-sigil-shape="central-heptagram" points="${f(l)}" />
      <polygon data-aemeth-sigil-shape="central-heptagon" points="${f(g)}" />
      <circle data-aemeth-sigil-shape="central-point" cx="500" cy="500" r="8" />
    </g>
  </svg>`}var _=`aemeth-chamber-live/v4`;function v(e){if(!e)return{};let t=Object.fromEntries(new FormData(e).entries());return Object.fromEntries(Object.entries(t).map(([e,t])=>[e,String(t??``)]))}function y(e={}){return Object.freeze({instrument:e.instrumentProfile||`Aemeth Lens v1 · digital chamber`,phase:e.phase||`Preparation`,diagram:e.activeDiagram||`Sigillum Dei Aemeth`,gaze:e.gazeMode||`Soft focus through`,ask:e.ask||`No Ask entered yet.`,observer:e.observerRole||`Observer`,orientation:e.orientation||`eye → sphere → embedded sigillum → depth`})}function b(e){let t=[e.provider,e.model,e.executionPath].filter(Boolean).join(` · `);return[`OA · ${e.createdAt||new Date().toISOString()} · ${e.status||`replied`}`,t,e.text||``].filter(Boolean).join(`
`)}function x(e,t){return[String(e||``).trim(),b(t)].filter(Boolean).join(`

---

`)}function S(e){return e.querySelector(`[data-aemeth-oa-status]`)}function C(e,t,n=`idle`){let r=S(e);r&&(r.textContent=t,r.dataset.state=n)}async function w(){return r()||await i()}async function T(e,{fetchImpl:t=fetch}={}){let r=await w(),i=v(e),a=await n({record:i,houseToken:r,houseFetchImpl:t,edgeFetchImpl:t}),o=e.querySelector(`[name="modelWitnessLog"]`);if(!o)throw Error(`Aemeth model witness lane is unavailable.`);return o.value=x(o.value,a),o.dispatchEvent(new Event(`input`,{bubbles:!0})),o.dispatchEvent(new Event(`change`,{bubbles:!0})),a}function E(e,t){return e.querySelector(`[name="${t}"]`)?.closest(`label`)||null}function D(e,t,n){for(let r of t){let t=E(e,r);t&&n.append(t)}}function O(e,t,n=``){let r=document.createElement(`section`);return r.className=`panel aemeth-field-panel ${n}`.trim(),r.innerHTML=`<div class="aemeth-panel-heading"><p class="eyebrow">${t}</p><h3>${e}</h3></div>`,r}function k(){let n=t.map(e=>`
    <button type="button" class="aemeth-atlas-item" data-aemeth-diagram="${e.label}" title="${e.family} · ${e.versionPolicy}">
      <span>${e.label}</span><small>${e.family}</small>
    </button>`).join(``),r=e.map(e=>`<button type="button" class="aemeth-phase" data-aemeth-phase="${e}">${e}</button>`).join(``);return`
    <section class="aemeth-chamber-stage" data-aemeth-stage>
      <header class="aemeth-stage-heading">
        <div><p class="eyebrow">Observer instrument · Aemeth Chamber</p><h2 data-aemeth-stage-title>Aemeth Shewstone</h2></div>
        <button type="button" class="quiet" data-aemeth-focus>Soft-focus chamber</button>
      </header>
      <div class="aemeth-stage-grid">
        <div class="aemeth-optic-column">
          <div class="aemeth-optic-field" aria-label="Digital shewstone stage">
            <div class="aemeth-axis aemeth-axis-horizontal" aria-hidden="true"></div>
            <div class="aemeth-axis aemeth-axis-vertical" aria-hidden="true"></div>
            <div class="aemeth-shewstone" aria-hidden="true">
              <div class="aemeth-shewstone-glint"></div>
              <div class="aemeth-seal-plane" data-aemeth-seal-plane>${g()}</div>
            </div>
            <div class="aemeth-optic-caption">
              <strong data-aemeth-diagram-label>Sigillum Dei Aemeth</strong>
              <span data-aemeth-vector-state>${o.source} · ${o.geometryVersion} · lettering pending</span>
            </div>
          </div>
          <div class="aemeth-readout">
            <div><small>Instrument</small><strong data-aemeth-instrument></strong></div>
            <div><small>Gaze</small><strong data-aemeth-gaze></strong></div>
            <div><small>Observer</small><strong data-aemeth-observer></strong></div>
            <div class="aemeth-readout-wide"><small>Axis / orientation</small><strong data-aemeth-orientation></strong></div>
          </div>
          <div class="aemeth-ask"><small>Current Ask</small><p data-aemeth-ask></p></div>
          <div class="aemeth-phase-rail" aria-label="Ritual phase">${r}</div>
        </div>
        <aside class="aemeth-atlas" aria-label="Enochian Seal Atlas">
          <div class="aemeth-panel-heading"><p class="eyebrow">Source-versioned geometry</p><h3>Seal Atlas</h3></div>
          <p class="muted">Selecting a diagram changes the chamber state. Historical variants remain separate witnesses; this rail does not flatten them into canon.</p>
          <div class="aemeth-atlas-list">${n}</div>
        </aside>
      </div>
    </section>`}function A(e,t=e.closest(`[data-aemeth-chamber-root]`)||document){let n=y(v(e)),r=(e,n)=>{let r=t.querySelector(e);r&&(r.textContent=n)};r(`[data-aemeth-instrument]`,n.instrument),r(`[data-aemeth-gaze]`,n.gaze),r(`[data-aemeth-observer]`,n.observer),r(`[data-aemeth-orientation]`,n.orientation),r(`[data-aemeth-ask]`,n.ask),r(`[data-aemeth-diagram-label]`,n.diagram);let i=n.diagram===`Sigillum Dei Aemeth`;return t.querySelector(`[data-aemeth-seal-plane]`)?.classList.toggle(`aemeth-seal-inactive`,!i),r(`[data-aemeth-vector-state]`,i?`${o.source} · ${o.geometryVersion} · lettering pending`:`vector witness not yet compiled for this diagram`),t.querySelectorAll(`[data-aemeth-phase]`).forEach(e=>e.classList.toggle(`active`,e.dataset.aemethPhase===n.phase)),t.querySelectorAll(`[data-aemeth-diagram]`).forEach(e=>e.classList.toggle(`active`,e.dataset.aemethDiagram===n.diagram)),n}function j(e,t){t.querySelectorAll(`[data-aemeth-diagram]`).forEach(t=>t.addEventListener(`click`,()=>{let n=e.querySelector(`[name="activeDiagram"]`);n&&(n.value=t.dataset.aemethDiagram,n.dispatchEvent(new Event(`change`,{bubbles:!0})))})),t.querySelectorAll(`[data-aemeth-phase]`).forEach(t=>t.addEventListener(`click`,()=>{let n=e.querySelector(`[name="phase"]`);n&&(n.value=t.dataset.aemethPhase,n.dispatchEvent(new Event(`change`,{bubbles:!0})))})),t.querySelector(`[data-aemeth-focus]`)?.addEventListener(`click`,()=>{let n=e.querySelector(`[name="gazeMode"]`);n&&(n.value=`Soft focus through`,n.dispatchEvent(new Event(`change`,{bubbles:!0}))),t.classList.toggle(`aemeth-soft-focus`)}),e.addEventListener(`input`,()=>A(e,t)),e.addEventListener(`change`,()=>A(e,t))}function M(e){if(e.querySelector(`[data-aemeth-field-grid]`))return;let t=document.createElement(`div`);t.className=`aemeth-field-grid`,t.dataset.aemethFieldGrid=`true`;let n=O(`Orientation`,`Departure / configuration`,`aemeth-setup-panel`);D(e,[`title`,`status`,`instrumentProfile`,`phase`,`ask`,`observerRole`,`orientation`,`gazeMode`],n);let r=O(`Transformation`,`Diagram / Call / state`,`aemeth-transformation-panel`);D(e,[`activeDiagram`,`activeCall`,`departurePremaqc`,`chamberConfiguration`,`transformationNotes`,`runaReceipt`],r);let i=O(`Clean Witness`,`Firsthand lane · interpretation locked away`,`aemeth-witness-panel`);D(e,[`witnessRaw`,`witnessTimestampNotes`],i);let a=O(`Model Witness`,`Separate invited participant lane`,`aemeth-model-panel`);D(e,[`modelParticipant`,`modelWitnessLog`],a);let o=O(`Interpretation & Replay`,`After witness / provenance`,`aemeth-interpretation-panel`);D(e,[`interpretation`,`sourceRefs`,`replayFingerprint`,`canonBoundary`,`notes`],o),t.append(n,r,i,a,o);let s=e.querySelector(`label`);s?s.before(t):e.prepend(t)}function N(e){if(!e||e.dataset.aemethLiveDecorator===`aemeth-chamber-live/v4`||(e.dataset.aemethLiveDecorator=_,!e.querySelector(`[name="modelWitnessLog"]`)))return;let t=e.closest(`article.panel`)||e.parentElement,n=t?.closest(`.split-layout`)||t||e;n.dataset.aemethChamberRoot=`true`,n.classList.add(`aemeth-chamber-root`),t?.classList.add(`aemeth-chamber-editor`),e.classList.add(`aemeth-chamber-form`),t?.querySelector(`[data-aemeth-stage]`)||t?.insertAdjacentHTML(`afterbegin`,k()),M(e);let r=document.createElement(`section`);r.className=`panel aemeth-oa-panel`,r.dataset.aemethOaPanel=`true`,r.innerHTML=`
    <div class="section-heading compact-heading">
      <div>
        <p class="eyebrow">Live model witness · separate lane</p>
        <h3>Ox Alpha · OA</h3>
      </div>
      <span class="muted">Hugging Face · GLM-5.3-Flash</span>
    </div>
    <p class="muted">OA receives the chamber configuration and Rowan-authored witness as a structured packet. OA's reply is stored as model interpretation; it never replaces firsthand witness or infers Qualia.</p>
    <div class="button-row">
      <button type="button" data-aemeth-invite-oa>Invite OA into this chamber state</button>
      <span class="muted" data-aemeth-oa-status data-state="idle">Uses the House route when present, with the signed-in Flameclyffe relay as a host-neutral fallback.</span>
    </div>`,e.querySelector(`.aemeth-model-panel`)?.insertAdjacentElement(`afterbegin`,r),r.querySelector(`[data-aemeth-invite-oa]`)?.addEventListener(`click`,async t=>{let n=t.currentTarget;n.disabled=!0,C(r,`OA is reading the chamber packet…`,`working`);try{let t=await T(e);C(r,`${t.displayName} replied · ${t.provider} · ${t.model} · ${t.executionPath||t.route}. Saving receipt…`,`success`);let n=e.querySelector(`button[type="submit"]`);n&&e.requestSubmit(n)}catch(e){C(r,`OA invitation stopped: ${e.message}`,`error`),n.disabled=!1}}),j(e,n),A(e,n)}function P(e=document){let t=()=>{let t=e.querySelector?.(`#record-form[data-room-id="aemeth-lens"]`);t&&N(t)};t();let n=e.querySelector?.(`#app`)||e.body||e.documentElement;if(!n||typeof MutationObserver>`u`)return null;let r=!1,i=new MutationObserver(()=>{r||(r=!0,queueMicrotask(()=>{r=!1,t()}))});return i.observe(n,{childList:!0,subtree:!0}),i}typeof document<`u`&&P(document);export{_ as AEMETH_LIVE_DECORATOR_VERSION,v as aemethRecordFromForm,y as aemethStageStateFromRecord,x as appendAemethModelWitness,b as formatAemethModelWitness,P as installAemethLiveDecorator,T as inviteOxAlphaFromAemethForm};