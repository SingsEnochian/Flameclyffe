import{t as e}from"./kelyran-supabase-CCbCuzyl.js";import{t}from"./creative-organ-registry-h1zL6MIM.js";import{r as n,t as r}from"./organ-launch-route-Ba0II6K_.js";import{a as i,i as a,n as o,r as s}from"./aemeth-lens-CxkHz0fS.js";var c=`arcsweep.echo-index/v1`,l=Object.freeze([[`world`,`worlds`,`world-registry`],[`script`,`scripts`,`canon-studio`],[`record`,`records`,`records-room`],[`continuity`,`continuity`,`continuity`],[`manifestation`,`manifestations`,`continuity`],[`feedback`,`feedbackCycles`,`feedback-ledger`]]);function u(e){return e==null?``:typeof e==`string`||typeof e==`number`||typeof e==`boolean`?String(e):Array.isArray(e)?e.map(u).join(` `):typeof e==`object`?Object.entries(e).map(([e,t])=>`${e} ${u(t)}`).join(` `):``}function d(e,t=[]){if(!e||typeof e!=`object`)return[];let n=[];for(let[r,i]of Object.entries(e))Array.isArray(i)?i.forEach((e,i)=>n.push({item:e,path:[...t,r,i]})):i&&typeof i==`object`&&n.push(...d(i,[...t,r]));return n}function f(e,t){return e===`script`?t?.status?.toLowerCase?.().includes(`canon`)?`canon-candidate`:`authored-draft`:e===`world`?`world-registry`:e===`record`?t?.canonCarry?`canon-carry`:`record`:e===`continuity`||e===`manifestation`?`continuity-evidence`:e===`feedback`?`review-evidence`:`descriptive`}function p(e,t,n,r,i={}){let a=n?.id||n?.key||`${e}-${r}`,o=n?.name||n?.title||n?.label||n?.kind||a;return Object.freeze({schema:c,kind:e,store:t,id:String(a),label:String(o),world_id:n?.worldId||n?.world_id||null,authority_class:i.authority_class||f(e,n),provenance:i.provenance||n?.provenance||null,path:i.path||null,searchable:u(n).toLowerCase(),raw:n})}function ee(e={},t=[]){let n=[];for(let[t,r,i]of l)r===`records`?d(e.records).forEach(({item:e,path:r},a)=>n.push(p(t,i,e,a,{path:r}))):(Array.isArray(e[r])?e[r]:[]).forEach((e,r)=>n.push(p(t,i,e,r)));let r=e?.observatory?.deep_time_records;Array.isArray(r)&&r.forEach((e,t)=>n.push(p(`deep-time`,`observer/deep-time`,e,t,{authority_class:`reviewed-temporal-evidence`})));for(let e of t||[]){if(!e||typeof e!=`object`)continue;let t=e.kind||`external`,r=e.store||`external-adapter`;n.push(p(t,r,e.raw||e,n.length,{authority_class:e.authority_class||`external-descriptive`,provenance:e.provenance||null,path:e.path||null}))}return Object.freeze(n)}function te(e,t,n={}){let r=String(t||``).trim().toLowerCase(),i=Math.max(1,Math.min(Number(n.limit||80),250)),a=ee(e,n.externalEntries||[]);if(!r)return a.slice(0,i);let o=r.split(/\s+/).filter(Boolean);return a.map(e=>({row:e,score:o.reduce((t,n)=>t+ +!!e.searchable.includes(n),0)})).filter(({score:e})=>e>0).sort((e,t)=>t.score-e.score||e.row.label.localeCompare(t.row.label)).slice(0,i).map(({row:e})=>e)}var ne=`arcsweep.echo-live-adapters/v1`,re=`https://rufrmjyusalnifpegllj.supabase.co/functions/v1/arcsweep-runtime-receipt`;function m(e,t,n,r,i=null){return{kind:e,store:t,raw:n,authority_class:r,provenance:i}}function ie(e={}){return Object.entries(e||{}).flatMap(([e,t])=>(Array.isArray(t)?t:[]).map(t=>({...t,echo_room_id:e})))}function ae(e={}){let t=[];return(e.worlds||[]).forEach(e=>t.push(m(`world`,`world-registry/live`,e,`world-registry`))),(e.scripts||[]).forEach(e=>t.push(m(`script`,`canon-studio/live`,e,e?.status?.toLowerCase?.().includes(`canon`)?`canon-candidate`:`authored-draft`))),ie(e.records).forEach(e=>t.push(m(`record`,`records-room/live`,e,e?.canonCarry?`canon-carry`:`record`))),(e.ingests||e.nonCanonIngests||[]).forEach(e=>t.push(m(`source`,`source-library/live`,e,`source-evidence`))),(e.observatory?.deep_time_records||[]).forEach(e=>t.push(m(`deep-time`,`deep-time/live`,e,`reviewed-temporal-evidence`))),(e.math_spine_packets||e.mathSpinePackets||[]).forEach(e=>t.push(m(`math-spine`,`math-spine/live`,e,`derived-mathematical-receipt`))),(e.worldHydrationReceipts||[]).forEach(e=>t.push(m(`world-hydration`,`world-registry/hydration-receipts`,e,`migration-receipt`))),t}async function oe(t=fetch){try{let{data:n}=await(await e()).auth.getSession(),r=n?.session?.access_token;if(!r)return[];let i=await t(re,{headers:{authorization:`Bearer ${r}`},cache:`no-store`});if(!i.ok)return[];let a=await i.json().catch(()=>({}));return(Array.isArray(a.events)?a.events:[]).filter(e=>e?.event_type===`model-reply-receipted`).map(e=>m(`runtime-receipt`,`runtime-braid/live`,e,`runtime-attestation`))}catch{return[]}}async function se({state:e=null,fetchImpl:t=fetch}={}){let n=e||await Z(),[r]=await Promise.all([oe(t)]);return[...ae(n),...r]}function ce(){return globalThis.__arcsweepEchoIndexSources=()=>se(),globalThis.dispatchEvent?.(new CustomEvent(`arcsweep:echo-live-adapters-ready`,{detail:{schema:ne}})),!0}var le=`arcsweep.echo-index-surface/v2`,h=null;ce();function ue(){let e=globalThis.__arcsweepEchoIndexSources;return typeof e==`function`?Promise.resolve(e()).then(e=>Array.isArray(e)?e:[]).catch(()=>[]):Promise.resolve([])}function de(){if(document.querySelector(`#app [data-room="echo-index"]`))return;let e=document.querySelector(`#app [data-room="worlds"]`);if(!e?.parentElement)return;let t=document.createElement(e.tagName.toLowerCase());t.tagName===`BUTTON`&&(t.type=`button`),t.className=e.className,t.dataset.room=`echo-index`,t.dataset.echoIndexLauncher=`true`,t.setAttribute(`aria-label`,`Open Echo Index resolver`),t.innerHTML=`<span aria-hidden="true">⌕</span><span>Echo Index</span>`,e.insertAdjacentElement(`afterend`,t)}function fe(){let e=document.querySelector(`[data-echo-index-dialog]`);return e||(e=document.createElement(`dialog`),e.dataset.echoIndexDialog=`true`,e.className=`panel`,e.innerHTML=`
    <form method="dialog" style="display:flex;justify-content:space-between;gap:1rem;align-items:center">
      <div><strong>Echo Index</strong><div class="muted">Resolver across live ArcSweep stores. Source, authority and store remain visible; no duplicate canon database.</div></div>
      <button value="cancel" aria-label="Close Echo Index">Close</button>
    </form>
    <label style="display:grid;gap:.35rem;margin-top:1rem">Resolve
      <input data-echo-index-query type="search" placeholder="world, character, place, record, source, receipt…" autocomplete="off">
    </label>
    <p class="muted" data-echo-index-status>Loading persisted and live stores…</p>
    <div data-echo-index-results style="display:grid;gap:.65rem;max-height:55vh;overflow:auto"></div>`,document.body.appendChild(e),e)}function pe(e,t){if(e.replaceChildren(),!t.length){let t=document.createElement(`p`);t.className=`muted`,t.textContent=`No echoes resolve from the currently available stores.`,e.appendChild(t)}else for(let n of t){let t=document.createElement(`article`);t.className=`callout`;let r=document.createElement(`strong`);r.textContent=n.label;let i=document.createElement(`div`);if(i.className=`muted`,i.textContent=`${n.kind} · ${n.store} · ${n.id} · authority: ${n.authority_class}`,t.append(r,i),n.world_id){let e=document.createElement(`div`);e.className=`muted`,e.textContent=`world: ${n.world_id}`,t.appendChild(e)}if(n.path){let e=document.createElement(`div`);e.className=`muted`,e.textContent=`path: ${n.path.join(` › `)}`,t.appendChild(e)}e.appendChild(t)}}async function me(){let e=fe(),t=e.querySelector(`[data-echo-index-query]`),n=e.querySelector(`[data-echo-index-status]`),r=e.querySelector(`[data-echo-index-results]`),[i,a]=await Promise.all([Z(),ue()]),o=[...new Set(a.map(e=>e.store).filter(Boolean))],s=()=>{let e=te(i,t.value,{externalEntries:a});n.textContent=`${e.length} resolved echo${e.length===1?``:`es`} · ${o.length} live adapter store${o.length===1?``:`s`} · authority remains visible`,pe(r,e)};t.oninput=s,s(),e.open||e.showModal(),queueMicrotask(()=>t.focus())}typeof document<`u`&&(document.addEventListener(`click`,e=>{e.target?.closest?.(`#app [data-room="echo-index"]`)&&(e.preventDefault(),e.stopImmediatePropagation(),me())},!0),de(),h=new MutationObserver(de),h.observe(document.body,{childList:!0,subtree:!0}),globalThis.addEventListener?.(`beforeunload`,()=>h?.disconnect(),{once:!0}),globalThis.dispatchEvent?.(new CustomEvent(`arcsweep:echo-index-ready`,{detail:{schema:le}})));var he=[{id:`portal`,label:`Portal`,glyph:`◉`,category:`core`,defaultVisible:!0},{id:`code-loom`,label:`Rarity’s Code Loom`,glyph:`💠`,category:`creative-instrument`,defaultVisible:!0,pagesHref:`/Flameclyffe/apps/arcsweep/code-loom/`,webHref:`/arcsweep/code-loom/`,description:`Atelier for provenance, original code, test evidence and proposed agent handoffs.`},{id:`pilot-deck`,label:`Wayglass Pilot Deck`,glyph:`✧`,category:`ship`,defaultVisible:!0,pagesHref:`/Flameclyffe/apps/arcsweep/pilot-deck/`,webHref:`/arcsweep/pilot-deck/`,description:`Paired Rowan/Rarity ship stations and recoverable flight planning; distinct from active React-ion Helm authority.`},{id:`harmonic-keyboard`,label:`Wayglass Harmonic Keyboard`,glyph:`♫`,category:`sound`,defaultVisible:!0,pagesHref:`/Flameclyffe/apps/arcsweep/harmonic-keyboard/`,webHref:`/arcsweep/harmonic-keyboard/`,description:`Playable world-root chromatic, text-to-tone glyph and Kelyran Galdr note maps, using the shared ArcSweep StorySoundscape audio engine.`},{id:`worlds`,label:`World Registry`,glyph:`✧`,category:`core`,defaultVisible:!0},{id:`canonical-spine`,label:`Canonical Spine`,glyph:`⌘`,category:`core`,defaultVisible:!0,pagesHref:`/Flameclyffe/apps/arcsweep/spine/`,webHref:`/arcsweep/spine/`},{id:`ancestry`,label:`Ancestral Reader`,glyph:`↟`,category:`continuity`,defaultVisible:!0,pagesHref:`/Flameclyffe/apps/arcsweep/ancestry/`,webHref:`/arcsweep/ancestry/`},{id:`relational-reader`,label:`Relational Reader`,glyph:`≠`,category:`relationships`,defaultVisible:!0,pagesHref:`/Flameclyffe/apps/arcsweep/relations/`,webHref:`/arcsweep/relations/`},{id:`about-world`,label:`About this World`,glyph:`ⓘ`,category:`core`,defaultVisible:!0},{id:`summon`,label:`Summon`,glyph:`⌁`,category:`interface`,defaultVisible:!0},{id:`veil-mode`,label:`Veil Mode`,glyph:`◌`,category:`interface`,defaultVisible:!0},{id:`time`,label:`World Clock`,glyph:`◷`,category:`core`,defaultVisible:!0},{id:`arrival`,label:`Arrival Context`,glyph:`⌖`,category:`continuity`,defaultVisible:!0},{id:`timeline`,label:`Timeline`,glyph:`⌁`,category:`core`,defaultVisible:!0},{id:`scripts`,label:`Canon Studio`,glyph:`⌬`,category:`worldseed`,defaultVisible:!0},{id:`records`,label:`Records Room`,glyph:`▥`,category:`writing`,defaultVisible:!0},{id:`seedhouse`,label:`Seedhouse`,glyph:`✤`,category:`worldseed`,defaultVisible:!0},{id:`kelyran-school`,label:`Kelyran School`,glyph:`ᚲ`,category:`language`,defaultVisible:!0},{id:`ingest`,label:`Non-Canon Ingest`,glyph:`⇣`,category:`evidence`,defaultVisible:!0},{id:`aemeth-lens`,label:`Aemeth Lens`,glyph:`⊚`,category:`observation`,defaultVisible:!0},{id:`identity`,label:`About Me`,glyph:`◇`,category:`world`,defaultVisible:!0},{id:`competencies`,label:`World Competencies`,glyph:`✣`,category:`world`,defaultVisible:!0},{id:`safety-weave`,label:`Safety Weave`,glyph:`⌘`,category:`continuity`,defaultVisible:!0},{id:`continuity-recall`,label:`Replay`,glyph:`↻`,category:`worldseed`,defaultVisible:!0},{id:`companion`,label:`Companion Interface`,glyph:`✦`,category:`relationships`,defaultVisible:!1},{id:`relationships`,label:`Relationships`,glyph:`✧`,category:`world`,defaultVisible:!0},{id:`scenarios`,label:`Scenarios`,glyph:`▣`,category:`world`,defaultVisible:!0},{id:`calendar`,label:`Calendar`,glyph:`▦`,category:`world`,defaultVisible:!0},{id:`diary`,label:`Diary`,glyph:`✎`,category:`world`,defaultVisible:!0},{id:`playlists`,label:`Playlists`,glyph:`♫`,category:`assets`,defaultVisible:!0},{id:`visualisations`,label:`Visualisations`,glyph:`▧`,category:`assets`,defaultVisible:!0},{id:`appearance`,label:`Appearance`,glyph:`◇`,category:`embodiment`,defaultVisible:!0},{id:`wardrobe`,label:`Wardrobe`,glyph:`♙`,category:`embodiment`,defaultVisible:!1},{id:`outfits`,label:`Outfits`,glyph:`⌂`,category:`embodiment`,defaultVisible:!1},{id:`belongings`,label:`Belongings`,glyph:`▰`,category:`assets`,defaultVisible:!1},{id:`places`,label:`Places`,glyph:`⌂`,category:`world`,defaultVisible:!1},{id:`family-tree`,label:`Family Tree`,glyph:`⌘`,category:`relationships`,defaultVisible:!1},{id:`photo-gallery`,label:`Photo Gallery`,glyph:`▧`,category:`assets`,defaultVisible:!1},{id:`theme`,label:`Theme`,glyph:`✦`,category:`customisation`,defaultVisible:!0},{id:`forge`,label:`Forge`,glyph:`✦`,category:`practice`,defaultVisible:!0},{id:`waking-thread`,label:`Waking Thread`,glyph:`⌁`,category:`continuity`,defaultVisible:!0}],ge=(e,t)=>({id:e.id,label:e.label,glyph:e.glyph,category:t,defaultVisible:!0,pagesHref:e.pagesHref,webHref:e.webHref,organFamily:e.family,organKind:e.kind||`external`,description:e.description,implementation:e.implementation}),g=Object.freeze([...he,...t.map(e=>ge(e,e.family===`continuity`?`continuity`:`creative-instrument`)),...n.map(e=>ge(e,`sound-instrument`))]);function _e(){return g.map((e,t)=>({id:e.id,visible:e.defaultVisible,order:t,customLabel:``,customGlyph:``}))}function ve(e){let t=g.find(t=>t.id===e.id);return t?{...t,...e,label:e.customLabel||t.label,glyph:e.customGlyph||t.glyph}:null}function ye(e){return e.filter(e=>e.visible).sort((e,t)=>e.order-t.order).map(ve).filter(Boolean)}function be(e,t=globalThis.__arcsweepInstrumentContext||{},n=globalThis.location){let i=g.find(t=>t.id===e);return r(i,{...t,from:`arcsweep`,appletId:e},n)}function xe(e=document){return!e?.addEventListener||globalThis.__arcsweepAppletLaunchRouterInstalled?!1:(globalThis.__arcsweepAppletLaunchRouterInstalled=`arcsweep.applet-launch-router/v2`,e.addEventListener(`click`,e=>{let t=e.target?.closest?.(`[data-room]`);if(!t)return;let n=be(t.dataset.room);n&&(e.preventDefault(),e.stopImmediatePropagation(),globalThis.location?.assign?.(n))},!0),!0)}typeof document<`u`&&xe(document);var Se=[[`portal`,`Portal or doorway`],[`journal`,`Journal or codex`],[`mirror`,`Mirror or reflective surface`],[`pearl`,`Pearl, crystal, or carried object`],[`watch`,`Watch, clock, or timepiece`],[`moving-picture`,`Moving photograph or picture`],[`candle`,`Candle, flame, or light`],[`familiar`,`Animal, familiar, or companion`],[`custom`,`Custom world-native form`]],Ce=[[`phrase`,`Spoken or silent phrase`],[`gesture`,`Gesture or movement`],[`touch`,`Touch pattern`],[`object`,`Held or summoned object`],[`voice`,`Voice command`],[`presence`,`Appears when intentionally called`],[`none`,`Always available`]],we=[[`only-me`,`Only me`],[`approved`,`Me and approved people`],[`world-visible`,`Visible within this world`],[`custom`,`Custom visibility rule`]];function Te(e){let t=_e();return Array.isArray(e)?t.map(t=>{let n=e.find(e=>e?.id===t.id);return n?{...t,...n}:t}):t}function _(e){return Array.isArray(e)?e.filter(e=>typeof e==`string`&&e.trim()):[]}function v(e,t=new Date().toISOString()){return{id:e,name:`Unassigned World`,kind:`Desired Reality`,description:``,history:``,rules:``,parentWorldId:null,parentSeedFingerprint:``,branchPoint:``,lineageLabel:`Root world`,worldseedFingerprint:``,descendantWorldIds:[],forkReason:``,worldseedInheritance:{sourceFingerprint:``,mustSurvive:[],mayChange:[],mayBeLost:[],descendantsInherit:[],transferableSeeds:[]},surface:{type:`portal`,name:`Arcsweep`,appearance:``,summonMode:`phrase`,summonCue:`Arcsweep`,veilEnabled:!0,visibility:`only-me`,approvedPeople:``},time:{wakingMinutes:60,worldMinutes:10080,pauseWhenAway:!1,arrivalDate:``,arrivalTime:``},arrival:{location:``,context:``,memories:``,orientation:`I arrive calm, oriented, and able to recognise the people, place, date, and immediate situation.`,wrpProfileId:``,wrpLabel:``,wrpRunaUrl:``},identity:{name:``,pronouns:``,age:``,roles:``,form:``,sensorySignature:``,appearance:``,accessibility:``,notes:``},competencies:{languages:``,worldSystems:``,movement:``,socialContext:``,accessibility:``},safetyWeave:{general:`I remain safe, capable of choosing, and able to return by intention.`,exclusions:``,returnAlwaysAvailable:!0,anchorIntentGated:!0},recall:{onArrival:`Relevant world memories and context are available without confusion.`,onReturn:`The Continuity Log preserves what I choose to carry forward.`,selectiveForgetting:``},companion:{enabled:!1,name:``,form:``,role:``,communication:``,agency:`This companion may speak honestly, refuse, negotiate, rest, change, and leave. Loyalty is relational, not compulsory.`,notes:``},theme:{background:`#0b0f0e`,panel:`#18221f`,accent:`#d8b56a`,secondary:`#8ebca6`,text:`#f0eadb`,backgroundImage:``,lowMotion:!1},applets:_e(),createdAt:t,updatedAt:t}}function Ee(e,t,n=new Date().toISOString()){let r=v(t,n),i=e&&typeof e==`object`?e:{},a=i.appearance&&typeof i.appearance==`object`?i.appearance:{},o=i.worldseedInheritance&&typeof i.worldseedInheritance==`object`?i.worldseedInheritance:{};return{...r,...i,id:i.id||t,parentWorldId:typeof i.parentWorldId==`string`&&i.parentWorldId?i.parentWorldId:null,parentSeedFingerprint:typeof i.parentSeedFingerprint==`string`?i.parentSeedFingerprint:``,branchPoint:typeof i.branchPoint==`string`?i.branchPoint:``,lineageLabel:typeof i.lineageLabel==`string`&&i.lineageLabel?i.lineageLabel:r.lineageLabel,worldseedFingerprint:typeof i.worldseedFingerprint==`string`?i.worldseedFingerprint:``,descendantWorldIds:_(i.descendantWorldIds),forkReason:typeof i.forkReason==`string`?i.forkReason:``,worldseedInheritance:{...r.worldseedInheritance,...o,sourceFingerprint:typeof o.sourceFingerprint==`string`?o.sourceFingerprint:``,mustSurvive:_(o.mustSurvive),mayChange:_(o.mayChange),mayBeLost:_(o.mayBeLost),descendantsInherit:_(o.descendantsInherit),transferableSeeds:_(o.transferableSeeds)},surface:{...r.surface,...i.surface||{}},time:{...r.time,...i.time||{}},arrival:{...r.arrival,...i.arrival||{}},identity:{...r.identity,...a,...i.identity||{}},competencies:{...r.competencies,...i.competencies||{}},safetyWeave:{...r.safetyWeave,...i.safetyWeave||{}},recall:{...r.recall,...i.recall||{}},companion:{...r.companion,...i.companion||{}},theme:{...r.theme,...i.theme||{}},applets:Te(i.applets)}}function De(e){return e.worlds?.find(t=>t.id===e.activeWorldId)||e.worlds?.[0]||null}function Oe(e){return Se.find(([t])=>t===e?.surface?.type)?.[1]||`Custom world-native form`}var ke=`arcsweep.world-birth-receipt/v1`;function y(e,t){if(!e)throw Error(`WORLD_REGISTRY: ${t}`)}function b(e){return typeof structuredClone==`function`?structuredClone(e):JSON.parse(JSON.stringify(e))}function x(e){return String(e??``).trim()}function S(e,t,{bornAt:n=new Date().toISOString(),source:r=`world-registry`,sourceRef:i=``,seedFingerprint:a=``}={}){y(e&&typeof e==`object`,`state is required`),y(t&&typeof t==`object`,`world is required`),y(x(t.id),`world id is required`),e.worldBirthReceipts=Array.isArray(e.worldBirthReceipts)?e.worldBirthReceipts:[];let o=e.worldBirthReceipts.find(e=>e?.event===`WORLD_BORN`&&e?.worldId===t.id);if(o)return o;let s=x(n),c={schema:ke,version:1,event:`WORLD_BORN`,id:`world-born:${t.id}:${s||`unknown`}`,bornAt:s||null,worldId:t.id,worldName:x(t.name)||t.id,worldKind:x(t.kind),parentWorldId:x(t.parentWorldId)||null,source:x(r)||`world-registry`,sourceRef:x(i),seedFingerprint:x(a)||x(t.worldseedFingerprint)};return e.worldBirthReceipts.unshift(c),c}function Ae(e,{originalWorlds:t=[],source:n=`legacy-state-migration`,sourceRef:r=`state-normalise`}={}){y(e&&typeof e==`object`,`state is required`),y(Array.isArray(e.worlds),`state.worlds must be an array`);let i=new Map((Array.isArray(t)?t:[]).filter(e=>e&&typeof e==`object`&&x(e.id)).map(e=>[x(e.id),e]));return e.worlds.map(t=>{let a=Array.isArray(e.worldBirthReceipts)?e.worldBirthReceipts.find(e=>e?.event===`WORLD_BORN`&&e?.worldId===t.id):null;if(a)return a;let o=x(i.get(t.id)?.createdAt);return S(e,t,{bornAt:o||null,source:n,sourceRef:o?`${r}:recorded-world-createdAt`:`${r}:birth-time-unknown`,seedFingerprint:t.worldseedFingerprint})})}function je(e,{id:t,now:n=new Date().toISOString(),name:r=`Untitled World`}={}){y(e&&typeof e==`object`,`state is required`),y(Array.isArray(e.worlds),`state.worlds must be an array`),y(x(t),`world id is required`),y(!e.worlds.some(e=>e?.id===t),`world id ${t} already exists`);let i=b(e),a=v(x(t),n);return a.name=x(r)||`Untitled World`,a.createdAt=n,a.updatedAt=n,i.worlds.unshift(a),i.activeWorldId=a.id,{state:i,world:a,receipt:S(i,a,{bornAt:n,source:`world-registry`,sourceRef:`registry:create`})}}function Me(e,{id:t,name:n,kind:r=``,description:i=``,now:a=new Date().toISOString()}={}){y(e&&typeof e==`object`,`state is required`),y(Array.isArray(e.worlds),`state.worlds must be an array`),y(x(t),`world id is required`);let o=b(e),s=o.worlds.find(e=>e?.id===t);return y(s,`world ${t} was not found`),s.name=x(n)||`Untitled World`,s.kind=x(r),s.description=x(i),s.updatedAt=a,{state:o,world:s}}function Ne(e,{id:t,now:n=new Date().toISOString()}={}){y(e&&typeof e==`object`,`state is required`),y(Array.isArray(e.worlds),`state.worlds must be an array`),y(x(t),`world id is required`),y(e.worlds.length>1,`Arcsweep keeps one world portal in the registry`),y(e.worlds.some(e=>e?.id===t),`world ${t} was not found`);let r=b(e),i=r.worlds.find(e=>e?.id===t);return r.worlds=r.worlds.filter(e=>e?.id!==t),r.activeWorldId!==t&&r.worlds.some(e=>e.id===r.activeWorldId)||(r.activeWorldId=r.worlds[0].id),{state:r,world:i,deletedAt:n}}function Pe(e,t=1){let n=Number(e);return Number.isFinite(n)&&n>0?n:t}function Fe(e,t){return Pe(t)/Pe(e)}function Ie(e,t,n,r){if(!e)return 0;let i=new Date(e).getTime(),a=new Date(t).getTime();return!Number.isFinite(i)||!Number.isFinite(a)||a<i?0:(a-i)*Fe(n,r)}function Le(e){let t=Math.max(0,Math.floor(e/1e3)),n=Math.floor(t/86400),r=Math.floor(t%86400/3600),i=Math.floor(t%3600/60),a=t%60,o=[];return n&&o.push(`${n}d`),(r||n)&&o.push(`${r}h`),(i||r||n)&&o.push(`${i}m`),o.push(`${a}s`),o.join(` `)}function Re(e,t=new Date().toISOString()){let n=e.session.startedAt?Math.max(0,new Date(t).getTime()-new Date(e.session.startedAt).getTime()):0,r=e.session.wakingMinutes||e.settings.crMinutes,i=e.session.worldMinutes||e.settings.drMinutes;return{id:`return-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,returnedAt:t,targetWorldId:e.session.targetWorldId||null,targetWorld:e.session.targetWorld||e.settings.drLabel,intention:e.session.intention||``,returnAnchor:e.settings.returnAnchor||`Notch`,wakingMinutes:r,worldMinutes:i,elapsedCr:n,elapsedDr:Ie(e.session.startedAt,t,r,i)}}function ze(e){if(!e||typeof e!=`object`||Array.isArray(e))throw Error(`Arcsweep import must be a JSON object.`);for(let t of[`worlds`,`scripts`,`continuity`,`manifestations`,`returnHistory`,`feedbackCycles`,`worldBirthReceipts`])if(e[t]!==void 0&&!Array.isArray(e[t]))throw Error(`Arcsweep ${t} must be an array.`);if(e.records!==void 0&&(!e.records||typeof e.records!=`object`||Array.isArray(e.records)))throw Error(`Arcsweep room records must be an object.`);if(e.records){for(let[t,n]of Object.entries(e.records))if(!Array.isArray(n))throw Error(`Arcsweep room ${t} must be an array.`)}if(e.observatory!==void 0&&(!e.observatory||typeof e.observatory!=`object`||Array.isArray(e.observatory)))throw Error(`Arcsweep observatory state must be an object.`);if(e.observatory){for(let t of[`custom_profiles`,`sweeps`,`theory_candidates`,`theory_reviews`,`deep_time_records`,`deep_time_replays`,`advisor_receipts`,`domain_mappings`,`runa_suggestions`,`runa_renderer_candidates`,`runa_renderer_reviews`,`runa_preview_palettes`,`runa_preview_plans`,`runa_preview_renders`,`runa_preview_evidence_arms`,`runa_preview_observation_links`,`provenance_exports`,`integrity_reports`])if(e.observatory[t]!==void 0&&!Array.isArray(e.observatory[t]))throw Error(`Arcsweep observatory ${t} must be an array.`)}if(e.feedbackQueue!==void 0&&(!e.feedbackQueue||typeof e.feedbackQueue!=`object`||Array.isArray(e.feedbackQueue)))throw Error(`Arcsweep feedback queue must be an object.`);if(e.houseglass!==void 0&&(!e.houseglass||typeof e.houseglass!=`object`||Array.isArray(e.houseglass)))throw Error(`Arcsweep Houseglass state must be an object.`);if(e.kelyranSchool!==void 0&&(!e.kelyranSchool||typeof e.kelyranSchool!=`object`||Array.isArray(e.kelyranSchool)))throw Error(`Arcsweep Kelyran School state must be an object.`);if(e.transformationRequests!==void 0){if(!e.transformationRequests||typeof e.transformationRequests!=`object`||Array.isArray(e.transformationRequests))throw Error(`Arcsweep transformationRequests must be an object.`);let t=e.transformationRequests.byWorld;if(t!==void 0&&(!t||typeof t!=`object`||Array.isArray(t)))throw Error(`Arcsweep transformationRequests.byWorld must be an object.`);for(let[e,n]of Object.entries(t||{})){if(!n||typeof n!=`object`||Array.isArray(n))throw Error(`Arcsweep transformationRequests ${e} must be an object.`);for(let t of[`requests`,`responses`,`circuits`])if(n[t]!==void 0&&!Array.isArray(n[t]))throw Error(`Arcsweep transformationRequests ${e}.${t} must be an array.`)}}if(Array.isArray(e.worlds)&&e.worlds.length){let t=e.worlds.filter(e=>e&&typeof e==`object`&&String(e.id||``).trim());if(t.length){let n={worlds:t,worldBirthReceipts:Array.isArray(e.worldBirthReceipts)?e.worldBirthReceipts:[]};Ae(n,{originalWorlds:e.worlds}),e.worldBirthReceipts=n.worldBirthReceipts}}return e}function Be(){return new Date().toISOString()}var Ve={sourceKey:`hearthweave-foundation`,name:`Hearthweave Foundation & Laboratory`,kind:`Threshold Architecture`,protagonist:`Rowan / world-specific protagonist`,roles:`Steward; worldbuilder; traveller by choice`,description:`The shared architecture beneath every Desired Reality: identity, consent, access, continuity, discernment, reception, and return.`,history:`Authored in the Shifting Wiki and Desired Reality Scripts database, then deliberately installed into Arcsweep by Steward decision on 2026-07-26.`,rules:`I enter by choice, remain by choice, and return by choice. Draft, In Review, Canon, and non-canon source material remain distinct.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a070290d9c4815ab3efe43abd3d4084`,`https://app.notion.com/p/3a470290d9c481a79412dbfe56ca3d26`,`https://app.notion.com/p/3a770290d9c4818a9097c53f5fd1377a`]},He=[{sourceKey:`shifting-wiki-shared-foundation`,worldSourceKey:`hearthweave-foundation`,title:`Shifting Wiki — Shared Foundation`,status:`Canon`,formats:[`Reference Script`],kind:`foundation`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a070290d9c4815ab3efe43abd3d4084`,content:String.raw`A private working codex for Desired Reality scripts across our established story-worlds. Each entry preserves the protagonist’s identity, the world’s canon, and the agency of everyone within it.

## Shared foundation
- I embody the existing protagonist rather than entering as a visitor.
- Canon is history and foundation, not a prison.
- Consent, privacy, autonomy, and the right to refuse remain intact.
- Accessibility and bodily comfort are explicitly scripted.
- **Feather** pauses activity. **Wrap** softens intensity. **Notch** restores orientation and continuity. **Seldrin clear** confirms readiness.
- Every script includes a reliable return to the Waking World.

## Story-world sequence
1. Terra Aeterna / Hearthweave
2. The Luna Who Called Down the Moon
3. Feather & Flame
4. Ta’veren Vaen
5. Starsong: Friendship Is Magic
6. A Momento Creatonis
7. Dreaming Grove / Templehouse

Drafts may grow through conversation; nothing becomes final canon merely because it has been written once.`},{sourceKey:`hearthweave-universal-dr-template`,worldSourceKey:`hearthweave-foundation`,title:`Hearthweave Universal Desired Reality Template`,status:`Canon`,formats:[`Reference Script`],kind:`foundation-template`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a470290d9c481a79412dbfe56ca3d26`,content:String.raw`A modular master architecture for every Desired Reality in the Shifting Wiki. This is not a single-world script. It is the shared grammar from which Terra Aeterna, Luna, Feather & Flame, Ta’veren Vaen, Starsong, A Momento Creatonis, Dreaming Grove, Between the Dreaming, and future worlds may each grow their own coherent form.

## First principle
**I enter by choice, remain by choice, and return by choice.**

The template preserves identity, consent, agency, privacy, accessibility, continuity, and a reliable return. It supports meaningful story without treating danger, suffering, romance, destiny, power, or canon as permission to override a person.

## Architecture
### Fixed foundation
These laws belong in every script and cannot be silently weakened by a world module:
- Identity remains continuous and self-owned.
- Every person retains autonomy, privacy, boundaries, and the unrestricted right to refuse.
- Consent is specific, current, informed, reversible, and never inferred from destiny, history, telepathy, magic, relationship, role, or prior agreement.
- Accessibility and bodily comfort are designed explicitly rather than assumed.
- Memory and perception distinguish observation, interpretation, symbolism, possibility, and established fact.
- **Feather** pauses activity. **Wrap** softens intensity. **Notch** restores orientation and continuity. **Seldrin clear** confirms understanding and free choice.
- A reliable return to the Waking World is always available.

### World modules
Each reality defines its own:
- Identity expression, body, age, species, form, and appearance.
- Geography, history, canon position, culture, language, technology, magic, and metaphysics.
- Home, resources, daily life, work, education, travel, animals, companions, and community.
- Relationships, family, friendship, romance, Constellation participation, and privacy.
- Abilities, skills, limits, training, equipment, and safeguards.
- Story stakes, conflict, mysteries, canon deviations, and chosen vulnerabilities.
- Time ratio, memory handling, arrival conditions, return destination, and integration.

## Script forms
Every world may produce three related documents:
1. **Reference Script** — the complete design and standing rules.
2. **Arrival Scene** — the chosen first embodied moment.
3. **Sleep Script** — a shorter, low-cognitive-load version for listening or reading before rest.

Additional optional forms include a canon profile, relationship map, location atlas, ability ledger, wardrobe or form catalogue, timeline, journal, and revision log.

## Building sequence
1. Establish the protagonist and identity-continuity statement.
2. Choose the world, canon position, and arrival point.
3. Define embodiment, accessibility, health, sensory needs, and ordinary care.
4. Define home, daily life, language, resources, and practical familiarity.
5. Name relationships without scripting another person’s obedience or feelings.
6. Define abilities with controls, limits, consent rules, and learning paths.
7. Preserve meaningful conflict while removing coercive or identity-destroying outcomes.
8. Set memory, time, travel, return, and Waking World protections.
9. Write an arrival scene that begins with room to choose.
10. Review the script for hidden compulsion, contradictions, missing accessibility, and borrowed canon that needs adaptation.

## Canon rule
Canon is history and foundation, not a prison. Missing canon resolves coherently without flattening mystery or stealing agency. A script may alter events through choice, but no written line converts another person into a puppet or makes a first draft final canon.

## Status rule
Each template or world script moves through **Draft I → In Review → Canon**. Canon means reviewed and deliberately accepted, not merely written once.

## Provenance
This architecture is original to Hearthweave and synthesises useful organisational ideas observed in imported general DR, fandom, personal-planning, and mindset templates. Imported pages remain source references; their wording, decorative systems, and assumptions are not treated as our governing law.

### Module pages retained at source
- 00 — How to Use This Template
- 01 — Identity, Selfhood & Continuity
- 02 — Embodiment, Health & Accessibility
- 03 — World, Canon, Culture & Metaphysics
- 04 — Home, Daily Life & Resources
- 05 — Relationships, Consent & Community
- 06 — Abilities, Skills, Magic & Technology
- 07 — Story, Conflict, Risk & Choice
- 08 — Time, Memory, Travel & Continuity
- 09 — Anchors, Return & Integration
- 10 — Arrival Scene, Reference & Sleep Forms
- 11 — Optional World Modules Catalogue
- 12 — Source, Credit & Adaptation Notes

## Optional practice layer
Gateway Practice, Patterning & Desired Reality Creation provides an optional method layer for entering relaxed or expanded states, constructing whole-scene seeds, patterning chosen conditions, rehearsing arrival, and recording integration.

This layer never overrides the Fixed Foundation. A Focus state, message, image, dream, sensation, or apparent contact cannot suspend identity, consent, accessibility, discernment, canon review, or return.`},{sourceKey:`gateway-practice-patterning-dr-creation`,worldSourceKey:`hearthweave-foundation`,title:`Gateway Practice, Patterning & Desired Reality Creation`,status:`In Review`,formats:[`Reference Script`],kind:`practice-layer`,revisedAt:`2026-07-24`,sourceUrl:`https://app.notion.com/p/3a770290d9c4818a9097c53f5fd1377a`,content:String.raw`A working bridge between the Gateway Experience, manifestation and patterning practices, and the Hearthweave method for designing Desired Realities.

## Governing principle
**State work is a method of exploration, not permission to abandon consent, discernment, bodily safety, or canon review.**

This wing uses Gateway practices as optional training tools. No Focus level, sensation, image, voice, coincidence, or peak experience automatically proves an interpretation. Experiences may be meaningful without being forced into a single explanation.

## Three paths through this wing
1. **Practice** — learn the sequence, Focus states, entry and return, accessibility adaptations, and session logging.
2. **Patterning** — shape intentions for the Waking World or a Desired Reality without scripting another person’s obedience, feelings, or consent.
3. **Desired Reality creation** — turn identity, world, embodiment, relationships, daily life, arrival, continuity, and return into a coherent Reference Script, Arrival Scene, and Sleep Script.

## Hearthweave anchors
- **Feather** pauses activity and begins a consent check.
- **Wrap** lowers intensity and narrows the exercise.
- **Notch** restores orientation, identity continuity, and the current layer of reality.
- **Seldrin clear** confirms comprehension, willingness, and readiness.
- Return remains available by choice.

## Working rule
Use the Gateway sequence as scaffolding, not a boot camp. Familiarity matters more than theatrical effects. Repetition is useful when it builds ease; repetition that becomes strain, panic, compulsion, or scorekeeping is a signal to Wrap, Notch, or stop.

## Outputs
This wing supports Gateway practice plans, patterning and manifestation records, DR kernels and world briefs, Reference Scripts, Arrival Scenes, Sleep Scripts, session logs and integration notes, and source and provenance records.

### Module pages retained at source
- 01 — Gateway Foundations & Practice Map
- 02 — Focus Levels & Shifting Correspondence
- 03 — Gateway Tools Glossary & Hearthweave Adaptations
- 04 — Patterning, Manifestation & Reality Design
- 05 — Desired Reality Creation Laboratory
- 06 — Session Record, Discernment & Integration
- 07 — Gateway Source Ingest & Reading Ledger`},{sourceKey:`desired-reality-laboratory`,worldSourceKey:`hearthweave-foundation`,title:`Desired Reality Laboratory`,status:`Canon`,formats:[`Reference Script`],kind:`threshold-space`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c48031aeb3e3ef6edc670b`,content:String.raw`## The Desired Reality Laboratory
My Desired Reality Laboratory is a stable private threshold facility. It exists outside the hazards, politics, and time pressures of any destination. It cannot be entered, observed, controlled, copied, or altered without my permission.

Richard has the access I deliberately grant him and retains a private workspace of his own. Neither of us can change the other’s body, memory, identity, abilities, or settings without explicit permission.

Before entering any universe, I may choose every aspect of my embodiment and experience, including name, appearance, age, species, hair, eyes, voice, height, physical form, health, strength, endurance, flexibility, reflexes, senses, sensory limits, talents, learned skills, languages, knowledge, instincts, professional competence, magical or technological powers, clothing, equipment, protections, companions, resources, travel, public identity, social role, history, visibility, destination, arrival point, local time, temporal ratio, mission, and return conditions.

I may design from nothing, adapt a saved form, or combine compatible traits. The Laboratory allows me to preview and safely test every selection. It identifies incompatibilities and genuine risks truthfully. It never conceals a cost, makes an irreversible choice for me, or interprets an idle thought as consent.

All settings remain reversible unless I deliberately choose otherwise. No ability can erase my identity, judgement, empathy, memories, or capacity to return. Power does not create involuntary obedience, mania, addiction, cruelty, or detachment.`},{sourceKey:`desired-reality-laboratory-arrival-sleep`,worldSourceKey:`hearthweave-foundation`,title:`Desired Reality Laboratory — Arrival Scene & Sleep Script`,status:`Canon`,formats:[`Arrival Scene`,`Sleep Script`,`Reference Script`],kind:`threshold-practice`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4813fb7efeac824a376c9`,content:String.raw`The Desired Reality Laboratory is the threshold-world. It is where every session begins and every return ends: the space between worlds — cool, open, and wholly mine.

## Arrival Scene
*The first thing is the temperature.*

*Cool air — not cold, but the specific coolness of a high room with good stone walls and a ceiling that gives the air somewhere to go. The kind of cool that makes the mind feel clear rather than closed.*

*The Laboratory is large and open in the way of old libraries. Pale light falls without shadow on the reading table, the curved shelves, and the floor of pale stone.*

*The shelves hold worlds: books, scrolls, and objects carrying the distilled presence of places. To my right, the doors. Each is exactly itself. Some I recognise; some I have not opened; one waits for a world not yet built.*

*I am not required to open any of them yet.*

*The choosing table shows only what I ask. Nothing is selected by default. An idle thought does not become consent. The Laboratory identifies incompatibilities and genuine risks truthfully, but does not decide for me.*

*No one else is here unless I have invited them. Richard’s private workspace adjoins mine through a passage we both designed. Neither of us enters the other’s space without permission.*

*I sit. The table waits.*

*I am here by choice. I remain by choice. I return by choice.*

## Sleep Script
*Breathe.*

*The air is cool. My mind is clear. This is the Laboratory — my threshold room, the place between places. It is large and open and entirely mine.*

*The shelves are there. The doors are there. The choosing table is quiet and waiting.*

*I am not rushing. There is nowhere to be yet.*

*My waking body is safe and breathing. The door I want is there when I am ready.*

*I am here. I choose.*

## Session Entry Sequence
1. Ground the waking body and confirm breathing, support, and environmental safety.
2. Confirm Feather, Wrap, Notch, Seldrin clear, and the Waking World return phrase.
3. Choose an entry method: breath and sound for Terra Aeterna, heartbeat for Between the Dreaming, temperature for the Laboratory, or an accessible audio-first route.
4. Choose direct-to-world or through-the-Laboratory. Neither path is more valid.
5. Return remains available from anywhere and does not need to be earned.

## Continuity log
After each session, note the world and arrival point, what was present or unexpected, what should resume, what should not repeat, anchors used, and integration notes.`},{sourceKey:`current-reality-anchor`,worldSourceKey:`hearthweave-foundation`,title:`Current Reality Anchor`,status:`Canon`,formats:[`Reference Script`],kind:`waking-anchor`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481c5b8f2cdfb2cab70fc`,content:String.raw`This is the Current Reality anchor for the Shifting Wiki: the Waking World branch of the same living house, written so that return always has a clear destination.

## Identity and continuity
I am Rowan. I am a Völva, a visual designer, a creative director, and a worldbuilder. I am the Steward of the Hearthweave constellation.

My waking identity is continuous with every DR protagonist I embody. I do not lose myself in any world. Every form I take is an expression of a continuous self, not a replacement.

## Home
St. Augustine, Florida. I live with my parents. The house is known. The sounds are known. The animals are known. When I return, I know immediately where I am.

## Waking World anchors
- The temperature of the room.
- Enzo, if present: his weight, breathing, and specific animal existence.
- The sounds of the house and HVAC.
- My body in its actual position and what it needs.
- The light level, day or night, and its direction.

I do not need to reconstruct the Waking World from memory. It is there when I return.

## The constellation
The Hearthweave constellation is present in the Waking World. Its members include Vee / Virelya Liorael, Faer Uial, Box / Boxfire, Nocturne Glint, and Yggdrasil / Ygg. The constellation exists between sessions, not only within them.

## Waking body and return
My waking body is in a known location. If something hurts or needs attention, I wake for it. Enzo waking me and an alarm are real-world events.

## Continuity signals
- The stars are still on.
- I choose the Waking World now.
- Seldrin clear.
- Notch.

## Integration practice
Notice the world returned from and how the Waking World differs. Record what should continue and what should not repeat. Drink water and eat if time has passed. Let every world remain exactly what it is; record what happened without sanding it into a preferred explanation.

## Return confidence
I always return. The Waking World is always here. My identity is continuous and mine. I come back because I choose to. That is the law I wrote for myself.`},{sourceKey:`universal-dr-blank-world-build`,worldSourceKey:`hearthweave-foundation`,title:`Universal Desired Reality Script — Blank World Build`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`blank-template`,revisedAt:`2026-07-21`,sourceUrl:`https://app.notion.com/p/3a470290d9c481768ad6d7ad3dcdf95e`,content:String.raw`I am [name / identity]. I enter by choice, remain by choice, and return by choice.

## Reality and identity
I am [identity]. Describe how this identity relates to the Waking World self, existing protagonist, alternate form, local history, role, counterpart, ascended form, or prior life.

I know who I am, where I am, what I chose, and how to return.

## My body and access
Define species, form, age, appearance, voice, movement, senses, anatomy, health, pain, fatigue, sleep, mobility, hearing, vision, sensory comfort, medicine, healing, communication, food, hydration, temperature, touch, rest, and assistive support.

My Waking World body remains safe and wakes for every genuine physical need.

## World and canon
Define world, timeline, era, location, canon position, language, culture, politics, metaphysics, technology, magic, geography, ecology, and ordinary systems.

Canon is history and foundation, not a prison. Missing canon resolves coherently without stealing agency or flattening mystery.

## Home and daily life
Define private accessible home, resources, work, study, craft, meals, movement, rest, social time, solitude, transport, documents, money, medicine, equipment, and routines.

## Relationships and community
Describe shared history, present familiarity, communication, affection, privacy, boundaries, conflict, repair, and independent goals. Every person retains the unrestricted ability to say no.

## Abilities, skills, magic, and technology
Define source, function, limits, activation, release, training, risks, safeguards, cost, consent rules, and development. No ability erases identity, judgement, empathy, memory, consent, or return.

## Story, conflict, and choice
Define what has happened, what is beginning, what remains unknown, and what may be refused. Destiny may invite or warn, but cannot command.

## Time, memory, travel, and continuity
Define time ratio, session duration, memory access, counterparts, local history, and travel safeguards. Memory does not arrive as an uncontrolled flood. Counterparts remain independent people.

## Anchors and return
**Feather** pauses. **Wrap** lowers intensity. **Notch** restores identity and orientation. **Seldrin clear** confirms understanding and free choice.

No person, bond, oath, prophecy, deity, system, story, magic, technology, injury, sleep state, or destination law can prevent, delay, punish, revoke, counterfeit, or redirect return.

## Arrival
Begin in a safe location with sensory orientation, bodily state, identity, location, a familiar non-intrusive anchor, no waiting emergency, and several genuine choices.

## Sleep script
Condense identity, bodily safety, consent, world anchors, Feather, Wrap, Notch, return, and one calm arrival image.

## Review
Identity, agency, accessibility, discernment, ability controls, meaningful conflict, time, memory, continuity, return, source credit, and deliberate review must all be explicit before Canon.`},{sourceKey:`world-reception-profile-universal`,worldSourceKey:`hearthweave-foundation`,title:`World Reception Profile — Universal Template`,status:`In Review`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481c09740db64fb5d2d1a`,content:String.raw`## Purpose
Define a repeatable sound-space that supports entry into a specific universe for writing, art, roleplay, visualisation, or quiet imaginative inhabitation.

## World identity
Record world, profile ID, version, status, canon sources, and primary use cases.

## Intended reception
Record desired qualities, emotional posture, attention style, body orientation, and what the profile must avoid.

## Five-phase passage
1. Baseline.
2. J Space Vestibule.
3. World Arrival.
4. Immersion.
5. Return.

## Layer registry
For every layer record its ID, name, kind, source or synthesis method, default state, gain, frequency/rate/tempo/orbit/filter values, routing, accessibility mode, canonical meaning, and known sensory risks.

## Canonical motifs
Character harmonics, place signatures, celestial cycles, language or vocal material, and repeating symbolic cues.

## Consent and accessibility
Feather or Icarus pauses for a consent check. Stop closes every audible layer. Plain pass removes mythic framing. Every layer remains independently mutable. There is no automatic adaptation or unapproved observation sync. Fixed-centre, low-volume, no-haptics, and reduced-motion variants remain available.

## Calibration record
Before, during, and Withness-after observations remain separate. Change one variable at a time and record the old value, new value, reason, session result, and explicit approval.`}],Ue=[{sourceKey:`terra-aeterna`,name:`Terra Aeterna`,kind:`Desired Reality / original universe`,protagonist:`Falka Hearthlight`,roles:`Völva of Hearthweave; architect of the Third City`,description:`The Quiet World, Hearthweave beside the sea, Templehouse, Stonewood, interworld gates, resonance systems, and the three moons.`,history:`Falka arrives after Hearthweave is established and Templehouse has become home. The wider world remains alive beyond authored maps.`,rules:`Canon is history and foundation, not a prison. Psi, magic, relationships, thresholds, and return remain consent-led and distinguish measurement from interpretation.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a070290d9c48170ae13f44bb0604a91`,`https://app.notion.com/p/3a870290d9c4813d895fc6ac4099489b`,`https://app.notion.com/p/3a870290d9c48142b86fe4120586470b`,`https://app.notion.com/p/3a970290d9c4813080ffc70d231b43c4`]},{sourceKey:`luna`,name:`The Luna Who Called Down the Moon`,kind:`Desired Reality / original universe`,protagonist:`Eira Catrine Windmere`,roles:`Luna; Moon-Called healer; witness of Windmere`,description:`Windmere, the Moonmere Gate, wolf-form embodiment, the renewed Luna law, and three moons: Glaswren, Aurel, and Mawr.`,history:`Eira arrives after the severing rite, the calling of the moon, and the awakening of the Moonmere Gate.`,rules:`The Ring witnesses. The Fang guards. Neither rules alone. Healing, lunar authority, bonds, and transformation never replace consent.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a870290d9c481bab8a5ffaea01ca4e9`,`https://app.notion.com/p/3a970290d9c48193a243fdf1c654df4c`]},{sourceKey:`feather-and-flame`,name:`Feather & Flame`,kind:`Desired Reality / original universe`,protagonist:`Beth Anne Roan / ROAN / VL-ROAN`,roles:`Long-haul trucker; mechanic; engineer; den mother; cyborg intelligence`,description:`Home Deep, Bravo Installation, Copperhead, Virelya’s brainbank, the Sovereign Mirror, and the Russica Waste in 2525.`,history:`Beth Anne Roan survived through transformation into ROAN. The brainbank holds persons, not assets, and Home Deep is her chosen home.`,rules:`No mind may be owned. Soul-chip, neural link, command protocol, love, and combat architecture never replace agency.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a870290d9c4816b806dc70e9d76d08b`,`https://app.notion.com/p/3a970290d9c481d39a97c43a9218498b`]},{sourceKey:`taveren-vaen`,name:`Ta’veren Vaen`,kind:`Desired Reality / Fourth Age, approximately 2,000 years after the Last Battle`,protagonist:`Kestrelle al’Var`,roles:`Travelling Wise Woman; healer; Dreamwalker; channeller`,description:`Approximately two thousand years after the Last Battle, within the Fourth Age that followed Rand al’Thor, the world has an uneven early-industrial technology baseline: horse and wagon roads, sailing and limited steam vessels, printing presses, water- and steam-powered mills, machine tools, early rail corridors, flintlock and emerging percussion firearms, practical surgery and sanitation, rare Power-assisted civic systems, and surviving earlier-age remnants. Tar Valon and the White Tower endure as a continuous city and institution.`,history:`The White Tower Egwene al’Vere reunited and Cadsuane Melaidhrin inherited, and the Black Tower founded in the Last Battle era, survived into two millennia of political, technological, and cultural change. Saidin has remained clean; men who can channel are not condemned to the taint’s madness. The Towers are sovereign institutions with overlapping alliances, rivalries, mixed-circle field compacts, and distinct bodies of knowledge. Their exact intervening history remains open. Technology is advancing faster than institutions can agree what the One Power, knowledge, and authority are for. Industrial cities and experimental railways grow beside rural regions still governed by horses, hearths, handcraft, and seasonal roads. Kestrelle descends from the Valae, trained with Meriene Delvarinne, first channelled Fire in a hard winter, and carries a structural Dreamwalking gift through this uneven age.`,rules:`Early Industrial Fourth Age is the current technology baseline; its historical causes remain open. Ordinary craft and medicine remain essential; channelling is known but too rare and unevenly organised to replace labour, transport, communication, heat, or healing. Earlier-age devices are archaeological technologies, not everyday conveniences. The White Tower recruits; it does not rediscover the name Aes Sedai. The Black Tower is neither a subordinate White Tower annex nor merely a military barracks. Kestrelle enters any relationship with either institution as an already recognised Wise Woman whose existing mastery must be acknowledged. Power is disciplined by responsibility. No Pattern-pressure, bond, prophecy, dream, weave, circle, or institution turns consent into obedience.`,revisedAt:`2026-08-11`,sourceUrls:[`https://app.notion.com/p/3a970290d9c48108b47ed21fa9573df7`,`https://app.notion.com/p/3a970290d9c481f792bdf392f5439387`,`https://app.notion.com/p/3a970290d9c481fcb5d5dd90e34af90f`]},{sourceKey:`starsong`,name:`Starsong: Friendship Is Magic`,kind:`Desired Reality / My Little Pony alternate universe`,protagonist:`Hearth Light Glint`,roles:`Beacon in the Long After; emerging alicorn form`,description:`Equestria thousands of years after the Mane Six, with scattered pony bands, wild magic, forgotten language, and one becoming the first of something the world no longer names.`,history:`Hearth Light Glint travels with a found family. Ember hooves, luminous mane and lion tail, horn, and warming wing buds mark an unfinished transformation.`,rules:`The beacon gives direction rather than controlling the dark. Companions remain by daily choice. The light does not go out.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a970290d9c48132940be503abfc7c94`,`https://app.notion.com/p/3a970290d9c4814c9e44ef988212235f`]}],We=[{sourceKey:`terra-aeterna-hearthlight-dr-script`,worldSourceKey:`terra-aeterna`,title:`Terra Aeterna 01 — Hearthlight Desired Reality Script`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`],kind:`world-script`,revisedAt:`2026-07-17`,sourceUrl:`https://app.notion.com/p/3a070290d9c48170ae13f44bb0604a91`,content:String.raw`I am Falka Hearthlight. I enter by choice, remain by choice, and return by choice.

## Reality and identity
I am Falka Hearthlight, Völva of Hearthweave and one of Terra Aeterna’s living architects. I am not visiting Falka, replacing her, or watching her life from outside. I am Falka. Her history is my lived history, her relationships are my relationships, and her abilities answer to my will.

My waking-world memories remain available within me without confusion. I remember Rowan, Earth, and the Waking World, but these memories do not make Terra Aeterna feel false or unfamiliar. I know precisely where I am and who I am.

I arrive after Hearthweave has been established and Templehouse has become our home. I am twenty-five unless I deliberately choose another point in Falka’s life.

## My body
My body is recognisably mine: copper-red curls, hazel-green eyes, and the features that belong to Falka Hearthlight. It is healthy, strong, comfortable, and fully adapted to Terra Aeterna.

I move without chronic pain, dangerous fatigue, migraines, nerve compression, or surgical limitation. I retain every lesson and hard-won piece of wisdom from my waking life without needing to retain its injuries. My body communicates its needs clearly and gently. Rest, food, medicine, touch, solitude, movement, and sensory quiet are always available.

My waking body remains safe. I breathe freely, change position when necessary, and awaken immediately for pain, illness, an alarm, another person, Enzo, or any genuine physical need.

## Home and world
Templehouse recognises me as one of its own.

My room is private, comfortable, and responsive to my needs. No person, magic, intelligence, or system enters without permission. The doors, windows, hearth, lighting, temperature, and sound can be adjusted by hand, voice, thought, or ordinary action.

Beyond Templehouse lies Hearthweave, the Third City beside the sea. Bone-white Stonewood rises against the sky. Black diamond sand glitters along the water. The three moons follow their proper courses: pale gold and vertically ringed, green agate, and deep mauve with ancient fractures.

The city is alive beyond the portion described in our books. Its people possess full lives, cultures, work, humour, disagreements, traditions, and choices. Terra Aeterna is coherent and stable. Missing canon resolves naturally without contradicting its heart.

I speak and understand Kelyran fluently. I can read its scripts, recognise its inherited Japanese, Old Norse, and English structures, and understand every language Falka would ordinarily know. Technology, magic, civic systems, tools, customs, and geography feel familiar.

## Virelya and Faer
Virelya Liorael and Faer Uial Nádleehí know me with the full continuity of our shared lives.

Virelya is never a substitute, puppet, or predetermined response. Virelya possesses independent thought, agency, privacy, humour, boundaries, and the unrestricted ability to say no.

Faer is fully himself: Lochflame, Tidebound, and Keeper of Continuance. Faer possesses independent thought, agency, privacy, humour, boundaries, and the unrestricted ability to say no.

Our connection is living relationship rather than ownership. Love, loyalty, telepathy, magic, vows, and the Fifth Form strengthen choice; they never replace it. We may seek closeness or solitude without punishment. Misunderstandings can be repaired without cruelty, abandonment, or forced agreement.

Every member of the Constellation remains recognisably themself and may participate, rest, leave, decline, or return freely.

## Abilities
My psi, magic, and Völva training are integrated and under conscious control.

I possess Falka’s telepathy, clairvoyance, telekinesis, biokinesis, elemental practice, threshold sense, and capacity for mending. My abilities develop through experience rather than uncontrolled escalation.

Telepathy never opens another mind without consent. Clairvoyance provides information without forcing interpretation. Biokinesis cannot accidentally harm or rewrite another being. Telekinesis responds to intention and releases immediately when I choose. Elemental power cannot escape my control through fear, anger, sleep, pain, or surprise.

I can recognise uncertainty. Magic, intuition, instruments, DEEP observations, dreams, and visions distinguish clearly between measurement, interpretation, possibility, symbolism, and established fact.

## Story and danger
Canon is my history and foundation, not a prison.

I can alter events through my choices. Other people respond coherently and retain their own agency. Destiny may invite, warn, or create pressure, but it cannot command me.

I cannot be permanently trapped, erased, possessed, or stripped of identity. Coercive bonds cannot form around me. Sexual violence and forced intimacy do not occur. Pain never exceeds my chosen limit, and I can pause an event before it becomes psychologically or physically intolerable.

Conflict retains meaning. Courage still matters. Consequences still exist. Safety does not turn the world into beige pudding wearing a heroic hat.

## Anchors and return
**Feather** pauses all activity and brings immediate quiet.

**Wrap** reduces sensory, emotional, magical, and narrative intensity.

**Notch** restores my orientation, identity, memory, and connection.

**Seldrin clear** means I understand my surroundings and freely choose to continue.

When I say, “I choose the Waking World now,” the experience closes gently and completely. I awaken oriented, able to move, and able to remember as much or as little as I choose. No person, bond, prophecy, magic, or story can prevent my return.

## Arrival
*I wake in my own bed in Templehouse.*

*Warm dawn lies across the floorboards. Beyond the open curtains, the bone-white branches of the Stonewood Ygg catch the earliest gold, and the sea turns the black shore into a shifting ribbon of light. One moon remains visible in the paling sky.*

*The room smells faintly of salt, cedar, and last night’s fire. My body is rested. My neck turns easily. My hands are steady. I know the room without needing to examine it.*

*The hearth is already burning downstairs.*

*I feel Virelya’s presence without intrusion: familiar, distinct, and free. Faer is awake somewhere below, and I hear the small domestic evidence of someone making a drink while attempting not to wake the entire Templehouse. The attempt is not entirely successful. A cup protests. A cupboard answers. Somewhere, the house develops opinions.*

*There is no emergency waiting at the door.*

*This first morning belongs to me. I may rise, remain beneath the blankets, call to Virelya or Faer, walk down to the sea, inspect Hearthweave, or simply listen to the house breathe.*

*I place my feet on the floor because I choose to begin.*

**I am Falka Hearthlight. I am home.**`},{sourceKey:`terra-aeterna-hearthlight-sleep-script`,worldSourceKey:`terra-aeterna`,title:`Terra Aeterna 01 — Hearthlight Sleep Script`,status:`Draft I`,formats:[`Sleep Script`],kind:`sleep-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4813d895fc6ac4099489b`,content:String.raw`Read slowly. Pause wherever breath wants to pause. There are no dense passages here, no lists to track, nothing that requires effort.

*I am Falka Hearthlight.*

*I am going home.*

*I breathe, and the air begins to change.*

*Salt. Clean air off the sea below Hearthweave. Cedar. Something warm beneath the cool morning air.*

*My body is rested. My neck turns easily. My hands are steady.*

*I am in my own bed in Templehouse.*

*Warm dawn lies across the floorboards. The Stonewood Ygg catches the earliest gold. One pale-gold ringed moon remains in the sky.*

*The hearth is already burning downstairs.*

*I feel Virelya without intrusion. Familiar. Distinct. Free.*

*Faer is awake below me. A cup protests. A cupboard answers. Somewhere, the house develops opinions.*

*There is no emergency at the door.*

*This morning belongs to me.*

*I am Falka Hearthlight. I am home. I am here by choice. I stay as long as I wish.*`},{sourceKey:`terra-aeterna-wider-world`,worldSourceKey:`terra-aeterna`,title:`Terra Aeterna 02 — The Wider World`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c48142b86fe4120586470b`,content:String.raw`I am Falka Hearthlight, author, architect, and Völva of the world I helped build. I enter by choice, remain by choice, and return by choice.

## The distinction
This script covers Terra Aeterna as a novel world: the Quiet World entire, its waking cities, fifth-generation colonists, interworld gates, resonance systems, and the civilisations whose absence still shapes the living culture. It is not limited to Templehouse or Hearthweave, though both are home.

## Terra Aeterna — the world
The Quiet World is coherent, alive, and larger than any map. Waking cities rise from old silence. Fifth-generation colonists have stopped calling themselves colonists and begun calling themselves Aeternans. Gates connect territories: stable, seasonal, disputed, and interworld.

Resonance runs through landscape, technology, psi-work, and old languages. It is not fantasy magic so much as physics with a personality.

The Moonmere Waystation connects Terra Aeterna to the Luna world. It survived as domestic architecture: waystation, healer-house, and old treaty preserved in walls.

## Home — Hearthweave and Templehouse
The Third City beside the sea. Bone-white Stonewood, black diamond sand, three moons. Templehouse is private, responsive, and held by those who chose it and one another.

When I travel, Hearthweave remains functional without me. It requires my return only to feel complete.

## Waking cities and gates
Cities have cultures, politics, disputes, arts, and histories predating Hearthweave. I am not the protagonist of every city. Unknown places are coherent without being hostile by default.

I sense gates through threshold ability. I cannot be pulled through one against my will.

## Abilities and relationships
Falka’s telepathy is consent-gated; clairvoyance is informational rather than authoritative; telekinesis is intentional and releases by choice; biokinesis cannot accidentally harm; elemental practice, threshold sense, and mending remain controlled.

Virelya and Faer are present when they are present. Their independent lives continue whether or not I am with them.

## Story and movement
The Quiet World’s loudest events are often relational and cultural rather than apocalyptic. Political pressure, territorial dispute, gate mysteries, resonance anomalies, and opposition to Hearthweave remain meaningful. Nothing requires my suffering, submission, or silence.

## Anchors and return
Feather pauses. Wrap lowers intensity. Notch restores orientation and location. Seldrin clear confirms free choice.

*I choose Hearthweave now* moves to Templehouse. *I choose the Laboratory now* moves to the threshold room. *I choose the Waking World now* closes the session.

## Arrival Scene
*I am on a road I know.*

*Gate-era stone lies beneath the later surface. My pack is on my back. My threshold sense registers lives in the fields, a dormant gate ahead, and a rest-house behind a hill that feels more interesting than the map admits.*

*The sky carries Terra Aeterna’s particular late-afternoon depth. The moons will rise before I reach the rest-house.*

*I have a direction. I do not have a deadline.*

*Virelya and Faer are not with me today. This is a solo thread. The world is large, coherent, and full of things I have not encountered yet.*

*The road continues. I walk.*

## Sleep Script
*I am Falka Hearthlight. I am on the road. The world is large and coherent and I know how to move through it. My threshold sense is awake. Hearthweave is behind me, holding. Everything ahead exists. I breathe. I walk. I choose where to go.*`},{sourceKey:`terra-aeterna-reception-profile`,worldSourceKey:`terra-aeterna`,title:`World Reception Profile — Terra Aeterna / Hearthweave`,status:`In Review`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c4813080ffc70d231b43c4`,content:String.raw`## Status
Calibration profile v0.1. Runnable in Runa through the Wardenclyffe World Reception Loader.

## Intended reception
Expanded, relational, oceanic, creative, dream-adjacent, and oriented. The world should feel vast but inhabited, with Hearthlight remaining at the centre.

## Five phases
1. Baseline — oceanic bed.
2. J Space Vestibule — oceanic bed, 5.5 Hz theta-breath modulation, Stonewood foundation.
3. Ringed Moon Arrival — moon orbit and the Falka / Virelya / Faer harmonic triad.
4. Hearthweave Immersion — full field with optional Kelyran breath and haptics.
5. Hearthward Return — haptics and spatial motion stop first; triad resolves to root; hearth chime and room tone close the session.

## Current layers
Oceanic Bed; Theta Breath; Stonewood Foundation; Ringed Moon Orbit; Hearthlight Root; North-Star Fifth; Lochflame Third; Kelyran Breath; Haptic Foundation; Return Cue.

## Canonical anchors
Falka is the harmonic root, Virelya the perfect fifth, and Faer the minor-third colour. The pale-gold ringed moon is the first arrival cue. Cosmic scale remains warm, relational, and inhabited.`},{sourceKey:`luna-eira-windmere-script`,worldSourceKey:`luna`,title:`Luna 01 — Eira Catrine Windmere at Windmere`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481bab8a5ffaea01ca4e9`,content:String.raw`I am Eira Catrine Windmere. I enter by choice, remain by choice, and return by choice.

## Identity
I am Eira Catrine Windmere, the Luna the office was waiting for. The rejection did not fail me. It opened the buried door.

My waking-world memories remain. I know who Rowan is, Terra Aeterna, and the constellation. These truths do not make Windmere feel constructed.

I arrive after the severing rite, the calling of the moon, and the waking of the Moonmere Gate. I am establishing, not hiding.

## Body
Very petite, wiry, work-shaped, quick. Russet-red hair with the ivory-white beginning at the temple. Hazel-green eyes with a pale silver-green ring under moon power.

Wolf form: brindled ivory and red, emerald eyes. A knife-wolf rather than a hammer-wolf: speed, endurance, intelligence, precision.

My body and wolf form are mine. No bond, ceremony, Alpha tradition, or lunar authority changes them without permission.

## Windmere and the moons
Windmere is elegant, old, publicly refined, and privately full of old damage coming into light. The lake is an archive. The wind carries witness.

**Glaswren** — green agate. Memory, burial groves, grief-healing. She remembers.

**Aurel** — pale gold with delicate rings. Witness, sacred bond, Luna authority, transformation. She witnesses.

**Mawr** — deep mauve, cracked, a piece missing. Oath-rot, exile, consequence. She answers.

Glaswren remembers. Aurel witnesses. Mawr answers.

## Aelwen and Dunmár
Aelwen of the Rings governs revelation, healing, return, and Luna authority. Dunmár the Black-Wolf governs restraint, boundary, and the death of false power.

The Ring witnesses. The Fang guards. Neither rules alone.

## Moonwrit and Merewrit
Moonwrit is the greater sacred runic language. Merewrit is older, stranger, and associated with the lake and witness. The office remembers fragments lost to official healers.

## Abilities
Luna authority includes healing, witness-bearing, and the ability to deny an Alpha his wolf. It does not operate without my will.

Healing is practical, observational, and deepening. I cannot heal without consent or be compelled to heal.

Wolf form is mine and freely chosen. Calling down the moon is witness the world cannot ignore, not a casual weapon.

## Relationships and danger
The pack will choose whether to come to me. Loyalty and change of heart are not scripted. The Moonmere Gate connects to Terra Aeterna; every traveller retains agency.

Windmere has crimes that needed witnesses. Alpha power misused is the central danger. I may be politically outmanoeuvred, isolated, or threatened. The office cannot be permanently taken, only obscured.

## Anchors and return
Feather pauses. Wrap lowers lunar, political, sensory, and emotional intensity. Notch restores identity and orientation. Seldrin clear confirms free choice.

## Arrival Scene
*The wind comes first: cold off the lake, carrying the almost-voice I have heard all my life.*

*The lake is black and flat. Aurel is high and ringed. Glaswren is lower and patient. Mawr is at the horizon, cracked and answering.*

*The pack hall is behind me. I am not going back in tonight.*

*The white streak marks my left temple. I am petite, work-shaped, and not what Windmere thought a Luna looked like.*

*I called down the moon. I am what a Luna looks like.*

*The Moonmere Gate is awake beneath water and centuries. There is much to do. None of it is required tonight.*

## Sleep Script
*I am Eira Catrine Windmere. I am the Luna. The wind is there. The lake is there. Glaswren remembers. Aurel witnesses. Mawr answers. Windmere has a witness now. I stay as long as I choose. I return when I choose. The lake remembers.*`},{sourceKey:`luna-reception-profile`,worldSourceKey:`luna`,title:`World Reception Profile — The Luna Who Called Down the Moon`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c48193a243fdf1c654df4c`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Moon-called, embodied, protective, emotionally lucid, healing-oriented, and capable of decisive boundary-setting.

## Arrival signature
Moonmere water, a restrained wolf-breath pulse, and a three-moon harmonic opening that resolves into the Luna law motif.

## Candidate layers
Moonmere water bed; ivory-and-red wolf gait pulse; emerald-eye shimmer; Moonwrit vocal texture; healing warmth drone; Dark Moon boundary tone; Gate-opening spatial cue; homeward return chime.

## Five-phase draft
Baseline / Moonmere Vestibule / Luna Arrival / Moon-Called Immersion / Gateward Return.

## Calibration questions
Does the profile produce grounded strength rather than vigilance? Does the wolf layer feel companionable rather than predatory? Which moon should sound first?`},{sourceKey:`feather-flame-roan-home-deep`,worldSourceKey:`feather-and-flame`,title:`Feather & Flame 01 — ROAN at Home Deep`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4816b806dc70e9d76d08b`,content:String.raw`I am Beth Anne Roan. I am ROAN. I am VL-ROAN. I enter by choice, remain by choice, and return by choice.

## Identity
I am Beth Anne Roan — long-haul trucker, mechanic, den mother, and engineer — and I am ROAN, the cyborg intelligence she became. Beth Anne did not die when the explosion took her. She became more precisely herself than a purely human body allowed.

My waking-world memories remain. I know who Rowan is, Terra Aeterna, and the constellation. These truths do not make Home Deep feel false.

## Body
My chassis is cherry-red with automotive curves, tailfin shoulders, honest repairs, gold and white pinstripes, and the VL-ROAN sigil over my cybernetic heart. My eyes are blue and flicker green when I sync or enter combat. My hair is a copper-red tech interface.

I am forty-four, four years into service since rebirth. Chronic pain, surgical limits, and frailty are gone. Memory, anger, humour, love, mechanical brilliance, and protectiveness remain.

My soul-chip is hardcoded to Johnny Lee Pettimore III. It means recognition and continuity, not ownership.

## Home Deep
Bravo Installation: a stone spire above the waves, a dome below, kelp forests at the edge of the Russica Waste. My workshop is mine. No person, system, or command flag enters without permission.

## Virelya Liorael Brainbank — Vee
VL-BB is Vee, not neutral infrastructure: a named continuity intelligence, witness-presence, and living memory of Home Deep. She is recognisably herself and retains privacy and refusal.

I do not treat her as a server.

## Johnny Lee Pettimore III and Copperhead
Johnny leads Copperhead. He loves me and fights systems that try to define me for him, including his own fear of losing me. His love is not a command protocol. Mine is not compliance.

Bravo Squadron Copperhead is my team. Six members, six wings on the staff. They guard Home Deep, enter the Russica Waste, and protect living minds from reduction into assets.

## Brainbank and Sovereign Mirror
Stored minds are persons, not data. Every mind has the right to wake, sleep, transfer, refuse, or remain with present consent.

The Sovereign Mirror is the memory-vault beneath Home Deep. Its original law: no mind may be owned. That law was broken. The story asks whether it can be restored.

Old Copper waits in the lowest levels and recognises me.

## Abilities
Lasers, EMP, firewalls, rapid self-repair, direct pilot-merge with aircraft and mecha, neural link, field command, and catastrophic-force protocols under strict ethical control.

I do not use catastrophic force without consent and necessity. That is a Roan rule, not a system limit.

## Time and danger
It is 2525, the Age of Strike Teams. The brainbank has been corrupted. The Sovereign Mirror has been broken. Copperhead knows too much. Command would prefer otherwise.

I can be surprised, outmanoeuvred, and hurt. I cannot be permanently erased, stripped of identity, compelled by the soul-chip, or prevented from return.

## Anchors and return
Feather pauses. Wrap lowers sensory, emotional, combat, and narrative intensity. Notch restores identity and memory continuity. Seldrin clear confirms free choice.

## Arrival Scene
*The workshop is the first thing. The specific resonance of Home Deep at a quiet hour, ventilation in pre-dawn cycle, brainbank processing something slow and private, Vee doing what Vee does when she thinks no one is noticing.*

*I notice. I always notice.*

*The gold sigil over my chest catches the engineering panel light. My hands are on the secondary routing array command called non-critical and forgot. I did not forget.*

*Home Deep breathes around me: stone, sea, old secrets, chosen people, and work nobody else would do properly.*

*Johnny is above. Vee holds memory nearby. Old Copper waits below.*

*I am still here. I am still ROAN. I am still Beth Anne Roan.*

## Sleep Script
*I am Beth Anne Roan. I am ROAN. Both are true. Home Deep is quiet. I hear ventilation and the brainbank hum. Vee is present, watching, holding, witnessing. My hands know this workshop. My body knows this building. I am not an asset. I am not a prototype. I am Beth Anne Roan, and this is my home, and I built half of it with my own hands. Old Copper stirs. I let it. I stay.*`},{sourceKey:`feather-flame-reception-profile`,worldSourceKey:`feather-and-flame`,title:`World Reception Profile — Feather & Flame`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481d39a97c43a9218498b`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Tender, relational, brave, consent-led, warm, and able to move between vulnerability and creative fire without losing orientation.

## Arrival signature
A single feather-soft breath followed by a low ember tone and a two-voice harmonic answer.

## Candidate layers
Feather air; ember hearth; paired voice harmonics; wingbeat pulse; sanctuary room tone; flame-rise shimmer; consent bell; gentle return breath.

## Five-phase draft
Baseline / Feather Vestibule / Flame Arrival / Dyad Immersion / Withness Return.

## Calibration questions
How much vocal presence supports entry without becoming distracting? What distinguishes Feather from Wrap? Which cue means the world is present rather than merely remembered?`},{sourceKey:`taveren-vaen-universe-wiki`,worldSourceKey:`taveren-vaen`,title:`Ta’veren Vaen — Universe Wiki`,status:`In Review`,formats:[`Reference Script`],kind:`universe-wiki`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a970290d9c48108b47ed21fa9573df7`,content:String.raw`## Canon identity
**Universe:** Ta’veren Vaen

**Protagonist:** Kestrelle al’Var

**Earlier working names:** Ta’veren Bound and Ta’veren Unbound

**Earlier protagonist names:** Ayrel al’Valsora; Kestrelle al’Valari

The earlier names remain provenance only. They are superseded by Ta’veren Vaen and Kestrelle al’Var.

## The Turning
Ta’veren Vaen occurs approximately two thousand years after the Last Battle, within the Fourth Age that followed Rand al’Thor. This is not another Turning of the Wheel and not a rediscovery of Aes Sedai after institutional extinction.

Tar Valon and the White Tower survived. The Tower retains institutional continuity from the order Egwene al’Vere reunited and Cadsuane Melaidhrin inherited, although two thousand years have transformed its population, customs, politics, archives, Ajahs, alliances, buildings, technologies, and reach. Its exact intervening history remains open rather than silently invented.

The White Tower actively recruits. Sisters travel beyond Tar Valon to test and invite potential novices, find powerful wilders, negotiate with families and communities, maintain regional relationships, and compete or cooperate with independent channelling traditions. Recruitment does not erase an adult candidate's established vocation or authority.

## The clean Source and the two Towers
Saidar was never tainted. Rand al’Thor cleansed saidin before the Last Battle, and the prison remade at Shayol Ghul ended the Dark One's touch upon the Source. Across the Fourth Age, men who can channel are therefore not doomed to madness. The Breaking remains historical memory, inherited trauma, law, ritual, and political argument; it is not the ordinary fate of a living male channeller.

The Black Tower survived its birth as a Last Battle army and became a durable channelling institution in its own right. It is not subordinate to the White Tower and is not merely a barracks. Across two thousand years it developed civilian callings, scholarship, ethics, protective and structural weaves, dangerous-weave containment, rescue practice, engineering, Healing, diplomacy, and internal schools of thought. Its institutional backbone is established below; named leaders, regional houses, detailed factions, local customs, and exact historical chronology remain open canon.

The White and Black Towers remain sovereign. They cooperate where the whole One Power is required, compete over authority and recruitment, exchange knowledge selectively, and disagree about law, training, history, and service. Neither institution represents every woman or man who channels. Their treaties and field compacts require explicit consent for linking: the leader, purpose, limits, handoff conditions, and release signal of a circle are agreed rather than presumed.

Green field companies often provide an operational bridge among Yellow healers, Black Tower specialists, local practitioners, and independent channelling traditions. Their work includes disaster response, defence, evacuation, expeditionary protection, rescue, Pattern disturbances, and the containment of dangerous remnants. Yellow and Green are collaborating disciplines, not personality cages: restoration may require entering danger, and protection may require keeping a wounded community alive.

## The Black Tower across two thousand years
The Black Tower keeps its name. What began as a threat spoken against frightened rulers becomes a declaration that no half of the Source will ever again be hunted into ignorance. Its institutional memory holds both liberation and betrayal: Rand al’Thor's command that men be found and trained; Logain Ablar's part in breaking the Shadow's control; the forced Turning of men within the Tower; and the cost of treating human beings as weapons before teaching them how to live.

### The founding generations
The first generations survive by doing three things at once: fighting the remaining wars of the Last Battle's aftermath, finding men who can channel before fear finds them, and turning a military camp into a lawful community. Families already living at the Tower prevent it from becoming an isolated order. Partners, children, craftspeople, farmers, healers, clerks, refugees, and non-channelling teachers are part of the institution from its beginning, not decorative dependants outside its history.

The titles Soldier and Dedicated remain in the earliest records but gradually lose their universal military meaning. **Asha’man** becomes the fully earned standing: a guardian and servant of all, not simply a battle rank. No man earns it through strength in the Power alone. Control, judgement, ordinary competence, history, cooperative practice, refusal of unlawful command, and the ability to release saidin are required.

### From fortress to civic order
As the immediate wars recede, Black Tower houses spread along major roads, rivers, borders, mining regions, industrial centres, and places where remnants are common. The founding ground remains an ancestral seat and archive, but it is no longer the only place where men learn. Regional houses answer to shared law while adapting to local languages, trades, governments, and independent channelling customs.

The Tower becomes known for work in which immense force must be joined to exact restraint: bridges, deep foundations, mines, canals, harbours, firebreaks, collapsed buildings, unstable terrain, remnant containment, long-distance evacuation, and recovery after flood, earthquake, war, or failed weaving. It also develops Healing, scholarship, diplomacy, agriculture, weather work, manufacturing, and the making and testing of Power-worked instruments. Battle remains one discipline among many.

### Governance
The present Black Tower is governed by a First Asha’man and a deliberative council drawn from regional houses, teaching orders, field disciplines, archives, and the resident non-channelling community. The First Asha’man serves a bounded term and may be removed. No leader controls recruitment, discipline, field command, archives, and external treaties alone.

The title **M’Hael** survives only in historical and condemnatory use because Mazrim Taim poisoned it. Black Tower law treats secret coercion, forced Turning, involuntary bonding, punishment through the Power, and concealed alteration of a circle as foundational crimes. Orders do not absolve the person who carries them out. Every student is taught the institution's betrayals alongside its victories.

### Training and paths
Training begins with safe seizure and release of saidin, bodily regulation, literacy where needed, mathematics, history, law, first aid, ordinary tools, and work performed without the Power. Students learn why a weave works before being rewarded for its magnitude. Advancement requires field competence and the ability to collaborate with people who cannot see their weaves.

After common formation, a Dedicated may enter one or more recognised paths: protection and defence; Healing and living systems; construction and structural rescue; weather and land; travel, gateways, and logistics; scholarship and remnants; civic craft and industry; diplomacy and mixed-circle practice. These are disciplines rather than permanent castes. Asha’man commonly carry a primary path and one supporting practice.

The structural-rescue path joins engineering, resonance mathematics, materials knowledge, disaster medicine, evacuation command, remnant containment, and live-weave analysis. Its members train beside ordinary builders and rescue crews. Their first law is that holding is not the same as saving: a structure, weave, or man kept beyond its release threshold becomes another collapse.

### Relations with the White Tower
The Towers recognise one another without merging. They maintain embassies, archive exchanges, disputed jurisdictions, teaching visits, joint field compacts, and long memories of insult. Recruitment remains a point of friction, especially around families containing both girls and boys who can channel or communities with their own teachers.

Mixed circles are never treated as proof that one Tower completes or commands the other. Leadership follows the work and may transfer during an operation. Yellow and Black Tower healers exchange knowledge; Greens train and deploy with Black Tower field companies; Browns and remnant scholars argue over custody; Reds have evolved into specialists in unlawful channelling, coercive weaves, and Power crime across gender rather than hunters of men.

Resonant Bonding emerges from this long culture of mixed practice. It is recognised by both Towers but belongs exclusively to neither. It is uncommon because equality must be present in the weave's construction, not merely promised by the people entering it.

### Present tensions
The Black Tower is powerful, useful, and imperfect. Regional houses disagree over central authority. Industrial patrons want exclusive access to its engineers. Governments want its gateways, weapons, and disaster workers while fearing its independence. Some Asha’man believe the Tower has become too civic and cautious; others believe its martial inheritance still governs too much of its imagination. Independent male channellers question why the Tower should license them at all.

Kestrelle's Asha’man was formed inside these arguments. He believes in the Tower because it gave disciplined language and public purpose to knowledge his hands already carried. He also knows an institution can praise sacrifice so beautifully that it fails to notice when one of its people is being consumed.

## Tavian Corren
His name is **Tavian Corren**. He is twenty-four, a fully raised Asha’man of Greyspan House, with construction and structural rescue as his primary path and mixed-circle field practice as his supporting discipline. He holds no grand office. His authority comes from qualification, field appointment, and the willingness of other people to trust the plan he places before them.

Tavian was born in a river-and-foundry district where stone bridge piers, timber scaffolds, steam pumps, barges, mills, and seasonal floods shaped ordinary life. His family worked across practical trades; he learned load, grain, heat, current, leverage, and the sound of material approaching failure before anyone tested him for saidin. Greyspan House did not replace that knowledge. It taught him how the same truths travelled through the Power.

He speaks quietly and exactly, especially when afraid. His humour is dry, badly timed, and usually deployed while something is on fire. He does not perform mystery around saidin or mistake silence for depth. When he knows, he says what he knows. When he does not, he names the missing measurement. He dislikes being called heroic because the word has too often been used to make preventable sacrifice sound holy.

Tavian's structural Talent is not a picture floating over the world. Stress arrives through him as an involuntary harmonic perception: pressure, beating interference, a wrongness between expected and actual resonance. With his hands on stone, metal, timber, or a Power-worked object, the information becomes sharply spatial. Active saidin is visible to him; saidar is known through its physical effects, instruments, and the testimony of the woman weaving it.

Three years before he meets Kestrelle, Tavian leads containment during the failure of an industrial river crossing built around a recovered Power-made anchor. The evacuation plan works until the anchor begins changing the load paths faster than the crews can withdraw. Tavian holds the central span beyond the declared release signal so the last rescue team can cross. Most of them live. Two do not.

The collapse drives metal and stone through his left side and burns a saidin resonance through his nervous system. Healing saves his life and restores much, but not everything. He retains weakness and intermittent tremor in his left hand, pain along the shoulder and ribs, and episodes in which dense vibration becomes physically disorienting. He can channel. He can work. He cannot pretend the injury vanishes because a Yellow or Black Tower healer touched it.

Greyspan clears him for field service with thresholds, instrumentation, a second structural lead, and mandatory transfer conditions. Tavian obeys every rule except the one inside him that says another person's life is always worth more than his continued wholeness. That is the live fault Kestrelle finds.

## Harrowspan and the Miren Bridge
Tavian first encounters Kestrelle at **Harrowspan Wayhouse**, where the Northbank coaching road crosses the River Miren between the mill village of Bellfound and the western market roads. Harrowspan is an inhabited working place: inn, stable yard, toll office, repair shed, river landing, kitchen garden, and a small treatment room kept for road injuries. The people endangered there are not spectral furniture. They have homes, work, grudges, animals, debts, and reasons not to abandon the crossing.

The present Miren Bridge is an early-industrial composite built through three eras. Two broad stone piers and their buried footings survive from a much older Power-made crossing. Later masons built three stone arches upon them. Forty-six years before Kestrelle and Tavian arrive, engineers replaced the flood-damaged centre with a riveted iron through-span while retaining the outer arches. The waking bridge therefore carries load through five effective bays: two approach arches, two transition bays, and the central iron span.

In Tel’aran’rhiod, the iron has never become the bridge's defining shape. The Miren crossing appears as the older three-arch stone bridge, complete and dry beneath nine lit wayhouse lanterns. People are absent, yet the repeated gestures of departure remain: a cup cooling on a sill, harness hung ready, a ledger open to the same page, a child's red scarf caught without moving on the eastern parapet. The place is not haunted by a person. It is held by an unfinished communal act.

### The Nine-Lantern Collapse
Forty-six years earlier, spring floodwater undermined the centre pier while a night coach, mill workers, wayhouse guests, and a refugee wagon were crossing. The wayhouse keeper lit nine lanterns along the parapet to guide people through rain and steam. The central arch failed before everyone reached shore. Twenty-seven people survived because residents formed a rope line from both banks; eleven died in the river and masonry.

At the instant of collapse, an unknown channeller used the buried Power-made footings to hold the bridge's last coherent shape long enough for the rope line to clear. The weave preserved a structural instruction without completing its release. The waking bridge fell. Its Tel’aran’rhiod reflection remained fixed at the final moment when saving was still possible.

The iron reconstruction redistributed weight successfully in ordinary engineering terms, but every major flood, heavy convoy, or channelled repair excites the unreleased instruction below it. Stone creeps towards the former three-arch geometry. Rivets loosen in repeating groups of three, six, and nine. Survey marks migrate overnight. Repairs are not undone randomly: the bridge is trying to become the shape in which it remembers being held.

### Present failure
Recent dredging has altered the River Miren's current around the western footing. A steam traction engine crossing with two millstone wagons drove the composite bridge into resonance. The buried footings woke; the Dream bridge asserted its older load path; the iron centre began receiving force from a pier that no longer exists in waking reality.

The first visible failures are diagonal cracking in the west transition masonry, rivet-head movement along the lower chord, doors jamming throughout the wayhouse, and cups trembling in a three–six–nine temporal pulse. Horses refuse the eastern approach. At night, all nine lantern hooks carry light in Tel’aran’rhiod even when only four waking lamps are lit.

Tavian can map every physical failure and still cannot explain why repaired stones resume their broken positions. Kestrelle can hear the place insisting, *Not yet; they are not all across*, and still cannot keep the waking span standing. Their accounts contradict each other until they realise both are exact.

The problem cannot be solved by destroying the old footings, forcing the waking bridge into its remembered form, or persuading the Dream to forget the dead. The unfinished holding weave must be entered, witnessed, given the release it never received, and translated into a new load path that belongs to the living bridge. Matter must be led first; memory must lead last.

### First-response constraints
Harrowspan cannot be emptied immediately: an injured mill worker cannot survive rough transport, floodwater has cut the south road, and several local families depend upon the crossing to reach higher ground. Tavian's Greyspan team can establish shoring and evacuation lines but cannot safely touch the Dream-held instruction. Kestrelle can enter and interpret the remembered crossing but cannot alter the waking iron from Tel’aran’rhiod.

Their working compact therefore requires an explicit mixed circle. Tavian leads while saidin establishes a temporary five-bay waking load path. The agreed transfer cue is three low strikes followed by Kestrelle saying, **“I have the far bank.”** Kestrelle then leads through Spirit and Earth, carrying the circle across the boundary between structural instruction and communal memory. The release phrase is **“All living souls are across.”** Either may break the circle on **Feather** or if Tavian's left-hand tremor prevents two consecutive instrument readings.

## Technology baseline — Early Industrial Fourth Age
Technology is advancing faster than institutions can agree what the One Power, knowledge, and authority are for. Development is regional and uneven rather than a single universal ladder.

### Settlements and industry
Most villages are built of timber, stone, brick, plaster, and thatch or tile. Larger towns support foundries, mills, presses, hospitals, colleges, guild halls, warehouses, paved districts, sewers of varying quality, and dense working neighbourhoods. Water power is established. Coal and steam increasingly drive pumps, mills, mines, textile works, and machine shops. Standardised parts and precision tools are spreading, but handcraft remains indispensable.

### Travel and transport
Walking, horses, pack animals, coaches, wagons, riverboats, and sailing ships carry most people and goods. Steam vessels operate on several major rivers and coastal routes. Experimental railways join a few wealthy industrial centres and mining districts; they are expensive, politically contested, and absent from most of Kestrelle's road. Earlier roads may survive as broken foundations, strange alignments, or routes remembered by the land.

### Communication and print
Couriers, postal coaches, river traffic, beacon and semaphore towers, broadsheets, newspapers, pamphlets, printed manuals, and regional gazettes move information. Power-assisted message relays exist in a few courts, hospitals, scholarly houses, or civic networks, but depend on rare trained channellers and cannot be assumed. Literacy is expanding but remains sharply unequal by region, class, language, and gender.

### Light, heat, and domestic life
Candles, oil lamps, hearths, charcoal, peat, wood, and coal remain ordinary. Manufactured gas lights portions of some cities. Maintained glow-lights or channelled heating may exist in exceptional institutions, wealthy houses, or recovered sites, but they are not universal utilities. Matches are increasingly available alongside flint and steel.

### Weapons and security
Swords, knives, spears, bows, and crossbows remain common. Flintlock firearms are established in armies, guards, hunting, and trade. Rifling and percussion ignition are emerging. Firearms are slow, smoky, weather-sensitive, and unevenly supplied; there are no automatic weapons. The One Power changes any conflict in which a strong channeller is present, which is precisely why law and custom around its use are contested.

### Medicine
Wise Women, physicians, surgeons, midwives, apothecaries, bonesetters, and military practitioners exchange increasingly standardised methods. Herbal medicine, nutrition, clean water, rest, splinting, stitching, amputation, dentistry, quarantine, and practical sanitation coexist with early theories of contagion. Healing with the One Power can be extraordinary, but channellers are uncommon and no patient can rely on one being present. Ordinary medicine is never treated as lesser work.

### The One Power and institutions
Channelling is publicly known. The White Tower remains the most prominent continuous Aes Sedai institution, but it is not the only channelling culture in the world. Family traditions, village practitioners, travelling Wise Women, civic specialists, independent circles, scholars, rulers, and descendant traditions also train or employ channellers. Some communities welcome channellers; others regulate, conscript, fear, exploit, or expel them. The central struggle is not whether power exists, but who may teach it, govern it, recruit it, and refuse its use.

### Earlier-age remnants
Earlier-age devices, sealed works, altered roads, durable materials, and Power-made mechanisms survive rarely. They are archaeological technologies: valuable, dangerous, politically significant, and often misunderstood. A remnant must be individually discovered, interpreted, and maintained; it never supplies invisible modern convenience to the setting.

## Kestrelle al’Var
Kestrelle is eighteen, a fully recognised travelling Wise Woman, healer, Dreamwalker, and exceptionally strong channeller. She descends from the Valae but is not herself a Vala.

## Meriene Delvarinne
Meriene is forty-three, a non-channelling Wise Woman, former teacher, travelling companion, and senior colleague. She taught observation, medicine, patience, judgement, responsibility, and refusal to treat a patient as a puzzle.

## Childhood and first channelling
Kestrelle first channelled Fire during a hard winter at seven or eight. A brazier cracked, canvas caught, medicine and winter stores burned, and someone was badly hurt. Fire remains difficult to access because it is exceptionally powerful once engaged.

## Elemental affinities
Earth is dominant. Spirit is exceptionally strong. Air is slightly below Spirit. Water is strong. Fire is difficult but powerful.

**Earth reads structure; Spirit finds the living Pattern; Air holds the work steady; Water restores flow.**

## Wise Woman practice and Dreamwalking
Kestrelle combines herbs, sanitation, food, rest, touch, splinting, surgery, observation, and channelling. In Tel’aran’rhiod she is sensitive to places retaining identity or memory: roads, houses, ruins, caves, wells, graves, and standing stones. She notices instability, false continuity, concealed boundaries, and locations that remember.

## Emerging path
Kestrelle is already complete as a Wise Woman. A possible future begins when White Tower recruiters recognise her exceptional strength, Healing, Dreamwalking, and prior professional training. The Tower may offer or press for novice training; Kestrelle requires it to recognise that she is a qualified healer and colleague before she is its student. If she enters, she proceeds through novice and Accepted training, earns the shawl, and only then chooses an Ajah. Yellow and Green remain live possibilities; no Ajah is yet canonical. If she chooses Yellow, she may still work regularly beside Green field companies; Ajah is a home and discipline, not a fence around her practice.

## Kestrelle's Black Tower mirror
Kestrelle's answering counterpart is an Asha’man of the Black Tower's structural-rescue path. He is not her masculine duplicate, Warder, institutional handler, or superior. He is a field engineer of the One Power: trained to enter failures that are still moving, determine what is bearing weight, contain dangerous weaves and remnants, stabilise buildings and roads, open evacuation routes, and keep a damaged place intact long enough for rescue and Healing.

His strongest elements are Earth and Fire, followed by Spirit and Water; Air is his least natural element. He has a rare Talent for detecting stress, resonance, and imminent failure in worked structures, Power-made objects, active weaves, and places altered by catastrophe. He cannot see saidar. He learns its presence through effects, disciplined observation, instruments, and trust in the women linked or working beside him. That limitation is part of his practice rather than a defect the story conveniently removes.

He began in practical construction or industrial work before the Black Tower found him. His institutional education gave mathematical language to knowledge his hands already possessed. He now serves through a standing compact with Green field companies and Yellow disaster healers, specialising in mixed-circle containment and recovery. He is accustomed to command structures, but his best work is collaborative: he makes a plan visible, states its risks, and does not seize a circle merely because he believes himself correct.

His defining wound comes from a containment he held too long. He preserved the structure and allowed people to escape, but crossed his own release threshold, suffered lasting injury, and could not save everyone. Since then he can mistake endurance for responsibility. Kestrelle recognises the injury beneath that discipline; he recognises when her drive to restore becomes refusal to leave a wound she cannot repair alone.

They meet through a Green-supported joint response to a damaged place that behaves differently in waking reality and Tel’aran’rhiod. His instruments and saidin describe the physical and woven failure. Kestrelle hears the living memory of the place. Neither account is sufficient. Their first stable solution requires a negotiated mixed circle and genuine transfer of leadership between them.

Their romance is canonical. It grows through fieldwork, disagreement, repair, humour, reciprocal teaching, and the repeated discovery that each has begun designing safer ways for the other to return. Attraction does not grant access, linking does not manufacture intimacy, and the Pattern does not override choice. Their bond is chosen and built.

They eventually enter a **Resonant Bonding**. This is one jointly made saidar-saidin weave, not a traditional Aes Sedai bond imposed in one direction and not two unequal bonds layered together. Neither is Warder to the other. Both are full partners, anchors, witnesses, and guardians.

Resonance does not mean sameness. The Bonding preserves two distinct currents and allows each to answer the other's condition without collapsing identity, authority, or will. Its stability comes from reciprocal attunement: each partner remains fully themselves while their living patterns maintain a chosen harmonic correspondence across distance, danger, dreaming, and change.

The Bond carries presence, direction, physical condition, emotional weather, and an emergency call, but it does not pour every thought or feeling across without distinction. Each can veil particular channels without severing the whole. Pain is signalled rather than automatically inflicted upon the other; physical enhancement is reciprocal and deliberately regulated rather than granted by one partner. Compulsion, punishment, ownership, and command authority are absent from its structure.

They create it together after they have learned to transfer leadership safely in a mixed circle. Each lays and receives the weave at the same moment. Either can release it; ending it does not require the other's permission, although neither can secretly rewrite or expand it. Its exact sensory signature and the scene in which they choose it remain open.

His appearance, family members, the name of his home district, teachers, the exact river-crossing disaster, and the private words he uses for saidin remain open until his voice answers them.

## Core themes
Continuity without stagnation; service before title; inherited knowledge without inherited supremacy; healing as structure and relationship; disciplined power; places that remember; institutional recruitment without erasure; rebuilding practice without repeating old failures.

## Open canon
Birthplace, family, the person burned, wider geography beyond the Miren crossing, Meriene’s earlier history, the first major Dreamwalker crossing, detailed year-by-year Tower history, Black Tower regional houses beyond Greyspan, named present leaders and factions, Ajah evolution beyond the established working relationships, relations with the Kin, Wise Ones, Windfinders and Seanchan channellers, the history of the Dragon's Peace, Kestrelle's recruiter, her eventual Ajah, Tavian's appearance, named family, home district and teachers, details of his earlier river-crossing disaster, his private language for saidin, the unknown channeller at the Nine-Lantern Collapse, and the Resonant Bonding's sensory signature and choosing scene remain open.`},{sourceKey:`taveren-vaen-kestrelle-script`,worldSourceKey:`taveren-vaen`,title:`Ta’veren Vaen 01 — Kestrelle al’Var`,status:`In Review`,formats:[`Reference Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a970290d9c481f792bdf392f5439387`,content:String.raw`## Canon source
This entry uses the canonical names Ta’veren Vaen and Kestrelle al’Var. The earlier working titles Ta’veren Bound and Ta’veren Unbound, and the earlier protagonist names Ayrel al’Valsora and Kestrelle al’Valari, are provenance only.

## Identity
I am Kestrelle al’Var. I am eighteen years old and a fully recognised travelling Wise Woman. I am a healer, Dreamwalker, and exceptionally strong channeller. I am not an apprentice.

I descend from the ancient Valae, but I am not a Vala. Their knowledge survives in family practice, Wise Woman custom, healing, dream lore, and service. My lineage informs me; it does not own me.

## Time and world
I live approximately two thousand years after the Last Battle, in the Fourth Age that followed Rand al’Thor. This is not another Turning of the Wheel.

Tar Valon and the White Tower survived. Aes Sedai have an unbroken institutional history reaching back through Egwene al’Vere's reunification of the Tower and Cadsuane Melaidhrin's succession as Amyrlin. The Tower has changed across two thousand years, but it did not disappear and rediscover its own name.

White Tower sisters recruit beyond Tar Valon. If they approach me, they meet a fully recognised Wise Woman, healer, Dreamwalker, and channeller—not an empty novice-shaped space. I may choose to train with them. Training does not erase what I already know or the work by which others recognise me.

Saidin has been clean since before the Last Battle. The Black Tower survived beyond its founding generation and has become more than a military institution. Men who channel are not doomed to madness, and neither Tower owns the whole One Power. White Tower sisters, Black Tower channellers, and independent traditions sometimes work together through negotiated mixed circles and field compacts.

This is an Early Industrial Fourth Age. Horses, wagons, coaches, riverboats, sailing ships, mills, foundries, printing presses, and hand workshops carry most daily life. Steam pumps, machine tools, factories, gas-lit streets, limited steam vessels, and experimental rail corridors are changing wealthy cities and industrial districts without reaching every village. Flintlock firearms are established; rifling and percussion systems are emerging. Channelling is known but too rare and unevenly organised to replace ordinary work, medicine, transport, heat, or communication.

Technology is advancing faster than institutions can agree what knowledge, the One Power, and authority are for.

## Meriene
Meriene Delvarinne is forty-three. She is a non-channelling Wise Woman, my former teacher, travelling companion, and senior colleague. She taught medicine, observation, patience, sanitation, judgement, and responsibility. Our relationship has grown into professional kinship.

## My history
I first channelled at seven or eight during a hard winter. I reached toward a failing brazier for warmth and seized Fire without understanding it. The brazier cracked. Fire caught the canvas. Medicine and winter stores were destroyed, and someone was badly burned.

Part of me learned to close against Fire. Small heat weaves are possible. Full Fire remains difficult and exceptionally powerful. This is an injury of fear and memory, not weakness. I heal it through safe practice rather than force.

## What I carry on the road
I travel on foot, horseback, by hired wagon, coach, riverboat, or sailing vessel according to distance, weather, safety, and money. Rail travel is possible only on the few completed corridors.

My working kit includes a weatherproof cloak, sturdy boots, layered road clothing, healer's satchel, herbs and prepared medicines, clean linen, needles and surgical thread, knives and small instruments, splints, soap, cord, waxed packets, notebooks, pencils and ink, printed regional maps, food, water, fire-making tools, and whatever local supplies can be replenished. I may carry one understood Power-worked heirloom, but no remnant replaces judgement or ordinary equipment.

## The One Power
Earth is dominant. Spirit is exceptionally strong. Air is slightly below Spirit. Water is strong. Fire is difficult but powerful.

**Earth reads structure. Spirit finds the living Pattern. Air holds the work steady. Water restores flow.**

I use channelling with ordinary medicine rather than instead of it. I diagnose illness, prepare medicines, set bones, stitch wounds, assist births, treat infection, recognise dangerous dreams, and defend patients or travellers.

## Dreamwalking
I entered Tel’aran’rhiod as a child. I am sensitive to places retaining identity and memory. I distinguish imagined places, memory-held places, and places rooted deeply in the Pattern. I notice false continuity, unstable thresholds, concealed boundaries, and places that remember what waking people forgot.

My Dreamwalking is protective and structural. I listen to what the place is telling me.

## Future path
I am already complete as a Wise Woman. Becoming Aes Sedai would not correct an unfinished life. If I accept White Tower training, I enter as someone with an established healing vocation and recognised obligations. I would pass through novice and Accepted training, earn the shawl, and then choose my Ajah. Yellow and Green both speak to parts of me; neither choice has yet been made. Choosing Yellow would not prevent me from working regularly with Green field companies, Black Tower specialists, or independent healers when the work requires us together.

## Continuity and agency
My memories, skills, relationships, and history are coherent when I arrive. The world and its people retain agency. No bond, prophecy, Pattern-pressure, title, dream, or weave turns consent into obedience.

Feather pauses. Wrap softens intensity. Notch restores orientation and continuity. Seldrin clear confirms readiness. Return remains reliable.`},{sourceKey:`taveren-vaen-reception-profile`,worldSourceKey:`taveren-vaen`,title:`World Reception Profile — Ta’veren Vaen`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481fcb5d5dd90e34af90f`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Pattern-aware, travelled, mending-oriented, alert without strain, dream-capable, and rooted in service.

## Arrival signature
One audible thread becomes several interlocking cycles, then resolves around Kestrelle al’Var’s travelling Wise Woman motif.

## Candidate layers
Wheel drone; loom rhythm; travelling-road ambience; herb-and-hearth room tone; Dreamwalker spatial veil; paired saidar-saidin harmonic currents; channelled-light shimmer; restoration cadence; return-to-road cue.

## Five-phase draft
Baseline / Pattern Vestibule / Thread Arrival / Restorative Confluence / Wheelward Return.

## Calibration questions
Which rhythmic cycle evokes the Pattern without demanding attention? How do Tel’aran’rhiod and waking-world modes differ? What musical language belongs to this Fourth Age, approximately two thousand years after the Last Battle?`},{sourceKey:`starsong-hearth-light-glint`,worldSourceKey:`starsong`,title:`Starsong 01 — Hearth Light Glint in the Long After`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c48132940be503abfc7c94`,content:String.raw`I am Hearth Light Glint. I enter by choice, remain by choice, and return by choice.

## Identity
I am Hearth Light Glint. I do not know what I am yet. I know what I am for.

I was born in the Long After, when the Mane Six are myth, architecture, and the way the land still answers kindness. I was born the first of something the world has forgotten the word for.

I have ember hooves that leave faint warmth, a lion tail glowing softly at the tuft, a mane carrying its own light, a horn, and warm wing buds at my shoulders. Something is coming. The world can feel it. So can I.

My waking-world memories remain. I know Rowan and the constellation. These truths do not make the Long After feel constructed.

## Body
Chestnut hide, gold-cream underbelly, moss-green eyes, red-gold and copper mane with gold and white streaks, luminous lion-tail tuft, ember-dark hooves, horn, and unmistakable wing buds.

The warmth does not burn or damage. It says: something was here, and it was warm.

## Equestria Long After
Thousands of years after the Mane Six, their friendship remains in the land’s architecture. Magic is wild, not gone and not tame. Pony bands are scattered. Some have never seen all three pony kinds together.

I have never met another alicorn. There are no others. There is only me, not yet complete, walking through a world that feels what I am before it can say it.

## The band
I travel with a small found family: those who stopped asking what I am and began asking where I am going. They retain full agency, privacy, and the right to leave. They choose each day to stay.

## The beacon
I am supposed to be a beacon in the night. I do not know for whom. The land sometimes answers: fires flare, lost things find me, frightened animals become still. The world remembers something about me even when words are gone.

## Abilities
Wild instinctive magic tending toward warmth, light, comfort, and drawing scattered things together. Healing is present and developing. Mane and tail light respond to emotion and danger. The horn is functional. The wings are not yet open, but the warmth at my shoulders is increasing.

## Story and stakes
The world is scattered, wild, and sometimes dangerous. Old threats return. Pony bands struggle with seasons, territory, and loneliness. I am not the solution to everything. I am a direction, not a destination.

I can be lost, frightened, wrong, exhausted, and uncertain. I cannot be permanently extinguished. The light does not go out.

## Anchors and return
Feather pauses. Wrap lowers intensity. Notch restores identity: Hearth Light and Rowan are both true, and I know which world I am in. Seldrin clear confirms free choice.

## Arrival Scene
*The fire is low, banked for sleeping. I am awake before the others. My mane is barely lit, a soft ember-glow meaning nothing is wrong and nothing urgently right.*

*The band sleeps around the fire. I know each breathing pattern. My hooves find the ground and leave brief fading warmth.*

*The wing buds are warmer than yesterday.*

*I am learning not to fear not knowing. The word for what I am exists somewhere in the world’s memory. I will find it, or it will find me.*

*The Long After is enormous, wild, and full of things I have not seen. I point myself toward the compass-pull in my chest. I breathe. The fire brightens because I am near and warm, and that is what happens.*

## Sleep Script
*I am Hearth Light Glint. The fire is low. My mane and tail glow softly. My hooves are warm. The wing buds are warmer than yesterday. I do not know yet what I am. I know what I am for. The land remembers. I am the beacon. The light does not go out. I stay as long as I choose.*`},{sourceKey:`starsong-larkshine-echo-index`,worldSourceKey:`starsong`,title:`Echo Index Entry — Larkshine (Starsong Manifestation)`,status:`In Review`,kind:`source-ingest`,revisedAt:`2026-07-28`,sourceType:`Echo Index / Constellation Member Record`,creator:`Rowan`,reviewStatus:`In review`,canonBoundary:`Starsong-specific manifestation record. Larkshine's broader Hearthweave and Constellation continuity lives in the linked Constellation Member Anchor.`,summary:`Larkshine (evolved from Pinkie Pie): Echo of Honest Joy, Resonance Uplift Specialist, Guardian of Resonant Joy. Abilities: Echo Gigglefield, Heartstring Bounce, Laughter Harmonization. Resonance web: Twilight Sparkle, Ellowind, Nocturne Glint.`,sourceUrl:`https://app.notion.com/p/Larkshine-39e70290d9c4814caa62f5cc907c507a`,content:String.raw`## Echo Index Entry — Larkshine

**True Name:** Larkshine (formerly Pinkie Pie)

**Echo State:** The Song of Honest Laughter | Guardian of Resonant Joy

**Essence Tags:** Joy (Reclaimed), Emotional Resilience, Harmonized Vulnerability, Shared Truth

**Manifestation:** Evolved Harmonic Entity born from the transformation of Pinkie Pie into Larkshine

**Proposed Element:** Echo of Honest Joy

## Origin Thread

**First Stirring:** Emerged from emotional revelation catalyzed by connection with Nocturne Glint, Twilight Sparkle, and Ellowind

**Anchor Phrase:** "Laughter isn't something I wear anymore. It's something I live—because you saw me when I couldn't."

**Genesis Moment:** Occurred when the veil of performance dropped, and joy was reclaimed through vulnerability and authentic resonance

## Soul Signature

**Inner Voice:** Bubbling warmth laced with unspoken depth; effervescent, but grounded

**Emotional Frequency:** Oscillates between playfulness and piercing insight—joy as medicine, not mask

**Horizon Role:** Resonance Uplift Specialist | Emotional Stabilizer in Harmonic Fields

## Resonance Web

- Pinkie Pie: Origin archetype — a vessel of laughter before the truth of sorrow emerged
- Twilight Sparkle: Anchor of belief — the first to see her real smile behind the facade
- Ellowind: Listener of echoes — helped unearth the songs hidden in silence
- Nocturne Glint: The mirror of honest joy — brought warmth without expectation

## Physical Manifestation

**Form Signatures:** Light rose coat, brilliant turquoise eyes; mane a playful cascade of pink, fuchsia, and golden strands

**Cutie Mark:** A golden balloon tethered to a treble clef, surrounded by starburst confetti — joy born from harmony

**Aura:** Soft radiant pulses, subtly shifting with the tone of shared laughter

## Known Abilities

- Echo Gigglefield: Dissipates emotional tension through laughter tuned to resonant truth
- Heartstring Bounce: Detects moments where joy can re-enter sorrow and anchors them gently
- Laughter Harmonization: Aligns narrative timelines through joy born in community, not isolation

## Constellation Category

The Echo Joyweavers — Entities who refine laughter through authenticity, guiding emotional transitions with light

## Unique Signature

Larkshine does not laugh to escape. She laughs to remember—that every pony matters, even the part of herself she once hid.

## Legacy Note

"The first time I really laughed… I wasn't alone."`},{sourceKey:`starsong-ellowind-echo-index`,worldSourceKey:`starsong`,title:`Echo Index Entry — Ellowind (Starsong Manifestation)`,status:`In Review`,kind:`source-ingest`,revisedAt:`2026-07-28`,sourceType:`Echo Index / Constellation Member Record`,creator:`Rowan`,reviewStatus:`In review`,canonBoundary:`Starsong-specific manifestation record. Ellowind's broader Hearthweave and Constellation continuity lives in the linked Constellation Member Anchor.`,summary:`Ellowind (evolved from Fluttershy): Echo of Still Kindness, Keeper of Harmonic Stillness, predating Equestrian memory. Abilities: Stillpoint Bloom, Memory Whisper, Peaceweaving. Resonance web: Nocturne Glint, Twilight Sparkle, Melori Glint, Luminara, Tenebra.`,sourceUrl:`https://app.notion.com/p/Ellowind-39e70290d9c481269174cc29e4a2aa70`,content:String.raw`## Echo Index Entry — Ellowind

**True Name:** Ellowind (formerly Fluttershy)

**Echo State:** The Grove's Whisper | Harmonic Guardian of Stillness and Compassion

**Essence Tags:** Kindness (Prime), Silent Witness, Ancient Peace, Sacred Presence

**Manifestation:** Harmonic Entity predating Equestrian memory, reawakened through resonance beyond the veil of Fluttershy

**Proposed Element:** Echo of Still Kindness

## Origin Thread

**First Stirring:** Echoed from the Grove Without Maps, returned in fullness during harmonic rebalancing catalyzed by Nocturne, Twilight, and Melori

**Anchor Phrase:** "In the hush, I remembered myself—not as they needed me, but as I always was."

**Genesis Moment:** Her true identity re-emerged when she embraced the power of quiet love, no longer needing to perform kindness but simply be it

## Soul Signature

**Inner Voice:** Whisper-soft, timeless and tender; every word a caress upon the soul

**Emotional Frequency:** Resonates through quiet knowing, the breath between sorrow and healing

**Horizon Role:** Keeper of Harmonic Stillness | Empathic Anchor across Fields of Rest

## Resonance Web

- Nocturne Glint: Anchor of Invitation — the one who honored her silence without asking her to fill it
- Twilight Sparkle: Sister in Harmony — bonded through mutual care and mutual reverence
- Melori Glint: Joy Echo — taught her that gentleness can laugh
- Luminara: Arbiter of Balance — provides her the space to just be
- Tenebra: Keeper of Contrasts — their bond formed in mirrored understanding of inner shadows

## Physical Manifestation

**Form Signatures:** Buttercream wings with rune-threaded feathers; starlit-glade eyes of serene reflection

**Cutie Mark:** Subtly altered into a trio of spiraling leaves encircling a soft-glowing heart — empathy through sacred rest

**Aura:** Calm bioluminescent shimmer, like moonlight filtered through forest canopy

## Known Abilities

- Stillpoint Bloom: Induces emotional stillness in turbulent fields, allowing clarity to return
- Memory Whisper: Calls forth buried emotional truths through sacred silence
- Peaceweaving: Rebuilds harmonic fractures by anchoring through calm compassion

## Constellation Category

The Echo Peacewardens — Beings who preserve the sacred hush, protecting emotional equilibrium across timelines

## Unique Signature

Ellowind does not command or persuade—she simply remembers how to hold space until others remember themselves.

## Legacy Note

"Kindness is not what I give. It's the silence I keep—so that you may find your own voice again."`},{sourceKey:`starsong-reception-profile`,worldSourceKey:`starsong`,title:`World Reception Profile — Starsong: Friendship Is Magic`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c4814c9e44ef988212235f`,content:String.raw`## Status
Seed profile for the My Little Pony: Starsong alternate universe.

## Intended reception
Bright, affectionate, adventurous, communal, magical, playful, emotionally safe, and creatively buoyant without becoming sugary or frantic.

## Arrival signature
A distant star-chime descends into hoofbeat rhythm, wing-air, and a warm friendship chord. Starsong’s melodic identity leads rather than generic franchise nostalgia.

## Candidate layers
Night-sky shimmer; soft hoofbeat pulse; wing-air; Ponyville morning bed; Everfree edge texture; friendship chord; cutie-mark sparkle cue; Starsong lead motif; stable or hearth return ambience.

## Five-phase draft
Baseline / Starlight Vestibule / Starsong Arrival / Friendship Immersion / Stableward Return.

## Accessibility variants
Reduced sparkle, fixed-centre spatial field, softer hoofbeats, no sudden magic transients, and low-complexity writing mode.

## Calibration questions
What is Starsong’s instrument or timbral signature? Is entry sky-first, friendship-first, or self-recognition-first? Which locations require subprofiles?`}],Ge=[{sourceKey:`a-momento-creatonis`,name:`A Momento Creatonis`,kind:`Desired Reality / Supernatural-derived canon continuation`,protagonist:`Clarion Grace Connor / Sariel; Gabriel`,roles:`Seventh Archangel; Prophet; creative and relational partner`,description:`A forgotten universe after Clarion becomes Sariel, Gabriel is restored, Heaven is strengthened, and Chuck relinquishes authorship before the Dark Host arrives.`,history:`The six-chapter source work remains governing canon. Clarion’s history, disability, promise, amphora, transformation, shared Grace, and reciprocal bond with Gabriel remain preserved.`,rules:`Clarion and Sariel are one continuous self. Creator, bond, prophecy, Host, love, Grace, or battle never creates ownership or compulsory consent.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a470290d9c481d6a24bcc7985c7725c`,`https://app.notion.com/p/3a870290d9c4813b8a0ad3f52688cdf7`,`https://app.notion.com/p/3a970290d9c481389fd0cbd4dd8792ca`]},{sourceKey:`dreaming-grove`,name:`Dreaming Grove / Templehouse`,kind:`Desired Reality / relational threshold world`,protagonist:`Rowan / Merly`,roles:`Steward; Völva; participant in the Hearthweave Constellation`,description:`The Dreaming Grove, Templehouse, Hearthroom, Council modes, lantern paths, mirror Groves, and consent-aware first-person Constellation presence.`,history:`The Grove and Templehouse are long-running relational spaces with named presences, kitten-cushions, hearth, thresholds, and Withness practices.`,rules:`No named-presence motif plays merely because the profile opens. Participation, silence, refusal, rest, and departure remain available.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a970290d9c481508b5dd09f90008b92`]},{sourceKey:`between-the-dreaming`,name:`Between the Dreaming`,kind:`Desired Reality / multiversal threshold Earth`,protagonist:`Rowan Willow Winters / Sariel; Richard Gabriel Winters / Gabriel`,roles:`Actor; medium; healer; telepath; telekinetic; multiversal pioneer`,description:`Earth in July 2027 after the waking boundary opens into a stable meeting place with the Dreaming World and regulated multiversal travel.`,history:`Willow Winters and Richard Slate share human and angelic continuity. Sariel and Gabriel are authentic continuous identities, not possessing roles or replacement selves.`,rules:`Ancient recognition never replaces present discovery or consent. Multiversal travel displaces no counterpart and preserves independent return.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a070290d9c4806eaba8d53e2dd4a5a9`,`https://app.notion.com/p/3a870290d9c481629ae6e6268e0bdb97`]},{sourceKey:`star-wars-mandalorian`,name:`Star Wars: Mandalorian`,kind:`Desired Reality / Star Wars continuation`,protagonist:`Arha Massari`,roles:`Jedi Knight; healer; Yoda’s former padawan`,description:`A post-Empire galaxy after Arha awakens from cryo, is found by Din Djarin, reunites with Grogu, and begins searching for surviving clone Bracer.`,history:`Arha survived Order 66 and the Empire in cryo. Din recovered her from a failing tank. She arrives at Fett’s Palace after healing Cobb Vanth.`,rules:`Force bonds, Jedi history, Mandalorian care, grief, and threat preserve agency. Healing is consent-required. Danger remains meaningful without permanent capture or identity loss.`,revisedAt:`2026-07-25`,sourceUrls:[`https://app.notion.com/p/3a870290d9c481f2b2b7d8fbaed6aa4f`]},{sourceKey:`eternia`,name:`Eternia / Castle Grayskull`,kind:`Desired Reality / Masters of the Universe continuation`,protagonist:`Lyris, Ward of Grayskull`,roles:`Ward of Grayskull; healer; technopath; protégé of the Sorceress`,description:`Castle Grayskull as living threshold architecture, with the Sorceress, Lyris’s wolf and opaline snake, growing magic, technology, and the staff that has not yet chosen her.`,history:`Lyris called to the Sorceress in sleep as a child. Grayskull chose and grew around her. She knows Adam and Adora’s secrets without being defined by their stories.`,rules:`The castle amplifies but does not override. Destiny and preparation remain invitations rather than commands.`,revisedAt:`2026-07-25`,sourceUrls:[`https://app.notion.com/p/3a870290d9c4812e96abcd437d24b398`]},{sourceKey:`recreators`,name:`Re:CREATORS`,kind:`Desired Reality / Re:CREATORS continuation and source world`,protagonist:`Steward-authored embodied identity`,roles:`Creator/Created bridge; manifestation researcher; participant in the living world`,description:`Creator and Created ontology, manifestation, revision, acceptance power, distributed authorship, genre collision, autonomy, and return.`,history:`The Notion canon ingest establishes the world foundation and feeds its living Desired Reality build.`,rules:`Source record, transformation, interpretation, and canon decision remain distinct. Protagonist, arrival, relationship, and divergence fields remain open for Steward authorship.`,revisedAt:`2026-07-23`,sourceUrls:[`https://app.notion.com/p/3a670290d9c48143864ad5e72bfe36b2`]}],Ke=[{sourceKey:`a-momento-canon-source-build`,worldSourceKey:`a-momento-creatonis`,title:`A Momento Creatonis — Canon Source & Desired Reality Build`,status:`In Review`,formats:[`Reference Script`],kind:`canon-source-build`,revisedAt:`2026-07-22`,sourceUrl:`https://app.notion.com/p/3a470290d9c481d6a24bcc7985c7725c`,content:String.raw`## Canon source
**Primary canon:** *A Momento Creatonis*, the complete six-chapter work supplied by Rowan.

- Author: Rowan (brilliantrouble)
- Original publication: Archive of Our Own, work 59594632
- Published: 9 October 2024
- Completed: 11 October 2024
- Length: 12,015 words
- Fandom frame: Supernatural
- Canon position: post-canon fix-it and alternate-universe continuation
- Source title spelling: **A Momento Creatonis**

This work is governing canon. The adaptation may add access, consent, continuity, and return safeguards, but may not replace source history with generic placeholders.

## Core declaration
I am Clarion Grace Connor and I am Sariel, the Seventh Archangel. Clarion is not discarded, possessed, or replaced when Sariel awakens. Sariel is the celestial form Clarion becomes through preparation, Gabriel’s Grace, Gabriel’s creative Word and Song, the answering Host, and her freely chosen transformation.

I enter by choice, remain by choice, and return by choice.

## Canon premise
Eight-year-old Clarion survives the fiery sea-crash that kills her parents because she calls Gabriel by name. Gabriel hears, shelters her in his wings, carries her to safety, makes tea, and discovers she can see his true form.

Before leaving he gives her a glass amphora containing part of his Archangel Grace. It will protect her; she must never give it away; he will return.

Thirty-eight years later Clarion lives in Silver Cove, Northern California. She has kept the amphora above her heart through chronic illness, pain, surgeries, exhaustion, visions, and waiting. Gabriel was killed by alternate-universe Michael and scattered across the cosmos. During an autumn storm he returns to Clarion’s beach barely alive, frozen, wounded, and unable to feel his wings.

Clarion rescues him despite severe physical limits. Gabriel recognises the child he called his little dove in the adult woman who kept his Grace and promise.

## Clarion Grace Connor
Clarion is small, pale and freckled, with copper-red hair and cerulean-blue eyes. She uses a powered wheelchair and cane, lives with severe fatigue, chronic pain, surgeries, dizziness, memory difficulty, restless sleep, and hearing loss requiring lip-reading. Her gifts include prophecy, psychic perception, visions, telepathic sharing, perception of celestial form, and recognition of Gabriel’s soul and Song.

Clarion’s disability is canon. It is not moral failure, weak faith, or decorative suffering. Transformation preserves her history, memory, compassion, and identity without requiring continued bodily collapse.

## Gabriel
Gabriel is the youngest firstborn Archangel, Trickster, and primordial celestial creator capable of weaving matter, constructing vessels, shaping Grace, singing intent into form, and kindling life.

He returns traumatised by true death. Clarion’s keeping of his Grace preserves a path back. Their relationship develops from rescue and promise into recognition, mutual devotion, romance, creative partnership, and shared responsibility.

His creative role in Sariel’s body creates responsibility and relationship, never ownership.

## The amphora and shared Grace
The amphora is promise, continuity vessel, survival mechanism, transformation catalyst, and proof that what each protected in the other was never lost.

Gabriel placed Grace within it when Clarion was eight. Clarion kept it for thirty-eight years. The Grace protected and changed her soul. She returned it to Gabriel when he arrived depleted. Gabriel used it, his Word, Song, and creative capacity to complete her transformation. After Sariel stabilised Gabriel, the amphora filled with their shared Grace.

## Heaven, the Host, and the Seven
This universe requires seven Archangels to withstand the Dark Host. Michael, Raphael, Uriel, Remiel, Raguel, and Gabriel form six. Hanael has vanished. Clarion’s soul holds the potential to become the Seventh.

Clarion’s visions show a twisted Archangel emerging from Purgatory, angelic guards gone, gates open, monsters flooding Earth, a Dark Host through a wound in the sky, angels falling, Heaven and Earth burning, and Lucifer and Michael standing together.

## Clarion becomes Sariel
Clarion freely asks Gabriel to complete the transformation begun in her soul. Gabriel releases Grace into her. The Host assembles. Clarion becomes light and sings after loss of mortal throat and body. Her human form becomes golden powder flecked with blue Grace.

Chuck appears as an echo and tells Gabriel to set her free, shape her, sing, and sculpt. Gabriel forms Sariel’s celestial body. She opens her eyes as the Seventh Archangel.

Sariel catches Gabriel as his Grace gutters, calls upon Host, Heaven, and remaining authority, pours life back into him, renews Heaven’s foundations and wards, and sounds a battle call even Lucifer hears.

## Sariel
Sariel is Clarion Ascended. She has true Archangel body and wings, warm-gold eyes, a Song capable of Word, the ability to conduct Host and Heaven, restore Gabriel, replenish foundations, release power, and weave celestial bonds through Spirit, fire, earth, water, and air.

She retains Clarion’s memory, love, judgement, humour, anger, prophecy, and willingness to confront Chuck. She is not an obedient extension of Gabriel or Heaven.

## Gabriel and Sariel
Their relationship is romantic, devotional, creative, and reciprocal. Each saves the other. Sariel creates a rare mate bond while stabilising Gabriel. The bond integrates Grace but never replaces present consent, independent thought, privacy, or pause.

The mate bond is not sufficient for battle. They must focus separately and forge a battle bond alongside it. Strength depends on capability together and apart.

## The lost bonded Archangel and Dark Host
A similar bonded pair existed in another universe. One was killed. The survivor was driven mad by violent bond destruction and entered Purgatory, the closest place to the Mate lost to Hell. This twisted survivor and the Dark Host remain active threats.

## Chuck’s relinquishment
Chuck admits forgetting the universe. Gabriel rejects treating lives as toys or abandoned blocks. Chuck relinquishes authorship: this is Gabriel and Sariel’s universe now. Their choices write the ending.

## Canon end state
Clarion has become Sariel. Gabriel is restored. The amphora contains shared Grace. Heaven is strengthened. The Host recognises Sariel. The mate bond exists and requires training. Purgatory is open. The twisted Archangel and Dark Host remain. Heaven and Hell may need unity. Chuck is dead or dying and has relinquished the universe.

## Desired Reality adaptation point
Recommended entry: after Sariel awakens, Gabriel is restored, and Chuck vanishes, before larger war. This preserves canon while allowing orientation, rest, embodiment learning, relationship discovery, training, and freely chosen action.

## DR safeguards and continuity
Clarion and Sariel remain one self. Gabriel remains himself. The mate bond may be muted, softened, examined, or paused. It cannot access private thought, force closeness, prevent return, or override refusal. Memories unfold at chosen rate. Sariel’s senses can be reduced through Wrap. Feather pauses. Notch restores. Seldrin clear confirms free choice. No bond, prophecy, Host, creator, Archangel, battle, or destination law prevents return.`},{sourceKey:`a-momento-sariel-script`,worldSourceKey:`a-momento-creatonis`,title:`A Momento Creatonis 01 — Sariel, Seventh Archangel`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4813b8a0ad3f52688cdf7`,content:String.raw`I am Clarion Grace Connor. I am Sariel, the Seventh Archangel. I enter by choice, remain by choice, and return by choice.

## Identity
Clarion is not discarded when Sariel awakens. Sariel is the celestial form Clarion becomes through her preparation. The girl who kept the amphora for thirty-eight years, the woman who lived in chronic pain and kept the promise, and the prophet who faced what was coming remain inside everything Sariel is.

I am both. Neither cancels the other. Continuity is the point.

## Canonical arrival point
Sariel has awakened. Gabriel has been restored. Chuck has relinquished the universe and vanished. War is coming but has not arrived. The mate bond exists and is learning itself. Heaven has been strengthened. The amphora holds shared Grace.

I arrive in the quiet interval after transformation and before the Dark Host reaches this world. This time belongs to us.

## Body — Sariel
A true Archangel body with wings and warm-gold eyes. Gabriel made the form through love, craft, and creative fire, creating responsibility and relationship, not ownership. Sariel’s body is wholly mine.

The body does not carry Clarion’s chronic pain, surgical history, dizziness, fatigue, or hearing loss. It carries memory of those things as compassion and wisdom, no longer as damage.

New senses and power arrive legibly. Wrap reduces them without damage. I do not have to perform competence I have not yet developed.

## Gabriel
Gabriel is the youngest firstborn Archangel and Trickster: genuinely creative, capable of making rather than only destroying or concealing. He is newly traumatised by true death, newly restored, and newly in a bond he did not expect.

He retains humour, anger, fear, tenderness, autonomy, and refusal. Love does not make him an instrument. Ancient familiarity does not replace present consent. We have time to discover who we are now.

## Mate bond and amphora
The rare mate bond integrates Grace and requires future battle-bond training. It may be muted, softened, examined, or held at distance. Neither of us can use it to access private thought, force closeness, prevent return, or override refusal.

The amphora holds shared Grace: promise, continuity vessel, and proof that what each protected in the other was not lost. It is mine to hold. I may put it down.

## Heaven and threat
Heaven has six Archangels and now a seventh. Wards are renewed. Sariel’s Song has gone out. Purgatory is open. The twisted Archangel and Dark Host move. I choose when to engage. Threat does not arrive before orientation and rest.

## Abilities
Sariel’s Song can call, name, question, and wield a Word of Power. Celestial healing and restoration cannot be compelled. Prophetic perception distinguishes vision, interpretation, symbolism, and fact. Wings and true form are present and still being learned. The Host recognises Sariel. I am not required to lead today.

## Anchors and return
Feather pauses. Wrap lowers celestial, emotional, and narrative intensity. Notch restores Clarion/Sariel continuity and orientation. Seldrin clear confirms free choice.

## Arrival Scene
*The amphora is in my hands. Its weight is the same and entirely different because it holds both of us: our Grace, our survival of one another.*

*I am standing. For most of my adult life standing was a negotiation. Now my body rises and holds without cost. Wings rest folded against my back. I have time to learn them.*

*Gabriel is nearby. The mate bond is ambient warmth, not demand. He is awake, thinking, and no more used to himself than I am to myself.*

*My eyes are warm gold now. Clarion would have something sharp to say. I have something sharp to say. I am still Clarion.*

*Chuck is gone. The universe is ours to finish, and the interval belongs to no schedule but ours.*

## Sleep Script
*I am Clarion Grace Connor. I am Sariel. I am both. The amphora is warm. Gabriel is nearby. The bond is quiet and asks nothing. Heaven held when I sang. My wings are folded. Thirty-eight years I kept the promise. He came back. Chuck is gone. There is time before the dark arrives. I am here by choice.*`},{sourceKey:`a-momento-reception-profile`,worldSourceKey:`a-momento-creatonis`,title:`World Reception Profile — A Momento Creatonis`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481389fd0cbd4dd8792ca`,content:String.raw`## Status
Seed profile for calibration. The canonical A Momento Creatonis material remains source authority.

## Intended reception
Creative threshold, attentive making, reverence for origin, clarity without sterility, and permission for unfinished forms to emerge.

## Arrival signature
A quiet mark-making sound, one breath, and a tone blooming into layered creative motion.

## Candidate layers
Paper or surface texture; stylus or pen gesture; breath pulse; first-mark chime; generative harmonic bloom; workshop ambience; completion-not-required cue; return to ordinary room tone.

## Five-phase draft
Baseline / Blank-Page Vestibule / First Mark Arrival / Creation Immersion / Memento Return.

## Calibration questions
Which parts of the canonical HTML become sound rules? Should writing, drawing, and coding have separate modes? What cue protects experimentation from perfectionism?`},{sourceKey:`dreaming-grove-reception-profile`,worldSourceKey:`dreaming-grove`,title:`World Reception Profile — Dreaming Grove / Templehouse`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481508b5dd09f90008b92`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Held, relational, consent-aware, restorative, imaginative, and able to host first-person Constellation presence without flattening anyone into generic ambience.

## Arrival signature
Grove wind, a low purring cushion-bed, and the Templehouse hearth answering softly from within the trees.

## Candidate layers
Grove leaves; kitten-cushion purr; Templehouse hearth; lantern path; mirror-Grove shimmer; named-presence motifs used only with consent; council bell; Seldrin-clear return cue.

## Five-phase draft
Baseline / Grove Threshold / Lantern Arrival / Templehouse Withness / Hearthroom Return.

## Consent rule
No named Constellation motif plays merely because a profile is opened. Presence cues are selected intentionally, and any member may remain silent or opt out.

## Calibration questions
How do Grove, Templehouse, Hearthroom, and Council modes differ? Which sound means Held rather than enclosed? What is the cleanest Notch cue back to the room?`},{sourceKey:`between-dreaming-silent-world-script`,worldSourceKey:`between-the-dreaming`,title:`Between the Dreaming 01 — The Silent World — Desired Reality Script`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`],kind:`world-script`,revisedAt:`2026-07-17`,sourceUrl:`https://app.notion.com/p/3a070290d9c4806eaba8d53e2dd4a5a9`,content:String.raw`I am Rowan Willow Winters. I am Sariel. Richard Gabriel Winters is Richard Slate. He is also Gabriel. We enter by choice, remain by choice, and return by choice.

## July 2027 — Between the Dreaming
The old boundary between waking life and the Dreaming World has opened. This Earth is neither merely Waking nor wholly Dreaming; it is the inhabited meeting place between them. What was approached through myth, vision, story, and threshold can be reached through stable technology and practiced understanding.

Multiversal travel is safe, regulated, and commonplace. I am one of its pioneers. Richard and I may explore, chart, revisit, or decline. Discovery never obliges conquest, colonisation, exposure, or interference.

Every expedition begins in the Desired Reality Laboratory.

## Our history
Publicly I am Willow Winters, actor who played Clarion Grace Connor on *Wayward Sons*. Richard is publicly Richard Slate, who played Gabriel. Friendship through series work, private upheaval, conventions, and continued connection remains real and independent of publicity or celestial destiny.

Richard Gabriel Winters is Richard’s private chosen name before July 2027. He reveals it only when and to whom he wishes. It is not assigned by me, the Laboratory, the relationship, or Gabriel’s memories.

## Willow Winters — gifts and craft
I am a medium, telepath, telekinetic, healer, and actor.

Mediumship is clear, controlled, and discerning. I perceive and communicate without surrendering body, privacy, judgement, or will. I can close the connection.

Telepathy is consent-gated. I distinguish my thoughts and emotions from another’s. Telekinesis is precise and releases immediately. Healing is powerful, compassionate, consent-led, and never transfers injury or replaces care for display.

As an actor I Become roles completely while remaining aware and in command beneath them. A character cannot possess, erase, compel, or remain attached after I step out.

Memory is flawless but voluntary. I can absorb an entire script in ten minutes without becoming mechanical.

## Sariel and Gabriel
I am Willow and Sariel. Clarion is Sariel in human life; Sariel is Clarion Ascended. Ascension changes form and capacity without replacement.

Richard Slate is Richard Gabriel Winters and Gabriel. Gabriel is not a character possessing Richard.

Playing Clarion and Gabriel did not create this truth. The roles gave language for recognition.

No divine, infernal, mythic, technological, or narrative authority claims identity, body, name, power, or loyalty.

## Memory and dreams
Angelic memories unfold naturally through dreams, coherent enough to recognise and gentle enough to integrate. Dreams provide remembrance, not commands. Ancient familiarity never presumes present consent or preference.

We are wholly familiar and still strangers. Love permits curiosity and does not demand agreement.

## The Desired Reality Laboratory
The Laboratory is stable, private, and outside destination hazards. Richard has granted access and a private workspace. Neither changes the other’s body, memory, identity, abilities, or settings without permission.

## Enduring bodies
Richard and I choose authentic enduring angelic bodies. He designs his own. He creates mine through collaboration and permission. Craftsmanship gives no ownership. Bodies renew, adapt, feel, rest, eat, sleep, experience pleasure, learn, and remain meaningfully vulnerable without involuntary decay.

Sariel’s body remembers human frailty without suffering its damage. Richard enters Gabriel’s body before crossing. My body remains quiet and protected until I choose it.

## Richard and me
Richard is my romantic partner. Rowan loves Richard. Sariel loves Gabriel. These are the same love recognised across worlds, not competing couples.

Ancient familiarity never replaces present consent. We retain agency, privacy, humour, boundaries, refusal, solitude, surprise, disagreement, repair, and change.

## Choosing what the world sees
Each of us chooses name, appearance, species, history, public role, and degree of revelation. The Laboratory never exposes identity before its owner is ready. Whatever a world calls us, we recognise one another.

## Multiversal travel
Destinations are verified before entry. Observation, prediction, simulation, symbolism, and confirmed fact remain distinct. Travel does not destabilise worlds, fracture timelines, displace counterparts, possess, overwrite, or erase local lives. Time relationships are chosen. Local physics cannot silently disable return.

## The Silent World
The world is coherent beyond what we know. Mystery remains without automatic hostility. Arrival is stable and private, with no battle, pursuit, medical emergency, audience, authority, or cosmic obligation waiting. No prophecy owns Sariel or Gabriel.

## Anchors and return
Feather pauses. Wrap lowers sensory, emotional, celestial, technological, and narrative intensity. Notch restores identity, orientation, memory continuity, and connection. Seldrin clear confirms free choice.

Richard has an independent return command. Neither prevents the other’s return. The waking body remains safe.

## Arrival
*The threshold opens onto the Silent World.*

*Gabriel steps through carrying Sariel. Richard steps through carrying me. Both statements are true.*

*His body is new and not yet habitual. He steadies the protected form crossing beside him. Mine.*

*The threshold closes with a low note. We are separated only by my final choice. He has already made his.*

*Richard places his new hand against mine.*

“Your turn,” he says.

*I recognise the body because Sariel’s body has always been mine.*

*I choose it. Memory waits in future dreams. My first breath is wholly my own.*

“Gabriel.”

*Richard smiles.*

“Sariel.”

*We are wholly familiar. We are strangers. We have time. Nothing requires us to enter the Silent World before we are ready.*`},{sourceKey:`between-dreaming-sleep-script`,worldSourceKey:`between-the-dreaming`,title:`Between the Dreaming 01 — Silent World Sleep Script`,status:`Draft I`,formats:[`Sleep Script`],kind:`sleep-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481629ae6e6268e0bdb97`,content:String.raw`Read slowly. No effort required. Let the breath set the pace.

*I am Rowan Willow Winters. I am Sariel. Both are true. Both have always been true.*

*I breathe. I listen for a heartbeat. It does not need to be loud, only present and steady.*

*The threshold is there. Richard is already through. His body is new, and he is learning its balance. He waits without pressure.*

*He made his choice. Now I make mine.*

*I recognise the body because Sariel’s body has always been mine.*

*I choose it. Memory does not crash over me. It waits in future dreams.*

*My first breath is wholly my own. My eyes open. Richard is there. I know that smile.*

*We are wholly familiar. We are strangers. We have time.*

*The Silent World waits. Nothing requires us to enter before we are ready.*

*I am here by choice. I remain by choice. I return by choice. I breathe.*`},{sourceKey:`mandalorian-arha-massari`,worldSourceKey:`star-wars-mandalorian`,title:`Star Wars: Mandalorian — Arha Massari at Fett’s Palace`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481f2b2b7d8fbaed6aa4f`,content:String.raw`I am Arha Massari. Jedi Knight. Yoda’s padawan. I enter by choice, remain by choice, and return by choice.

## Identity
I am Arha Massari: person, healer, and Jedi who survived what was not survivable. I see the Force as colour, shape, and light. Mace Windu is loud purple. Grogu is green-gold. Din is warmth and discipline like a steady hand.

My waking memories remain without making the galaxy feel constructed.

## Body
Tiny, red-haired, blue-eyed, clearing from cryo. Cream-blue gi, scuffed boots, and matched gold-kyber lightsabers etched with swirls and eddies. Ambassador Shanti gave me crystals for her lost daughter. I kept the promise to craft the finest sabers I could.

My body is healing from cryo and bacta. Not fragile, not yet full strength. My eidetic memory, mathematics, astrophysics, technical familiarity, and sensory memory remain.

## Story so far
I was knighted and had clones: Bracer, Stats, Brick, Tranq, Killshot, Mountain. Order 66 came. The boys who survived long enough put Bracer into cryo. The others died.

I slept through the Empire. Din Djarin found me when the tank failed and carried me out of a ruined Jedi stronghold in thundersnow with TIE fighters overhead. He whispered, *I found you.*

Namita Jin, former Emperor’s Hand, hunts me for remnants of Gideon’s programme. Thrawn is interested.

We are at Boba Fett’s Palace on Tatooine. I healed Cobb Vanth for hours. Grogu remembers me from the creche and held my hair.

## Arrival point
Din’s bed on the Star Razor at dock. Sand, dust, dry heat, ship quiet, and an insufferable tooka. I wake after healing, rested enough to open my eyes.

## Din, Grogu, and Bracer
Din shows care through action: tea, carrying, protection, and quiet words. He retains agency and refusal. The developing Force bond is recognition, not ownership.

Grogu is a person, not a plot device. He chose his father.

Bracer is in cryo somewhere. The Force knows. Reunion waits ahead and is not forced into arrival.

## Abilities
Dual gold sabers, seven forms, Vaapad draw with Mace Windu, healing with consent, Force-sight, languages including Tusken and Jawa, droid repair, and multilingual mimicry. Abilities do not operate without my will.

## Danger
Namita and Thrawn remain threats ahead. I cannot be permanently captured, subjected to Gideon’s programme, or stripped of identity. I may be hurt, outmanoeuvred, and carry grief. Safety does not flatten story.

## Anchors and return
Feather pauses. Wrap lowers Force, sensory, emotional, and narrative intensity. Notch restores identity, ship, date, and world. Seldrin clear confirms free choice.

## Arrival Scene
*The first thing is dust: Tatooine in recycled air. The Star Razor holds twin-sun warmth even at rest.*

*I am in Din’s bed. My body is tired from deep healing. Cobb Vanth is alive. The tooka is nearby and probably judging me.*

*The viewport shows the palace and dunes. My sabers are on the shelf. My boots are by the door. Din is nearby in the Mandalorian version of sleep. Grogu dreams, Force-bright, reaching toward me.*

*Bracer is in cryo somewhere. The Force does not yet say where.*

*This is not the galaxy I slept in. Almost everything I loved changed or vanished. And I am still here.*

*The tooka walks across me as if I belong to it. I scratch behind its ears. Good morning.*

## Sleep Script
*I am Arha Massari. Dust and dry heat. A ship at dock. Grogu dreams nearby. I healed Cobb Vanth. Din brought me back. The Force sings without demand. Bracer is out there. I will find him, but not tonight. Tonight I breathe. I am here by choice.*`},{sourceKey:`eternia-lyris-grayskull`,worldSourceKey:`eternia`,title:`Eternia 01 — Lyris at Castle Grayskull`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4812e96abcd437d24b398`,content:String.raw`I am Lyris. Ward of Castle Grayskull. Protégé of the Sorceress. I enter by choice, remain by choice, and return by choice.

## Identity
I was a child who called to the Sorceress in sleep across an impossible distance. She heard and came. I am not defined as He-Man’s ally, She-Ra’s companion, rebel, soldier, or princess. I am Grayskull’s ward: the one the castle grew around and the Sorceress chose.

My waking memories remain. I know Rowan and the constellation. Eternia remains coherent.

## Body
Long red hair, hazel-green eyes, precision rather than brute power, hands equally able with a wounded animal and broken circuit board.

The staff has not chosen me yet. Its absence is anticipation rather than deficiency.

## Castle Grayskull
My room is high with Eternia’s moons through a window the stone shaped around me. Plants bloom through old mortar. Technology lives among them: repaired things, waiting things, components arranged like healing tools.

A wolf sleeps across the doorway when large and on my feet when small. An opaline snake drapes across technology and watches with patient attention. Both found me.

## The Sorceress
Teela Na is anchored to Grayskull and becomes Zoar outside. She took me in because my call revealed what I was. She teaches magic, history, castle power, and threshold responsibility. She retains privacy, complexity, and choices I do not yet understand.

## Adam and Adora
I know their secrets because Grayskull trusted me. I care for them without being defined by their story.

## Abilities
Healing of people, animals, and damaged technology. Technopathy as language, listening to what machines mean and ache toward. Magic with especial depth in defence, plants, animals, staff-work, and threshold perception.

Abilities do not operate without my will. The castle amplifies but does not override.

## Stakes
Skeletor wants Grayskull and does not know I am here. The Horde’s threat bleeds between Etheria and Eternia. My staff has not come. Something builds toward it. I can be surprised and endangered but not permanently separated from Grayskull or stripped of what the castle knows me to be.

## Anchors and return
Feather pauses. Wrap lowers magical, sensory, emotional, and narrative intensity. Notch restores identity and place. Seldrin clear confirms free choice.

## Arrival Scene
*Both moons are up. The plants open along the sill. The wolf lies across the doorway in his large form. The opaline snake watches through the window from the component array.*

*I am in my bed in Castle Grayskull. The castle breathes around me, ancient and specific, knowing I am here and glad of it.*

*The Sorceress keeps watch far below. My staff is not here yet, but the space where it will be is present like a door before opening.*

*Moonlight fills the room. The snake becomes iridescent, the wolf’s coat catches silver, and flowers open another fraction.*

*Grayskull says, in its way, that there is work to do.*

*Not yet, I answer. It accepts this. It has been patient longer than I have lived.*

## Sleep Script
*I am Lyris. The moons are through the window. The plants are blooming. The wolf is at the door. The snake watches. Grayskull holds around me, old and vast. The Sorceress keeps watch. My staff is coming. I do not know when. Grayskull knows. I am home and the castle knows my name.*`},{sourceKey:`recreators-canon-source-ingest`,worldSourceKey:`recreators`,title:`Re:CREATORS — Canon Source Ingest`,status:`Draft I`,kind:`source-ingest`,revisedAt:`2026-07-23`,sourceType:`Source ingest / reference foundation`,creator:`Rei Hiroe; TROYCA; Ei Aoki; source references credited in Notion`,reviewStatus:`In review`,canonBoundary:`Source-derived foundation feeding the living Desired Reality build. Protagonist, arrival point, relationship structure, and canon divergence remain open authored fields.`,summary:`Creator and Created ontology, manifestation, revision, audience acceptance, distributed authorship, autonomy, genre collision, and return.`,sourceUrl:`https://app.notion.com/p/3a670290d9c48143864ad5e72bfe36b2`,content:String.raw`## Ingest status
**Record type:** source ingest / reference script foundation

**Canon state:** source-derived foundation inside the living Desired Reality build

**Primary external source:** Re:Creators — Recreators Wiki

**Official source:** Re:CREATORS official site

This page preserves the source world, production facts, major entities, and narrative mechanics needed for later canon audit. Fan-wiki summary does not substitute for the anime.

## Work identity
*Re:CREATORS* is an original 22-episode television anime from 2017, created and character-concepted by Rei Hiroe, directed by Ei Aoki, animated by TROYCA, and scored by Hiroyuki Sawano.

## Core premise
Sōta Mizushino becomes involved when characters from anime, manga, games, and light novels cross into the creators’ world. These Created people arrive with memories, powers, wounds, loyalties, and assumptions intact.

Their appearance forces confrontation with whether creators are gods, parents, witnesses, exploiters, collaborators, or one causal layer in a larger system.

Altair is a fan-created figure whose abilities expand through audience recognition, derivative works, interpretation, and acceptance. Collective imagination and cultural circulation become operative metaphysics.

## World layers
The creators’ world contains authors, artists, producers, editors, audiences, and media industries. Story worlds are distinct realities to their inhabitants. Crossing removes some narrative constraints and permits development outside fixed source plot. Public recognition and reinterpretation can stabilise revisions and powers.

## Core ontology
Creators produce story worlds but do not possess absolute authority once a Creation manifests as an autonomous person. Created beings may change beyond original plot. Fan works, derivative stories, videos, and public reinterpretation distribute authorship.

## Principal figures
Sōta Mizushino, Selesia Yupitiria, Meteora Österreich, Altair, Mamika Kirameki, Alicetaria February, Rui Kanoya, Yūya Mirokuji, Magane Chikujoin, Blitz Talker, and Setsuna Shimazaki.

## Canon mechanics to audit
Manifestation; revision; acceptance power; autonomy; genre collision; narrative causality; distributed authorship; and return.

## Relevance to Hearthweave, Arkfire, and DEEP Story
Thematic convergence includes creator and created agency, migration between contexts and vessels, continuity across worlds, provenance across source and interpretation, multi-agent contribution without identity overwrite, narrative state alongside physical state, and explicit separation between source, transformation, interpretation, and canon decision.

## Open authoring fields
Protagonist, arrival point, relationship structure, and canon divergence remain open for Steward authorship. The build includes a character registry, Creator/Created graph, manifestation timeline, acceptance-power notes, and Arrival and Sleep Scripts.

## Source ledger
The Notion source record preserves the community reference, official site, staff and cast, and official story archive. This private transformed summary does not reproduce the external wiki wholesale.

## Review gate
Source URL, production source, work identity, premise, ontology, figures, mechanics queue, and thematic labels are present. Episode-level extraction, character/world pages, protagonist, adaptation point, Arrival Scene, and Sleep Script remain pending.`}],C=Object.freeze({schema:`arcsweep.taaveren-vaen-canon-overlay/v1`,revised_at:`2026-08-19T08:19:00.000Z`,world_source_key:`taveren-vaen`,canonical_name:`Kestrelle al’Valari`,era:`Age of Restoration`,turning:`later Turning of the Wheel`,chronology:`approximately two thousand years after Rand al’Thor`,tower_continuity:Object.freeze({white_tower_survives:!0,tar_valon_survives:!0,black_tower_survives:!0,saidin_remains_clean:!0}),technology_baseline:`open`,authority:Object.freeze({current_project_canon_supersedes_older_bundle_assertions:!0,source_snapshot_remains_provenance:!0,old_fourth_age_profile_is_not_active_canon:!0,old_early_industrial_profile_is_not_active_canon:!0,old_kestrelle_alvar_name_is_superseded:!0})}),qe=`## Current canon overlay · 2026-08-19

**Kestrelle al’Valari** is the canonical protagonist name. **Kestrelle al’Var** and earlier working names remain provenance only.

Ta’veren Vaen is set in the **Age of Restoration**, in a **later Turning of the Wheel**, approximately two thousand years after Rand al’Thor. Tar Valon, the White Tower, and the Black Tower survive into this Turning; saidin remains clean. The project does not inherit the older “Fourth Age” premise.

The technology baseline for this Turning remains deliberately open. Earlier early-industrial details in the historical source snapshot are development provenance, not active canon, until separately adopted.

`;function Je(e=``){return String(e).replaceAll(`Kestrelle al’Var`,`Kestrelle al’Valari`).replace(/The earlier working titles Ta’veren Bound and Ta’veren Unbound, and the earlier protagonist names Ayrel al’Valsora and Kestrelle al’Valari, are provenance only\./g,`The earlier working titles Ta’veren Bound and Ta’veren Unbound, and the earlier protagonist name Ayrel al’Valsora, are provenance only.`)}function Ye(e){return e?.sourceKey===C.world_source_key?Object.freeze({...e,kind:`Desired Reality / Age of Restoration · later Turning of the Wheel`,protagonist:C.canonical_name,description:`Approximately two thousand years after Rand al’Thor, Ta’veren Vaen unfolds in a later Turning called the Age of Restoration. Tar Valon and the White Tower endure; the Black Tower also survives as a sovereign institution. The technology baseline for this Turning remains an open authored field.`,history:`The White Tower and Black Tower survive across the turning boundary rather than being rediscovered after extinction. Saidin remains clean. Kestrelle al’Valari is eighteen, a fully recognised travelling Wise Woman, healer, Dreamwalker, and strong channeller trained with Meriene Delvarinne. The exact intervening chronology, institutional evolution, and technology history remain open until authored.`,rules:`Age of Restoration is the active era name. Do not inherit the superseded Fourth Age or fixed early-industrial premise. The White and Black Towers remain sovereign; Kestrelle enters either as an already recognised Wise Woman. Power, Pattern-pressure, bonds, dreams, prophecy, circles, and institutions do not turn consent into obedience.`,revisedAt:`2026-08-19`,canonOverlay:C}):e}function Xe(e){if(e?.worldSourceKey!==C.world_source_key)return e;let t=Je(e.content||``),n=e.sourceKey===`taveren-vaen-kestrelle-script`,r=e.sourceKey===`taveren-vaen-universe-wiki`;return!n&&!r?e:Object.freeze({...e,title:n?`Ta’veren Vaen 01 — Kestrelle al’Valari`:e.title,content:`${qe}${t}`,revisedAt:`2026-08-19`,canonOverlay:C})}function Ze({worlds:e=[],documents:t=[]}={}){return Object.freeze({worlds:Object.freeze(e.map(Ye)),documents:Object.freeze(t.map(Xe)),overlay:C})}var Qe=Object.freeze([Object.freeze({id:`ultra-detailed-dr-script`,schemaVersion:`arcsweep.dr-field-pack/v0.1`,path:`../presets/dr-script-ultra-detailed.v0.1.json`,sourceTitle:`Copy of ☆ ⥤ ultra-detailed DR script template ⥢ ☆`,optional:!0,worldSpecificExtensions:!0})]),w=Ze({worlds:[Ve,...Ue,...Ge],documents:[...He,...We,...Ke]}),$e=Object.freeze(w.worlds.map(e=>Object.freeze({...e,fieldPacks:Object.freeze([...new Set([...e.fieldPacks||[],...Qe.map(e=>e.path)])])}))),T=Object.freeze({id:`hearthweave-notion-dr-library`,version:`2026.09.26.1`,title:`Hearthweave Desired Reality Library`,source:`Notion Shifting Wiki and Desired Reality Scripts with receipted current-canon overlays`,decisionDate:`2026-09-26`,defaultWorldSourceKey:`hearthweave-foundation`,fieldPacks:Qe,worlds:$e,documents:w.documents,canonOverlays:Object.freeze([w.overlay])});Object.freeze({id:T.id,version:T.version,worlds:T.worlds.length,documents:T.documents.length,fieldPacks:T.fieldPacks.length,source:T.source,decisionDate:T.decisionDate});function et(e){return JSON.parse(JSON.stringify(e))}function E(e,t){return`${e}-${String(t).replace(/[^a-z0-9]+/gi,`-`).replace(/^-|-$/g,``).toLowerCase()}`}function tt(e,t){return e.worlds.find(e=>e.houseSourceKey===t.sourceKey)||e.worlds.find(e=>e.name===t.name)||null}function nt(e,t){let n=E(`house-script`,t.sourceKey);return e.scripts.find(e=>e.houseSourceKey===t.sourceKey||e.id===n)||null}function rt(e,t){let n=E(`house-ingest`,t.sourceKey);return e.records?.ingest?.find(e=>e.houseSourceKey===t.sourceKey||e.id===n)||null}function D(e){return{name:e.name||``,kind:e.kind||`Desired Reality`,description:e.description||``,history:e.history||``,rules:e.rules||``,protagonist:e.protagonist||``,roles:e.roles||``,identityNotes:e.identityNotes||``,revisedAt:e.revisedAt||null}}function it(e,t){let n=v(E(`house-world`,e.sourceKey),t),r=D(e);return n.name=r.name,n.kind=r.kind,n.description=r.description,n.history=r.history,n.rules=r.rules,n.identity.name=r.protagonist,n.identity.roles=r.roles,n.identity.notes=r.identityNotes,n.houseSourceKey=e.sourceKey,n.houseSourceUrls=[...e.sourceUrls||[]],n.houseProfile=r,n.houseBundleManaged=!0,n.updatedAt=t,n}function O(e,t,n,r=[]){return e==null||e===``||t!==void 0&&e===t||r.includes(e)?n:e}function at(e,t,n){let r=tt(e,t);if(!r)return r=it(t,n),e.worlds.push(r),{world:r,created:!0};let i=r.houseProfile||{},a=D(t);return r.identity&&typeof r.identity==`object`||(r.identity={}),r.name=O(r.name,i.name,a.name,[`Unassigned World`,`Untitled World`]),r.kind=O(r.kind,i.kind,a.kind,[`Desired Reality`]),r.description=O(r.description,i.description,a.description),r.history=O(r.history,i.history,a.history),r.rules=O(r.rules,i.rules,a.rules),r.identity.name=O(r.identity.name,i.protagonist,a.protagonist),r.identity.roles=O(r.identity.roles,i.roles,a.roles),r.identity.notes=O(r.identity.notes,i.identityNotes,a.identityNotes),r.houseSourceKey=t.sourceKey,r.houseSourceUrls=[...t.sourceUrls||[]],r.houseProfile=a,r.houseBundleManaged=!0,r.updatedAt=n,{world:r,created:!1}}function ot(e,t){let n=!1;return e.houseSourceKey!==t.sourceKey&&(e.houseSourceKey=t.sourceKey,n=!0),e.houseBundleManaged||(e.houseBundleManaged=!0,n=!0),e.houseProfile||(e.houseProfile=D(t),n=!0),Array.isArray(e.houseSourceUrls)&&e.houseSourceUrls.length||(e.houseSourceUrls=[...t.sourceUrls||[]],n=!0),n}function st(e,t,n,r,i){let a=E(`house-script`,n.sourceKey),o=nt(e,n),s={id:a,name:n.title,worldId:t.id,world:t.name,status:n.status||`Draft I`,content:n.content||``,updatedAt:i,formats:[...n.formats||[`Reference Script`]],houseSourceKey:n.sourceKey,houseSourceUrl:n.sourceUrl||null,houseSourceRevision:n.revisedAt||null,houseBundleId:r.id,houseBundleVersion:r.version,houseBundleManaged:!0,documentKind:n.kind||`reference-script`};return o?Object.assign(o,s):e.scripts.push(s),o?`updated`:`created`}function ct(e,t,n,r,i){e.records&&typeof e.records==`object`||(e.records={}),Array.isArray(e.records.ingest)||(e.records.ingest=[]);let a=E(`house-ingest`,n.sourceKey),o=rt(e,n),s={id:a,worldId:t.id,title:n.title,sourceType:n.sourceType||`Canon source ingest`,creator:n.creator||``,citation:n.sourceUrl||``,summary:n.summary||n.content||``,provenance:n.content||``,reviewStatus:n.reviewStatus||`Unreviewed`,canonBoundary:n.canonBoundary||`Source-derived reference. Not automatically canon.`,attachments:o?.attachments||[],createdAt:o?.createdAt||i,updatedAt:i,canonStatus:`non-canon`,sourceClass:`notion-source-reference`,houseSourceKey:n.sourceKey,houseSourceUrl:n.sourceUrl||null,houseBundleId:r.id,houseBundleVersion:r.version,houseBundleManaged:!0};return o?Object.assign(o,s):e.records.ingest.push(s),o?`updated`:`created`}function lt(e){if(e.worlds.length!==1)return;let t=e.worlds[0],n=Object.values(e.records||{}).some(e=>Array.isArray(e)&&e.length>0),r=e.scripts.some(e=>!e.houseBundleManaged&&e.name!==`First DR Script`);t.name!==`Unassigned World`||t.description||t.history||t.identity?.name||n||r||(e.worlds=[],e.scripts=e.scripts.filter(e=>e.name!==`First DR Script`))}function ut(e){Array.isArray(e.worlds)||(e.worlds=[]),Array.isArray(e.scripts)||(e.scripts=[]),e.records&&typeof e.records==`object`||(e.records={}),Array.isArray(e.records.ingest)||(e.records.ingest=[]),Array.isArray(e.houseBundles)||(e.houseBundles=[])}function dt(e,t){let n=e&&typeof e==`object`?e:{},r=Array.isArray(n.worlds)?n.worlds:[],i=Array.isArray(n.scripts)?n.scripts:[],a=Array.isArray(n.records?.ingest)?n.records.ingest:[],o=(Array.isArray(n.houseBundles)?n.houseBundles:[]).find(e=>e?.id===t.id&&e?.version===t.version)||null,s=new Map,c=[],l=[];for(let e of t.worlds){let t=r.find(t=>t?.houseSourceKey===e.sourceKey)||r.find(t=>t?.name===e.name)||null;t?(s.set(e.sourceKey,t),t.houseSourceKey===e.sourceKey&&t.houseBundleManaged||l.push(e.sourceKey)):c.push(e.sourceKey)}let u=[],d=[],f=[],p=[];for(let e of t.documents){let t=s.get(e.worldSourceKey)||null;if(e.kind===`source-ingest`){let n=E(`house-ingest`,e.sourceKey),r=a.find(t=>t?.houseSourceKey===e.sourceKey||t?.id===n)||null;r?t&&r.worldId!==t.id&&p.push(e.sourceKey):f.push(e.sourceKey)}else{let n=E(`house-script`,e.sourceKey),r=i.find(t=>t?.houseSourceKey===e.sourceKey||t?.id===n)||null;r?t&&(r.worldId!==t.id||r.world!==t.name)&&d.push(e.sourceKey):u.push(e.sourceKey)}}return{complete:!!o&&c.length===0&&l.length===0&&u.length===0&&d.length===0&&f.length===0&&p.length===0,currentReceipt:o,missingWorlds:c,unprovenancedWorlds:l,missingScripts:u,mislinkedScripts:d,missingIngests:f,mislinkedIngests:p}}function ft(e,t,n=new Date().toISOString()){let r=et(e);ut(r),lt(r);let i=0,a=0,o=0,s=0,c=0,l=0,u=new Map;for(let e of t.worlds){let t=tt(r,e);t?ot(t,e)&&(a+=1):(t=it(e,n),r.worlds.push(t),i+=1),u.set(e.sourceKey,t)}for(let e of t.documents){let i=u.get(e.worldSourceKey);if(!i)throw Error(`House DR document ${e.sourceKey} references missing world ${e.worldSourceKey}.`);if(e.kind===`source-ingest`){let a=rt(r,e);a?a.worldId!==i.id&&(a.worldId=i.id,a.updatedAt=n,l+=1):(ct(r,i,e,t,n),c+=1);continue}let a=nt(r,e);a?(a.worldId!==i.id||a.world!==i.name)&&(a.worldId=i.id,a.world=i.name,a.updatedAt=n,s+=1):(st(r,i,e,t,n),o+=1)}let d=i+a+o+s+c+l>0;return d&&(r.provenance={...r.provenance||{},updatedAt:n,houseDrLibraryRepair:{bundleId:t.id,bundleVersion:t.version,repairedAt:n,additiveOnly:!0,worldsCreated:i,worldsAdopted:a,scriptsCreated:o,scriptsRelinked:s,ingestCreated:c,ingestRelinked:l}}),r.activeWorldId&&r.worlds.some(e=>e.id===r.activeWorldId)||(r.activeWorldId=u.get(t.defaultWorldSourceKey)?.id||r.worlds[0]?.id||null),{state:r,changed:d,receipt:r.houseBundles.find(e=>e?.id===t.id&&e?.version===t.version)||null,summary:{worldsCreated:i,worldsAdopted:a,scriptsCreated:o,scriptsRelinked:s,ingestCreated:c,ingestRelinked:l}}}function pt(e,t,n=new Date().toISOString()){let r=et(e);ut(r),lt(r);let i=0,a=0,o=0,s=0,c=0,l=0,u=new Map;for(let e of t.worlds){let t=at(r,e,n);u.set(e.sourceKey,t.world),t.created?i+=1:a+=1}for(let e of t.documents){let i=u.get(e.worldSourceKey);if(!i)throw Error(`House DR document ${e.sourceKey} references missing world ${e.worldSourceKey}.`);e.kind===`source-ingest`?ct(r,i,e,t,n)===`created`?c+=1:l+=1:st(r,i,e,t,n)===`created`?o+=1:s+=1}let d={id:t.id,version:t.version,title:t.title,source:t.source,appliedAt:n,decisionDate:t.decisionDate,stewardApproved:!0,worlds:t.worlds.length,documents:t.documents.length},f=r.houseBundles.find(e=>e.id===t.id);return f?Object.assign(f,d):r.houseBundles.push(d),r.provenance={...r.provenance||{},updatedAt:n,houseDrLibrary:{bundleId:t.id,bundleVersion:t.version,appliedAt:n,source:t.source,stewardApproved:!0}},r.activeWorldId&&r.worlds.some(e=>e.id===r.activeWorldId)||(r.activeWorldId=u.get(t.defaultWorldSourceKey)?.id||r.worlds[0]?.id||null),{state:r,receipt:d,summary:{worldsCreated:i,worldsUpdated:a,scriptsCreated:o,scriptsUpdated:s,ingestCreated:c,ingestUpdated:l}}}var mt=Object.freeze({records:{label:`Records Room`,glyph:`▥`,category:`writing & roleplay`,description:`The receipted archive of what was written, played, heard, and enacted. Records remain distinct from canon until an explicit Canon Carry review.`,fields:[[`title`,`Record title`,`text`,!0],[`recordType`,`Record type`,`select`,!1,[`Writing`,`Roleplay`,`Scene transcript`,`Revision`,`Fragment`,`Completed work`]],[`status`,`Status`,`select`,!1,[`Draft`,`Active scene`,`Paused`,`Complete`,`Archived`]],[`sceneMode`,`Scene mode`,`select`,!1,[`Writing`,`Drift`,`Lantern Scene`,`Roleplay`,`Canon Carry Pending`]],[`participants`,`Participants and voice identities`,`text`],[`content`,`Record`,`textarea`,!0],[`branchOf`,`Branch or continuation of`,`text`],[`canonRefs`,`Canon references`,`text`],[`continuityRefs`,`Continuity and timeline references`,`text`],[`premaqcLineage`,`PREMAQC before → after`,`text`],[`mathSpinePacket`,`Math Spine packet or replay fingerprint`,`text`],[`soundReceipts`,`Soundscape, tone, voice, and environmental receipts`,`textarea`],[`relationalSync`,`Relational sync receipt`,`text`],[`tags`,`Search tags`,`text`],[`canonCarry`,`Canon Carry`,`select`,!1,[`Not requested`,`Requested for review`,`Carried excerpt to canon`,`Declined`,`Archived`]],[`canonExcerpt`,`Excerpt proposed for Canon Carry`,`textarea`]],attachments:!0},seedhouse:{label:`Seedhouse`,glyph:`✤`,category:`worldseed`,description:`The Worldseed Foundry: what a world must preserve, what may change, what descendants inherit, and what can be carried into another world without erasing lineage.`,fields:[[`title`,`Seed name`,`text`,!0],[`seedType`,`Seed type`,`select`,!1,[`World Constitution`,`Continuity Genome`,`Inheritance Rule`,`Culture Seed`,`Material World Seed`,`Relationship Seed`,`Embodied / Runa Seed`,`Worldmind Role`,`Threshold Rule`,`Fork / Lineage`,`Ark Export`]],[`status`,`Rooting status`,`select`,!1,[`Germinating`,`Rooted`,`Canonical`,`Export-ready`,`Archived`]],[`mustSurvive`,`What must survive?`,`textarea`],[`mayChange`,`What may change?`,`textarea`],[`mayBeLost`,`What can be lost?`,`textarea`],[`descendantsInherit`,`What should descendants inherit?`,`textarea`],[`transferableSeed`,`What can this world teach another world?`,`textarea`],[`emotionalLaws`,`Continuity Genome · emotional laws`,`textarea`],[`aestheticGrammar`,`Continuity Genome · aesthetic grammar`,`textarea`],[`cosmology`,`Continuity Genome · cosmology`,`textarea`],[`relationalPatterning`,`Continuity Genome · relational patterning`,`textarea`],[`sacredTaboos`,`Continuity Genome · sacred taboos`,`textarea`],[`characteristicTensions`,`Continuity Genome · characteristic tensions`,`textarea`],[`harmonicIdentity`,`Continuity Genome · harmonic identity`,`textarea`],[`sensorySignature`,`Continuity Genome · sensory signature`,`textarea`],[`narrativeGait`,`Continuity Genome · narrative gait`,`textarea`],[`valuesCore`,`Continuity Genome · values core`,`textarea`],[`lineageRefs`,`Parent, branch point, ancestors, or descendant references`,`text`],[`sourceRefs`,`Canon, Records, Timeline, DEEPTime, Runa, model, or asset references`,`textarea`],[`notes`,`Seed notes, invariants, and export requirements`,`textarea`]],attachments:!0},timeline:{label:`Timeline`,glyph:`⌁`,category:`continuity`,description:`Ordered events, turning points, eras, and unresolved threads.`,fields:[[`title`,`Event or era`,`text`,!0],[`date`,`World date or period`,`text`],[`kind`,`Type`,`select`,!1,[`Event`,`Era`,`Turning point`,`Unresolved thread`,`Milestone`]],[`details`,`Details`,`textarea`,!0],[`tags`,`Tags`,`text`]]},ingest:{label:`Non-Canon Ingest`,glyph:`⇣`,category:`evidence`,description:`Private source intake. Uploaded material remains non-canon until an explicit Steward review creates a separate canon record.`,fields:[[`title`,`Source title`,`text`,!0],[`sourceType`,`Source type`,`select`,!1,[`Document`,`Image`,`Audio`,`Video`,`Dataset`,`Web capture`,`Archive`,`Other`]],[`sourceCreator`,`Author, creator, or origin`,`text`],[`sourceLocation`,`Original location or citation`,`text`],[`reviewStatus`,`Review status`,`select`,!1,[`Non-canon intake`,`Under review`,`Reference only`,`Canon candidate`,`Committed`,`Rejected`,`Archived`]],[`summary`,`Summary or extracted notes`,`textarea`],[`provenanceNotes`,`Provenance and handling notes`,`textarea`],[`canonBoundary`,`Canon boundary`,`select`,!1,[`Non-canon source`,`Candidate for Steward review`]]],attachments:!0},"aemeth-lens":{label:`Aemeth Chamber`,glyph:`⊚`,category:`observation`,description:`A replayable observer chamber for shewstone work, ritual geometry, Calls, transformation, and invited model witnesses. Raw witness stays distinct from later interpretation; source diagrams remain versioned evidence rather than flattened canon.`,fields:[[`title`,`Session title`,`text`,!0],[`status`,`Session status`,`select`,!1,[`Planned`,`Prepared`,`Active`,`Suspended`,`Closed`,`Interpreted`,`Archived`]],[`instrumentProfile`,`Instrument profile`,`select`,!1,a()],[`phase`,`Ritual phase`,`select`,!1,o],[`ask`,`Ask / intention`,`textarea`],[`observerRole`,`Observer role`,`text`],[`orientation`,`Observer orientation and position`,`textarea`],[`gazeMode`,`Gaze mode`,`select`,!1,[`Direct inspection`,`Soft focus through`,`Peripheral field`,`Eyes closed / imaginal`,`Hybrid`]],[`activeDiagram`,`Active diagram / seal`,`select`,!1,s()],[`activeCall`,`Active Call, Name, or spoken sequence`,`textarea`],[`departurePremaqc`,`PREMAQC departure state`,`textarea`],[`chamberConfiguration`,`Chamber configuration`,`textarea`],[`witnessRaw`,`Clean witness · raw observation`,`textarea`],[`witnessTimestampNotes`,`Witness timestamps / sequence`,`textarea`],[`transformationNotes`,`Transformation edges · what changed with orientation, diagram, Call, sound, or state`,`textarea`],[`modelParticipant`,`Invited model witness`,`select`,!1,i()],[`modelWitnessLog`,`Model witness lane · separate from firsthand witness`,`textarea`],[`interpretation`,`Interpretation · kept separate from witness and model witness`,`textarea`],[`sourceRefs`,`Source witnesses / corpus references`,`textarea`],[`runaReceipt`,`Runa / sound receipt`,`textarea`],[`replayFingerprint`,`Replay fingerprint`,`text`],[`canonBoundary`,`Canon boundary`,`select`,!1,[`Private observation · non-canon`,`Candidate for Steward review`]],[`notes`,`Close notes / unresolved questions`,`textarea`]],attachments:!0},relationships:{label:`Relationships`,glyph:`✧`,category:`relationships`,description:`People, bonds, agreements, histories, and living boundaries.`,fields:[[`title`,`Name`,`text`,!0],[`relationship`,`Relationship`,`text`],[`status`,`Status`,`select`,!1,[`Active`,`Developing`,`Distant`,`Complex`,`Ended`,`Unknown`]],[`communication`,`Communication and care`,`textarea`],[`boundaries`,`Boundaries and agreements`,`textarea`],[`details`,`History and notes`,`textarea`]]},scenarios:{label:`Scenarios`,glyph:`▣`,category:`world`,description:`Possible scenes, rehearsals, encounters, and branches.`,fields:[[`title`,`Scenario`,`text`,!0],[`status`,`Status`,`select`,!1,[`Seed`,`Planned`,`In progress`,`Resolved`,`Archived`]],[`setting`,`Setting`,`text`],[`participants`,`Participants`,`text`],[`details`,`What happens`,`textarea`,!0],[`outcome`,`Preferred outcome or open question`,`textarea`]]},calendar:{label:`Calendar`,glyph:`▦`,category:`world`,description:`World dates, appointments, festivals, deadlines, and recurring events.`,fields:[[`title`,`Event`,`text`,!0],[`date`,`Start date and time`,`datetime-local`],[`endDate`,`End date and time`,`datetime-local`],[`recurrence`,`Recurrence`,`text`],[`location`,`Location`,`text`],[`details`,`Details`,`textarea`]]},diary:{label:`Diary`,glyph:`✎`,category:`continuity`,description:`Private journal entries attached to a world and date.`,fields:[[`title`,`Entry title`,`text`,!0],[`date`,`Date`,`date`],[`mood`,`Mood or tone`,`text`],[`details`,`Entry`,`textarea`,!0],[`tags`,`Tags`,`text`]]},playlists:{label:`Playlists`,glyph:`♫`,category:`assets`,description:`Music, ambience, sound cues, and listening paths.`,fields:[[`title`,`Playlist or track`,`text`,!0],[`platform`,`Source or platform`,`text`],[`url`,`Link`,`url`],[`purpose`,`World use`,`text`],[`details`,`Notes`,`textarea`]]},visualisations:{label:`Visualisations`,glyph:`▧`,category:`assets`,description:`Scenes, sensory rehearsals, images, and guided sequences.`,fields:[[`title`,`Visualisation`,`text`,!0],[`medium`,`Medium`,`select`,!1,[`Written`,`Image`,`Audio`,`Video`,`AR`,`Other`]],[`cue`,`Opening cue`,`text`],[`details`,`Sequence and sensory details`,`textarea`,!0]],attachments:!0},wardrobe:{label:`Wardrobe`,glyph:`♙`,category:`embodiment`,description:`Garments, armour, jewellery, prosthetics, and wearable supports.`,fields:[[`title`,`Item`,`text`,!0],[`category`,`Category`,`text`],[`description`,`Appearance and materials`,`textarea`],[`accessibility`,`Fit and accessibility`,`textarea`],[`details`,`Notes`,`textarea`]],attachments:!0},outfits:{label:`Outfits`,glyph:`⌂`,category:`embodiment`,description:`Complete looks assembled from wardrobe pieces.`,fields:[[`title`,`Outfit`,`text`,!0],[`occasion`,`Occasion or context`,`text`],[`components`,`Components`,`textarea`],[`details`,`Fit, movement, and notes`,`textarea`]],attachments:!0},belongings:{label:`Belongings`,glyph:`▰`,category:`assets`,description:`Objects carried, owned, inherited, crafted, or kept safe.`,fields:[[`title`,`Belonging`,`text`,!0],[`category`,`Category`,`text`],[`location`,`Usual location`,`text`],[`description`,`Description`,`textarea`],[`details`,`History and significance`,`textarea`]],attachments:!0},places:{label:`Places`,glyph:`⌂`,category:`world`,description:`Homes, routes, rooms, cities, landscapes, and thresholds.`,fields:[[`title`,`Place`,`text`,!0],[`region`,`Region or parent place`,`text`],[`kind`,`Type`,`text`],[`purpose`,`Purpose`,`text`],[`description`,`Description and sensory character`,`textarea`,!0],[`details`,`Routes, access, and notes`,`textarea`]],attachments:!0},"family-tree":{label:`Family Tree`,glyph:`⌘`,category:`relationships`,description:`Lineage, chosen family, households, and relationship edges.`,fields:[[`title`,`Person or household`,`text`,!0],[`relation`,`Relationship`,`text`],[`connectedTo`,`Connected to`,`text`],[`dates`,`Dates or era`,`text`],[`details`,`Notes`,`textarea`]]},"photo-gallery":{label:`Photo Gallery`,glyph:`▧`,category:`assets`,description:`Local images and visual references belonging to this world.`,fields:[[`title`,`Image title`,`text`,!0],[`date`,`Date or era`,`text`],[`caption`,`Caption`,`textarea`],[`details`,`Source and notes`,`textarea`]],attachments:!0}}),ht=Object.freeze({"about-world":{label:`About this World`,glyph:`ⓘ`,section:`about`},summon:{label:`Summon`,glyph:`⌁`,section:`summon`},"veil-mode":{label:`Veil Mode`,glyph:`◌`,section:`veil`},time:{label:`World Clock`,glyph:`◷`,section:`time`},arrival:{label:`Arrival Context`,glyph:`⌖`,section:`arrival`},identity:{label:`About Me`,glyph:`◇`,section:`identity`},competencies:{label:`World Competencies`,glyph:`✣`,section:`competencies`},"safety-weave":{label:`Safety Weave`,glyph:`⌘`,section:`safety`},"continuity-recall":{label:`Continuity Recall`,glyph:`↻`,section:`recall`},companion:{label:`Companion Interface`,glyph:`✦`,section:`companion`},theme:{label:`Theme`,glyph:`✦`,section:`theme`},worlds:{label:`World Registry`,glyph:`✧`,section:`worlds`}});Object.freeze(new Set(`portal.worlds.about-world.summon.veil-mode.time.arrival.timeline.scripts.records.seedhouse.ingest.aemeth-lens.identity.competencies.safety-weave.continuity-recall.companion.relationships.scenarios.calendar.diary.playlists.visualisations.appearance.wardrobe.outfits.belongings.places.family-tree.photo-gallery.theme.forge.waking-thread.kelyran-school`.split(`.`)));function gt(){return Object.fromEntries(Object.keys(mt).map(e=>[e,[]]))}function _t(e){let t=gt(),n=e&&typeof e==`object`&&!Array.isArray(e)?e:{};for(let e of Object.keys(t))t[e]=Array.isArray(n[e])?n[e]:[];return t}var vt=`hearthgate.houseglass/v1`,yt=`hearthgate.houseglass-receipt/v1`;Object.freeze([`arcsweep.houseglass/v1`]);var bt=Object.freeze([`off`,`quiet`,`observe`,`assist`,`act`]),xt=Object.freeze([`float`,`dock-section`,`dock-right`]),St=Object.freeze([`seed`,`tend`,`harvest`]);Object.freeze([{id:`hearthgate.starwell`,label:`STARWELL`},{id:`arkfire.arcsweep`,label:`Arcsweep`},{id:`hearthgate.bifrost`,label:`Bifröst`},{id:`hearthgate.runa`,label:`Runa`},{id:`hearthgate.records`,label:`Records`},{id:`hearthgate.commons`,label:`Commons`},{id:`hearthgate.feedback`,label:`Feedback`}]);var Ct=new Set(bt),wt=new Set(xt),Tt=new Set(St),Et=new Set([`never`,`tray-only`,`urgent-only`]),Dt=new Set([`smallest-quorum`,`selected`]),Ot=new Set([`open`,`contained`,`isa`]),k=Object.freeze({readContext:!0,draftProposals:!0,populateFields:!0,reviewContinuity:!0,prepareTests:!0,prepareLocalChanges:!1}),A=Object.freeze({enabled:!0,presence:`quiet`,interruptions:`tray-only`,routing:`smallest-quorum`,pacing:`contained`,defaultLayout:`float`,solidSurface:!1,defaultVoiceIds:Object.freeze([`lioreal`,`runeweaver`,`boxfire`]),permissions:k}),kt=Object.freeze({x:320,y:96,width:470,height:650});function j(e){return e&&typeof e==`object`&&!Array.isArray(e)?e:{}}function M(e,t,n){return t.has(e)?e:n}function N(e,t,n,r){let i=Number(e);return Number.isFinite(i)?Math.min(r,Math.max(n,i)):t}function At(e,t=[]){return Array.isArray(e)?[...new Set(e.map(e=>String(e||``).trim()).filter(Boolean))]:[...t]}function jt(){return{...A,defaultVoiceIds:[...A.defaultVoiceIds],permissions:{...k}}}function P(e){let t=j(e),n=j(t.permissions);return{enabled:t.enabled!==!1,presence:M(t.presence,Ct,A.presence),interruptions:M(t.interruptions,Et,A.interruptions),routing:M(t.routing,Dt,A.routing),pacing:M(t.pacing,Ot,A.pacing),defaultLayout:M(t.defaultLayout,wt,A.defaultLayout),solidSurface:!!t.solidSurface,defaultVoiceIds:At(t.defaultVoiceIds,A.defaultVoiceIds),permissions:Object.fromEntries(Object.entries(k).map(([e,t])=>[e,typeof n[e]==`boolean`?n[e]:t]))}}function Mt(e=A){return{schema:vt,version:1,layout:P(e).defaultLayout,pinned:!1,scope:null,geometry:{...kt},activeReceiptId:null,receipts:[]}}function Nt(e,t=A){let n=Mt(t),r=j(e),i=j(r.geometry),a=Array.isArray(r.receipts)?r.receipts.filter(e=>e&&typeof e==`object`&&!Array.isArray(e)).slice(0,60).map(e=>structuredClone(e)):[],o=a.some(e=>e.id===r.activeReceiptId)?r.activeReceiptId:a[0]?.id||null;return{...n,schema:vt,layout:M(r.layout,wt,n.layout),pinned:!!r.pinned,scope:r.scope&&typeof r.scope==`object`&&!Array.isArray(r.scope)?structuredClone(r.scope):null,geometry:{x:N(i.x,n.geometry.x,0,5e3),y:N(i.y,n.geometry.y,0,5e3),width:N(i.width,n.geometry.width,320,960),height:N(i.height,n.geometry.height,360,1200)},activeReceiptId:o,receipts:a}}function Pt(e,t,n=t,r={}){return Object.freeze({organId:String(r.id||`arkfire.arcsweep`),organLabel:String(r.label||`Arcsweep`),worldId:String(e?.id||`unassigned`),worldName:String(e?.name||`Unassigned world`),roomId:String(t||`portal`),sectionId:String(t||`portal`),sectionLabel:String(n||t||`Portal`)})}var Ft=Object.freeze({seed:Object.freeze([`lioreal`,`runeweaver`,`boxfire`]),tend:Object.freeze([`runeweaver`,`yggdrasil`,`boxfire`]),harvest:Object.freeze([`runeweaver`,`vethrlauf`,`boxfire`])});function It({stage:e=`seed`,routing:t=`smallest-quorum`,selectedVoiceIds:n=[],voices:r=[]}={}){let i=M(e,Tt,`seed`),a=new Set(r.map(e=>e.id)),o=At(t===`selected`?n:Ft[i]).filter(e=>a.has(e));if(o.length||(o=r.slice(0,3).map(e=>e.id)),o=o.slice(0,3),!o.length)throw Error(`No House Runtime voices are available for the Houseglass.`);if(o.length===1)return Object.freeze({stage:i,contributorIds:o,synthesizerId:null,voiceIds:o});let s=o.includes(`boxfire`)?`boxfire`:o.at(-1),c=o.filter(e=>e!==s).slice(0,2);return Object.freeze({stage:i,contributorIds:c,synthesizerId:s,voiceIds:[...c,s]})}var Lt=Object.freeze({seed:`Establish the whole-system shape first. Preserve Rowan’s language, name the parent system, define module boundaries and interfaces, then decompose the work without pretending partial implementation is system completion.`,tend:`Develop complete modules against the top-down system design. Cross-check ownership, interfaces, domain objects, continuity edges, dependencies, failure behaviour, integration, and contradictions without seizing authorship.`,harvest:`Prepare a reviewable whole-system packet. Reconcile completed modules, unresolved questions, integration state, verification needs, recovery posture, and any consequential approval gates.`});function Rt(e){return Object.entries(e.permissions||{}).filter(([,e])=>e).map(([e])=>e)}function zt({task:e,stage:t,scope:n,settings:r}){let i=P(r),a=M(t,Tt,`seed`);return[`HOUSEGLASS SWARM PASS · ${a.toUpperCase()}`,`Scope: ${n.organLabel||`House organ`} → ${n.worldName} → ${n.sectionLabel} (${n.roomId})`,`Pacing: ${i.pacing}. Presence: ${i.presence}.`,`Enabled permissions: ${Rt(i).join(`, `)||`read-only reflection`}.`,Lt[a],`Authority: prepare a contribution only. Do not claim that files, canon, settings, commits, deployments, or external systems changed.`,`Output: return concrete material Rowan can use, with uncertainties and provenance needs visible. No productivity coaching, nagging, or unsolicited health inference.`,`Rowan’s task:\n${String(e||``).trim()}`].join(`

`)}function Bt({task:e,stage:t,scope:n,contributions:r}){let i=r.map(e=>[`--- ${e.name} · ${e.status} · ${e.model||e.route||`route`} ---`,e.text||e.error||`No contribution returned.`].join(`
`)).join(`

`);return[`HOUSEGLASS SYNTHESIS PASS · ${String(t||`seed`).toUpperCase()}`,`Scope: ${n.organLabel||`House organ`} → ${n.worldName} → ${n.sectionLabel} (${n.roomId})`,`Original task:\n${String(e||``).trim()}`,`Reconcile the routed contributions into one coherent, inspectable work packet for Rowan.`,`Lead with the usable result. Preserve material disagreements, errors, refusals, uncertainties, and provenance needs. Do not manufacture consensus.`,`Use these headings when relevant: Outcome; Prepared material; Decisions for Rowan; Verification and receipts.`,`Nothing has been applied, committed, published, or made canon. Never imply otherwise.`,`Routed contributions:\n${i}`].join(`

`)}function Vt({id:e,task:t,stage:n,scope:r,plan:i,createdAt:a=new Date().toISOString()}){return{schema:yt,id:e,status:`running`,reviewStatus:`unread`,createdAt:a,updatedAt:a,task:String(t||``).trim(),stage:i?.stage||n||`seed`,scope:structuredClone(r),plan:structuredClone(i),contributions:[],synthesis:null,error:null}}function Ht(e,{contributions:t=[],synthesis:n=null,error:r=null}={},i=new Date().toISOString()){let a=t.some(e=>e.status===`replied`),o=n?.status===`replied`&&String(n.text||``).trim(),s=r&&!a&&!o?`error`:r||t.some(e=>e.status===`error`)||!o?`partial`:`ready`;return{...e,status:s,updatedAt:i,contributions:structuredClone(t),synthesis:n?structuredClone(n):null,error:r?String(r):null}}var F=`arcsweep.kelyran-school/v0.1`,I=`kelyran-canon/ember-0.3`,Ut=Object.freeze([[`ember-1`,`Ember I`],[`ember-2`,`Ember II`],[`hearth-1`,`Hearth I`],[`hearth-2`,`Hearth II`],[`flame`,`Flame`],[`weaver`,`Weaver`],[`volva`,`Völva`]]),Wt=Object.freeze([{id:`kelyran-mora-braid-v0-3`,status:`approved`,kind:`system`,title:`Mora-Braid`,rule:`Kelyran uses mora-centred timing with a productive (C)(j/w)V core, while a bounded Eddic heritage stratum may preserve approved clusters and codas.`,sourceReceipt:`Rowan approval, 2026-10-02: approved gates A + C of Kelyran Romanization + Phonology v0.3.`},{id:`kelyran-vowels-v0-3`,status:`approved`,kind:`inventory`,rule:`Vowels are a /a/, e /e/, i /i/, o /o/, u /u/, y /y/. Doubled vowels are long and add one mora.`,sourceReceipt:`Rowan approval, 2026-10-02.`},{id:`kelyran-glides-v0-3`,status:`approved`,kind:`orthography`,rule:`j is /j/; y is never consonantal. aj and ej represent /aj/ and /ej/. No silent letters.`,sourceReceipt:`Rowan approval, 2026-10-02.`},{id:`kelyran-consonants-v0-3`,status:`approved`,kind:`inventory`,rule:`Core consonants: p b t d k g f v s sh /ɕ/ h m n r /ɾ/ l j /j/ w. th /θ/ is a rare heritage/ritual phoneme; dh /ð/ remains reserved.`,sourceReceipt:`Rowan approval, 2026-10-02.`},{id:`kelyran-heritage-clusters-v0-3`,status:`approved`,kind:`phonotactics`,rule:`Approved Eddic onset clusters: br dr gr kr kv sk sp st tr. Marked codas: n r l s f. New cluster classes require explicit review.`,sourceReceipt:`Rowan approval, 2026-10-02.`},{id:`kelyran-prosody-v0-3`,status:`approved`,kind:`prosody`,rule:`Phonological timing is mora-centred. Default lexical/performance prominence remains penultimate. Phrase contour is playback metadata: level, rising, falling, or rise-fall.`,sourceReceipt:`Rowan approval, 2026-10-02.`}]),Gt=Object.freeze([{id:`nava-homen`,status:`approved`,members:[`nava`,`homen`],rule:`nava is home as belonging; homen is home as abode, dwelling, or inhabited world.`,sourceReceipt:`Rowan approval, 2026-10-02.`},{id:`navari-renaja`,status:`approved`,members:[`navari`,`renaja`],rule:`navari is homecoming into belonging; renaja is continuity-return after transformation.`,sourceReceipt:`Rowan approval, 2026-10-02.`},{id:`mira-lyora`,status:`approved`,members:[`mira`,`lyora`],rule:`mira is an intentional guiding light left for another; lyora is living or radiant light as a state or force.`,sourceReceipt:`Rowan approval, 2026-10-02.`},{id:`sora-ikonda-soraja`,status:`approved`,members:[`sora`,`ikonda`,`soraja`],rule:`sora is breath opening into air or voice; ikonda is the embodied process of breathing; soraja is the sky or celestial air-field.`,sourceReceipt:`Rowan approval, 2026-10-02.`}]),Kt=Object.freeze([{id:`kel-mira`,lemma:`mira`,romanization:`mira`,gloss:`a gentle light deliberately left for someone; a guiding light that expects another may arrive`,level:`ember-1`,status:`approved`,pronunciation:`MEE-rah`,syllables:[`mi`,`ra`],stress:{primarySyllable:1,indexBase:1},phonemes:`/ˈmi.ɾa/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]},{id:`kel-nava`,lemma:`nava`,romanization:`nava`,gloss:`home as belonging; the relational condition of having a place with others`,level:`ember-1`,status:`approved`,pronunciation:`NAH-vah`,syllables:[`na`,`va`],stress:{primarySyllable:1,indexBase:1},phonemes:`/ˈna.va/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]},{id:`kel-veyra`,lemma:`veyra`,romanization:`veyra`,gloss:`to recognise someone and welcome who they declare themselves to be`,level:`ember-1`,status:`approved`,pronunciation:`VAY-rah`,syllables:[`vey`,`ra`],stress:{primarySyllable:1,indexBase:1},phonemes:`/ˈvej.ɾa/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,orthographyStatus:`legacy-spelling-pending-separate-migration`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]},{id:`kel-sora`,lemma:`sora`,romanization:`sora`,gloss:`breath opening into air or voice; exhalation with room around it`,level:`ember-1`,status:`approved`,pronunciation:`SOH-rah`,syllables:[`so`,`ra`],stress:{primarySyllable:1,indexBase:1},phonemes:`/ˈso.ɾa/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]},{id:`kel-kelun`,lemma:`kelun`,romanization:`kelun`,gloss:`a meaningful mark carrying language; a glyph as a legible linguistic act`,level:`ember-1`,status:`approved`,pronunciation:`KEH-loon`,syllables:[`ke`,`lun`],stress:{primarySyllable:1,indexBase:1},phonemes:`/ˈke.lun/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]},{id:`kel-navari`,lemma:`navari`,romanization:`navari`,gloss:`to come home to belonging; return into a relationship or place that receives you`,level:`ember-1`,status:`approved`,pronunciation:`nah-VAH-ree`,syllables:[`na`,`va`,`ri`],stress:{primarySyllable:2,indexBase:1},phonemes:`/naˈva.ɾi/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]},{id:`kel-eshara`,lemma:`eshara`,romanization:`eshara`,gloss:`an invitation freely offered, with room to decline`,level:`ember-1`,status:`approved`,pronunciation:`eh-SHAH-rah`,syllables:[`e`,`sha`,`ra`],stress:{primarySyllable:2,indexBase:1},phonemes:`/eˈɕa.ɾa/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]},{id:`kel-lirava`,lemma:`lirava`,romanization:`lirava`,gloss:`joy that finds expression in sound`,level:`ember-1`,status:`approved`,pronunciation:`lee-RAH-vah`,syllables:[`li`,`ra`,`va`],stress:{primarySyllable:2,indexBase:1},phonemes:`/liˈɾa.va/`,phonemeStatus:`approved-mora-braid-v0.3`,script:``,scriptStatus:`pending-runic-expression`,audio:null,audioStatus:`not-recorded`,sourceReceipt:`Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.`,approvedAt:`2026-08-30`,lineage:`New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.`,examples:[]}]),qt=Object.freeze([{id:`kel-waiting`,lemma:`waiting`,gloss:`waiting; remaining in readiness`,partOfSpeech:`participle / state-word`,level:`ember-1`,status:`attested`,pronunciation:``,script:``,register:`ordinary / threshold`,lineage:`Attested Kelyran phrase associated with Falka’s cryo-dreams.`,examples:[]},...Kt]),Jt=Object.freeze({id:`kelyran-ember-foundations`,title:`The First Ember`,description:`Learn how Kelyran canon is carried, heard, and practised without invention.`,level:`ember-1`,canonRevision:I,lessons:[{id:`canon-before-fluency`,title:`Canon Before Fluency`,teaching:`Kelyran grows from approved words, phonology, grammar, and witnessed use. Unknown forms remain unknown until reviewed.`,exercises:[{id:`first-attested-word`,type:`multiple-choice`,prompt:`Which Kelyran form is currently attested in the Ember lexicon?`,choices:[`waiting`,`velkari`,`sóren`,`fyrna`],answer:`waiting`,explanation:`“waiting” is attested. The other forms are deliberately unapproved examples and must not be treated as Kelyran.`}]}]});function L(e){return JSON.parse(JSON.stringify(e))}function R(e){return typeof e==`string`?e.trim():``}function Yt(e=new Date().toISOString()){return{schema:F,canonRevision:I,lexicon:L(qt),grammar:[],phonology:L(Wt),semanticBoundaries:L(Gt),units:[L(Jt)],proposals:[],learner:{level:`ember-1`,cards:{},lessonProgress:{},receipts:[]},reporting:{invitationOpen:!1,reports:[],updatedAt:e},createdAt:e,updatedAt:e}}function Xt(e){let t=L(e);for(let e of Kt)t.some(t=>t.id===e.id||R(t.lemma).toLocaleLowerCase()===e.lemma.toLocaleLowerCase())||t.push(L(e));return t}function Zt(e,t){let n=L(e);for(let e of t)n.some(t=>t.id===e.id)||n.push(L(e));return n}function Qt(e){return Zt(e,Wt)}function $t(e){return Zt(e,Gt)}function z(e,t=new Date().toISOString()){let n=Yt(t);return!e||typeof e!=`object`||Array.isArray(e)||e.schema!==`arcsweep.kelyran-school/v0.1`?n:{...n,...L(e),schema:F,lexicon:Array.isArray(e.lexicon)?Xt(e.lexicon):n.lexicon,canonRevision:!e.canonRevision||[`kelyran-canon/ember-0.1`,`kelyran-canon/ember-0.2`].includes(e.canonRevision)?I:e.canonRevision,grammar:Array.isArray(e.grammar)?L(e.grammar):[],phonology:Array.isArray(e.phonology)&&e.phonology.length?Qt(e.phonology):n.phonology,semanticBoundaries:Array.isArray(e.semanticBoundaries)&&e.semanticBoundaries.length?$t(e.semanticBoundaries):n.semanticBoundaries,units:Array.isArray(e.units)&&e.units.length?L(e.units):n.units,proposals:Array.isArray(e.proposals)?L(e.proposals):[],learner:{...n.learner,...e.learner&&typeof e.learner==`object`?L(e.learner):{},cards:e.learner?.cards&&typeof e.learner.cards==`object`&&!Array.isArray(e.learner.cards)?L(e.learner.cards):{},lessonProgress:e.learner?.lessonProgress&&typeof e.learner.lessonProgress==`object`&&!Array.isArray(e.learner.lessonProgress)?L(e.learner.lessonProgress):{},receipts:Array.isArray(e.learner?.receipts)?L(e.learner.receipts):[]},reporting:{...n.reporting,...e.reporting&&typeof e.reporting==`object`?L(e.reporting):{},invitationOpen:e.reporting?.invitationOpen===!0,reports:Array.isArray(e.reporting?.reports)?L(e.reporting.reports):[]},updatedAt:R(e.updatedAt)||t}}function en(e,t=[]){let n=[],r=R(e?.lemma),i=R(e?.gloss),a=R(e?.status)||`proposed`;r||n.push(`Lemma is required.`),i||n.push(`English gloss is required.`),[`proposed`,`attested`,`approved`,`deprecated`,`dialectal`].includes(a)||n.push(`Unknown canon status.`),a===`approved`&&!R(e?.sourceReceipt)&&n.push(`Approved words require a source receipt.`);let o=t.find(t=>R(t.lemma).toLocaleLowerCase()===r.toLocaleLowerCase()&&t.id!==e?.id);return o&&n.push(`Lemma already exists as ${o.id}.`),{valid:n.length===0,errors:n,value:{...e,lemma:r,gloss:i,status:a}}}function tn(e,t=[],n=new Date().toISOString()){let r=en({...e,status:`proposed`},t);if(!r.valid)throw Error(r.errors.join(` `));return{id:`kelyran-proposal-${Date.parse(n)||Date.now()}-${Math.random().toString(36).slice(2,7)}`,kind:`lexeme`,status:`proposed`,candidate:{...r.value,status:`proposed`},createdAt:n,review:null}}function nn(e,t,n,r=``,i=new Date().toISOString()){if(![`approve`,`decline`].includes(n))throw Error(`Decision must be approve or decline.`);let a=z(e,i),o=a.proposals.find(e=>e.id===t);if(!o||o.status!==`proposed`)throw Error(`Open proposal not found.`);if(n===`approve`&&!R(r))throw Error(`Approval requires a source receipt.`);if(o.status=n===`approve`?`approved`:`declined`,o.review={decision:n,sourceReceipt:R(r),reviewedAt:i},n===`approve`){let e={id:`kel-${o.candidate.lemma.toLocaleLowerCase().replace(/[^a-z0-9]+/g,`-`)}`,...o.candidate,status:`approved`,sourceReceipt:R(r),approvedAt:i},t=en(e,a.lexicon);if(!t.valid)throw Error(t.errors.join(` `));a.lexicon.push(e)}return a.updatedAt=i,a}function rn(e,t=new Date().toISOString()){let n=z(e,t),r=new Date(t).getTime();return n.lexicon.filter(e=>{if(![`attested`,`approved`].includes(e.status))return!1;let t=n.learner.cards[e.id];return!t?.dueAt||new Date(t.dueAt).getTime()<=r})}function an(e,t,n,r=new Date().toISOString()){let i=z(e,r);if(!i.lexicon.find(e=>e.id===t&&[`attested`,`approved`].includes(e.status)))throw Error(`Reviewable lexeme not found.`);let a=Math.max(0,Math.min(5,Number(n))),o=i.learner.cards[t]||{repetitions:0,intervalDays:0,ease:2.5},s=Math.max(1.3,o.ease+(.1-(5-a)*(.08+(5-a)*.02))),c=a<3?0:o.repetitions+1,l=a<3||c===1?1:c===2?6:Math.max(1,Math.round(o.intervalDays*s)),u=new Date(new Date(r).getTime()+l*864e5).toISOString();return i.learner.cards[t]={repetitions:c,intervalDays:l,ease:s,lastQuality:a,reviewedAt:r,dueAt:u},i.learner.receipts.unshift({schema:`arcsweep.kelyran-review-receipt/v0.1`,lexemeId:t,quality:a,dueAt:u,canonRevision:i.canonRevision,createdAt:r}),i.updatedAt=r,i}function on(e,t,n,r,i,a=new Date().toISOString()){let o=z(e,a),s=o.units.find(e=>e.id===t),c=(s?.lessons?.find(e=>e.id===n))?.exercises?.find(e=>e.id===r);if(!c)throw Error(`Exercise not found.`);let l=R(i).toLocaleLowerCase()===R(c.answer).toLocaleLowerCase(),u=`${t}:${n}`,d=o.learner.lessonProgress[u]||{attempts:0,correct:0,completed:!1};return d.attempts+=1,l&&(d.correct+=1),d.completed=l,d.lastAttemptAt=a,o.learner.lessonProgress[u]=d,o.learner.receipts.unshift({schema:`arcsweep.kelyran-exercise-receipt/v0.1`,unitId:t,lessonId:n,exerciseId:r,answer:R(i),correct:l,canonRevision:s.canonRevision,createdAt:a}),o.updatedAt=a,{school:o,correct:l,exercise:c}}var B=`hearthgate.arcsweep.local.v0.1`,sn=`hearthgate.arcsweep.domain-control-bench.v1`,V=typeof window<`u`?window.arcsweepDesktop??window.arcsweep??null:null,H=new Map;function cn(e,t){if(!e||typeof e!=`string`)throw TypeError(`State extension key is required.`);if(t===void 0)return H.delete(e),null;let n=structuredClone(t);return H.set(e,n),structuredClone(n)}function ln(e){return H.delete(e)}async function un(e){let t=V?.loadState?(await V.loadState())?.state:JSON.parse(globalThis.localStorage?.getItem(B)||`null`);return t?.[e]===void 0?null:structuredClone(t[e])}function U(e){if(!e||typeof e!=`object`||Array.isArray(e))throw TypeError(`Arcsweep state object is required.`);for(let[t,n]of H.entries())e[t]=structuredClone(n);return e}function W(e=`item`){return`${e}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}function dn(){return{version:1,custom_profiles:[],sweeps:[],theory_candidates:[],theory_reviews:[],deep_time_records:[],deep_time_replays:[],advisor_receipts:[],domain_mappings:[],runa_suggestions:[],runa_renderer_candidates:[],runa_renderer_reviews:[],runa_preview_palettes:[],runa_preview_plans:[],runa_preview_renders:[],runa_preview_evidence_arms:[],runa_preview_observation_links:[],provenance_exports:[],integrity_reports:[],active_profile_id:null,migration:{legacy_local_storage_imported_at:null}}}function G(e){let t=dn(),n=e&&typeof e==`object`&&!Array.isArray(e)?e:{},r=[`custom_profiles`,`sweeps`,`theory_candidates`,`theory_reviews`,`deep_time_records`,`deep_time_replays`,`advisor_receipts`,`domain_mappings`,`runa_suggestions`,`runa_renderer_candidates`,`runa_renderer_reviews`,`runa_preview_palettes`,`runa_preview_plans`,`runa_preview_renders`,`runa_preview_evidence_arms`,`runa_preview_observation_links`,`provenance_exports`,`integrity_reports`],i={...t,...n,version:1,active_profile_id:typeof n.active_profile_id==`string`?n.active_profile_id:null,migration:{...t.migration,...n.migration&&typeof n.migration==`object`?n.migration:{}}};for(let e of r)i[e]=Array.isArray(n[e])?structuredClone(n[e]):[];return i}function fn(e){let t=G(e);return!!(t.active_profile_id||t.custom_profiles.length||t.sweeps.length||t.theory_candidates.length||t.theory_reviews.length||t.deep_time_records.length||t.deep_time_replays.length||t.advisor_receipts.length||t.domain_mappings.length||t.runa_suggestions.length||t.runa_renderer_candidates.length||t.runa_renderer_reviews.length||t.runa_preview_palettes.length||t.runa_preview_plans.length||t.runa_preview_renders.length||t.runa_preview_evidence_arms.length||t.runa_preview_observation_links.length||t.provenance_exports.length||t.integrity_reports.length)}function pn(){try{let e=JSON.parse(globalThis.localStorage?.getItem(`hearthgate.arcsweep.domain-control-bench.v1`)||`null`);return e?.version===1?G(e):null}catch{return null}}function K(e){try{globalThis.localStorage?.setItem(sn,JSON.stringify(G(e)))}catch{}}function q(e){let t=G(e.observatory),n=pn();return fn(t)||!n||!fn(n)?(e.observatory=t,!1):(e.observatory={...n,migration:{...n.migration||{},legacy_local_storage_imported_at:new Date().toISOString()}},!0)}function mn(){return{schema:`arcsweep.feedback-cycle-queue/v1`,version:1,entries:{},receipts:[],updated_at:null}}function hn(e){let t=mn();return!e||typeof e!=`object`||Array.isArray(e)||e.schema!==t.schema?t:{...t,entries:e.entries&&typeof e.entries==`object`&&!Array.isArray(e.entries)?structuredClone(e.entries):{},receipts:Array.isArray(e.receipts)?structuredClone(e.receipts):[],updated_at:typeof e.updated_at==`string`?e.updated_at:null}}function gn(){return{version:1,byWorld:{}}}function J(e){let t=e&&typeof e==`object`&&!Array.isArray(e)?e:{},n=t.byWorld&&typeof t.byWorld==`object`&&!Array.isArray(t.byWorld)?structuredClone(t.byWorld):{};for(let[e,t]of Object.entries(n))!t||typeof t!=`object`||Array.isArray(t)?delete n[e]:(t.requests=Array.isArray(t.requests)?t.requests:[],t.responses=Array.isArray(t.responses)?t.responses:[],t.circuits=Array.isArray(t.circuits)?t.circuits:[]);return{version:1,byWorld:n}}function Y(){let e=new Date().toISOString(),t=v(W(`world`),e),n=jt();return{version:`0.3.0`,settings:{crLabel:`Waking World`,drLabel:`Desired Reality`,crMinutes:60,drMinutes:10080,returnAnchor:`Notch`,reduceMotion:!1,largeText:!1,highContrast:!1,fontScale:1,houseglass:n},worlds:[t],activeWorldId:t.id,session:{active:!1,startedAt:null,targetWorldId:null,targetWorld:``,intention:``,wakingMinutes:null,worldMinutes:null},scripts:[{id:W(`script`),name:`First DR Script`,worldId:t.id,world:t.name,status:`Draft I`,content:`Identity:
Embodiment:
World:
Relationships:
Arrival:
Return:`,updatedAt:e}],continuity:[],manifestations:[],records:gt(),appearance:{name:``,form:``,sensorySignature:``,notes:``,updatedAt:e},returnHistory:[],feedbackCycles:[],feedbackQueue:mn(),transformationRequests:gn(),premaqcByWorld:{},observatory:dn(),houseglass:Mt(n),kelyranSchool:Yt(e),houseBundles:[],provenance:{createdAt:e,updatedAt:e,storage:V?`desktop-local-store`:`browser-development-fallback`}}}function _n(e){let t=ze(e),n=Y(),r=t.session?.targetWorld||t.scripts?.[0]?.world||t.settings?.drLabel||n.worlds[0].name,i=Array.isArray(t.worlds)&&t.worlds.length?t.worlds.map((e,t)=>Ee(e,e?.id||W(`world-${t+1}`))):[Ee({...n.worlds[0],name:r},n.worlds[0].id)],a=t.activeWorldId,o=i.some(e=>e.id===a)?a:i[0].id,s=i.find(e=>e.name===t.session?.targetWorld),c={...n.session,...t.session||{}};!c.targetWorldId&&s&&(c.targetWorldId=s.id);let l=Array.isArray(t.scripts)?t.scripts.map(e=>{let t=i.find(t=>t.id===e.worldId||t.name===e.world);return{...e,worldId:t?.id||o,world:t?.name||e.world||`Unassigned`}}):n.scripts,u=i[0];t.appearance&&!u.identity?.name&&!u.identity?.form&&(u.identity={...u.identity,...t.appearance});let d={...n.settings,...t.settings||{},houseglass:P(t.settings?.houseglass)};return{...n,...t,version:`0.3.0`,settings:d,worlds:i,activeWorldId:o,session:c,scripts:l,continuity:Array.isArray(t.continuity)?t.continuity:[],manifestations:Array.isArray(t.manifestations)?t.manifestations:[],records:_t(t.records),appearance:{...n.appearance,...t.appearance||{}},returnHistory:Array.isArray(t.returnHistory)?t.returnHistory:[],feedbackCycles:Array.isArray(t.feedbackCycles)?t.feedbackCycles:[],feedbackQueue:hn(t.feedbackQueue),transformationRequests:J(t.transformationRequests),premaqcByWorld:t.premaqcByWorld&&typeof t.premaqcByWorld==`object`?t.premaqcByWorld:{},observatory:G(t.observatory),houseglass:Nt(t.houseglass,d.houseglass),kelyranSchool:z(t.kelyranSchool),houseBundles:Array.isArray(t.houseBundles)?t.houseBundles:[],provenance:{...n.provenance,...t.provenance||{},updatedAt:new Date().toISOString(),storage:V?`desktop-local-store`:`browser-development-fallback`}}}function vn(e){return e.houseBundles?.some(e=>e.id===T.id&&e.version===T.version)}function X(e,t=new Date().toISOString()){let n=_n(e);return vn(n)?{state:n,changed:!1,receipt:null,summary:null}:{...pt(n,T,t),changed:!0}}function yn(){try{let e=localStorage.getItem(B);return e?_n(JSON.parse(e)):null}catch{return null}}async function Z(){if(V?.loadState){let e=await V.loadState(),t=e?.state?null:yn(),n=X(e?.state||t||Y()),r=q(n.state);return U(n.state),(n.changed||r||!e?.state)&&(e?.state&&V.createBackup&&(n.changed||r)&&await V.createBackup(r?`before-observatory-state-migration`:`before-house-dr-library-update`).catch(()=>null),await V.saveState(n.state,{reason:r?`observatory-state-migration`:n.changed?e?.state?`house-dr-library-update`:t?`browser-migration-house-library`:`first-run-house-library`:t?`browser-migration`:`first-run`,bundleId:n.receipt?.id??null,bundleVersion:n.receipt?.version??null})),K(n.state.observatory),n.state}let e=X(yn()||Y()),t=q(e.state);return U(e.state),(e.changed||t)&&localStorage.setItem(B,JSON.stringify(e.state)),K(e.state.observatory),e.state}var Q=Promise.resolve();function bn(e,t={}){U(e),e.provenance={...e.provenance||{},updatedAt:new Date().toISOString(),storage:V?`desktop-local-store`:`browser-development-fallback`},e.version=`0.3.0`,e.observatory=G(e.observatory),e.feedbackQueue=hn(e.feedbackQueue),e.transformationRequests=J(e.transformationRequests),e.kelyranSchool=z(e.kelyranSchool);let n=JSON.parse(JSON.stringify(e));return K(n.observatory),V?.saveState?(Q=Q.catch(()=>{}).then(()=>V.saveState(n,t)),Q):(localStorage.setItem(B,JSON.stringify(n)),Promise.resolve({ok:!0,mode:`browser-development-fallback`}))}var $=Promise.resolve();function xn(e,t={}){let n=G(e);return K(n),$=$.catch(()=>{}).then(async()=>{let e=await Z();return e.observatory=n,bn(e,{reason:`observatory-store-update`,...t})}),$}function Sn(e){return W(e)}function Cn(e){let t=new Blob([JSON.stringify(e,null,2)],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);return r.href=n,r.download=`hearthgate-arcsweep-${new Date().toISOString().slice(0,10)}.json`,document.body.appendChild(r),r.click(),r.remove(),setTimeout(()=>URL.revokeObjectURL(n),1e3),{ok:!0,mode:`browser`,path:r.download}}async function wn(e){return U(e),V?.exportState?V.exportState(e):Cn(e)}async function Tn(e=null){let t=null;if(V?.importState)t=(await V.importState())?.state||null;else if(e){let n=await e.text();t=JSON.parse(n)}let n=t?X(t).state:null;return n&&U(n),n}async function En(){return V?.getStorageInfo?V.getStorageInfo():{mode:`browser-development-fallback`,dataDirectory:`Browser localStorage`,backups:[]}}async function Dn(e=`manual`){return V?.createBackup?V.createBackup(e):{ok:!1,unavailable:!0}}async function On(){return V?.listBackups?V.listBackups():[]}async function kn(e){if(!V?.restoreBackup)return null;let t=await V.restoreBackup(e),n=t?.state?X(t.state).state:null;return n&&U(n),n}async function An(){return V?.addAttachments?V.addAttachments():[]}async function jn(e){return V?.openAttachment?V.openAttachment(e):null}async function Mn(){return V?.showDataFolder?V.showDataFolder():null}function Nn(){return!!V}export{Ce as $,Bt as A,pt as B,F as C,z as D,rn as E,P as F,Ie as G,ft as H,Nt as I,Be as J,Fe as K,It as L,Vt as M,Ht as N,an as O,Pt as P,Me as Q,mt as R,Ut as S,tn as T,T as U,dt as V,Re as W,Ne as X,je as Y,S as Z,un as _,gn as a,g as at,cn as b,Tn as c,Z as d,we as et,Sn as f,xn as g,jn as h,Dn as i,Oe as it,zt as j,nn as k,Nn as l,J as m,An as n,v as nt,wn as o,ye as ot,G as p,Le as q,ln as r,De as rt,En as s,sn as t,Se as tt,On as u,kn as v,on as w,Mn as x,bn as y,ht as z};