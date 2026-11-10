// A readable instrument face for House-authorised, source-backed NOAA data.
// This panel never reads private raw archives, derives PREMAQC or invokes an LLM.
export const NOAA_LIVE_SCHEMA = 'wayglass.noaa-live-snapshot/v1';
const NAMES = Object.freeze({
  solar_wind_speed_km_s: 'Solar wind speed',
  solar_wind_bt_nt: 'Magnetic field magnitude',
  solar_wind_bz_gsm_nt: 'Magnetic Bz (GSM)',
  planetary_kp: 'Planetary Kp',
  goes_xray_flux_w_m2: 'GOES X-ray flux',
});

export function formatNoaaReading(reading) {
  if (!reading || !Object.hasOwn(NAMES,reading.metric_key) ||
      typeof reading.value !== 'number' || !Number.isFinite(reading.value)) return null;
  const value = Math.abs(reading.value)<0.0001 && reading.value !== 0
    ? reading.value.toExponential(3) : reading.value.toLocaleString('en-US',{maximumFractionDigits:3});
  return Object.freeze({
    name:NAMES[reading.metric_key],
    value:value+' '+(reading.unit||''),
    measured_at:reading.measured_at||'Unknown observation time',
    freshness:reading.freshness==='fresh'?'fresh':'stale',
    source:reading.source_url||'',
    energy_band:reading.energy_band||null,
  });
}

export function mountNoaaObserverPanel(root, { fetchImpl = globalThis.fetch, refreshMs = 120000 } = {}) {
  const surface = root?.querySelector?.('[data-surface="wayglass-living-observer"]');
  if (!surface) return () => {};
  const document = root.ownerDocument || globalThis.document;
  const panel = document.createElement('section');
  panel.className = 'glass-panel observer-noaa';
  panel.setAttribute('aria-label','NOAA live sensor observations');
  panel.innerHTML = [
    '<div class="observer-noaa-head"><div><p class="eyebrow">External observatory · verified source</p>',
    '<h2>NOAA · Live sky instruments</h2>',
    '<p>Direct NOAA SWPC measurements. Archived separately in the private Observer store. Neither a simulation nor a measure of consciousness.</p></div>',
    '<button type="button" class="glass-chip" data-noaa-refresh>Refresh readings</button></div>',
    '<p class="observer-noaa-status" role="status" data-noaa-status>Awaiting source measurements.</p>',
    '<ul class="observer-noaa-readings" data-noaa-readings></ul>',
    '<small class="observer-noaa-provenance" data-noaa-provenance>No model turns, forecasts or canon decisions are made from this panel.</small>',
  ].join('');
  surface.appendChild(panel);
  const status=panel.querySelector('[data-noaa-status]');
  const list=panel.querySelector('[data-noaa-readings]');
  const provenance=panel.querySelector('[data-noaa-provenance]');
  const refreshButton=panel.querySelector('[data-noaa-refresh]');
  let disposed=false,controller=null,busy=false;
  async function update() {
    if (disposed || busy) return;
    busy=true;
    controller=new AbortController();
    refreshButton.disabled=true;
    status.textContent='Reading NOAA sources through the authorised Wayglass host…';
    try {
      const response=await fetchImpl('/api/v1/wayglass/observer/noaa/live',{
        cache:'no-store', credentials:'same-origin',signal:controller.signal,
      });
      if (response.status===401) throw new Error('House Steward sign-in is required for live sensor readings.');
      if (!response.ok) throw new Error('The NOAA live instrument is not available on this host.');
      const packet=await response.json();
      if (packet?.schema!==NOAA_LIVE_SCHEMA || !Array.isArray(packet.readings)) throw new Error('Unexpected observation packet.');
      list.replaceChildren();
      for(const reading of packet.readings) {
        const formatted=formatNoaaReading(reading);
        if(!formatted)continue;
        const item=document.createElement('li');
        item.className='observer-noaa-reading';
        item.dataset.freshness=formatted.freshness;
        const label=document.createElement('strong');label.textContent=formatted.name;
        const value=document.createElement('b');value.textContent=formatted.value;
        const stamp=document.createElement('small');
        stamp.textContent=(formatted.freshness==='fresh'?'Observed':'Stale')+' · '+formatted.measured_at+
          (formatted.energy_band?' · '+formatted.energy_band:'');
        item.append(label,value,stamp);list.appendChild(item);
      }
      status.textContent=packet.status==='ready'?'All selected NOAA readings are current.':
        'Some NOAA readings are missing or stale; no values have been invented.';
      provenance.textContent='NOAA SWPC · '+String(packet.captured_at||'')+
        ' · Direct observations, source timestamps retained · Interpretations remain separate.';
    } catch(error) {
      if (!disposed) {
        list.replaceChildren();
        status.textContent=error?.message||'NOAA measurements unavailable.';
        provenance.textContent='No substitute or synthetic observation was displayed.';
      }
    } finally {
      busy=false;refreshButton.disabled=false;controller=null;
    }
  }
  refreshButton.addEventListener('click',update);
  const interval=globalThis.setInterval(update,refreshMs);
  update();
  return () => {
    disposed=true;
    if(controller)controller.abort();
    globalThis.clearInterval(interval);
    refreshButton.removeEventListener('click',update);
    panel.remove();
  };
}
