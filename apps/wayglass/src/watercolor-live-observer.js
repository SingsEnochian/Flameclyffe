import {subscribeWayglassObserver} from './living-observer-model.js';
import {publishWatercolorActivity,watercolorSnapshot} from './watercolor-bridge.js';

export const ROUTE_PIGMENT_KIND=Object.freeze({
  started:'route:pending',completed:'route:responded',failed:'route:failed',
});
export function installWatercolorRouteActivity({
  subscribe=subscribeWayglassObserver,publish=publishWatercolorActivity,
  snapshot=watercolorSnapshot,now=()=>Date.now(),
}={}){
  return subscribe(record=>{
    const kind=ROUTE_PIGMENT_KIND[record?.status];
    if(!kind)return;
    const recent=snapshot().events.at(-1);
    // Route-client often publishes the same event first. The Observer must not
    // double count one event while still reflecting independent host transitions.
    const duplicate=recent?.kind===kind&&recent.actor==='wayglass:route-client'&&
      Number.isFinite(Date.parse(recent.observed_at))&&
      now()-Date.parse(recent.observed_at)<1250;
    if(duplicate)return;
    publish({
      kind,actor:'wayglass:observed-route-transition',
      intensity:record.status==='failed'?.61:.55,
    });
  });
}
