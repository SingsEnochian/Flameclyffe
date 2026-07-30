'use strict';
(function(){
  const url='https://rufrmjyusalnifpegllj.supabase.co';
  const key='sb_publishable_z69-aAbQvzFFDRk4SHDYrQ_FuqirkLD';
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  let contractPromise;
  async function getContract(){
    if(!contractPromise){
      contractPromise=fetch(`${url}/rest/v1/observatory_live_contract?select=*`,{headers}).then(async r=>{
        if(!r.ok) throw new Error(`Contract request failed (${r.status})`);
        const rows=await r.json();
        return new Map(rows.map(row=>[row.source_key,row]));
      });
    }
    return contractPromise;
  }
  async function read(sourceKey,{select='*',limit,filters={}}={}){
    const contract=(await getContract()).get(sourceKey);
    if(!contract) throw new Error(`Unknown Observatory source: ${sourceKey}`);
    const params=new URLSearchParams({select});
    for(const [column,value] of Object.entries(contract.active_filter||{})) params.set(column,`eq.${value}`);
    for(const [column,value] of Object.entries(filters)) params.set(column,`eq.${value}`);
    if(contract.default_order){
      const [column,direction='asc']=contract.default_order.split('.');
      params.set('order',`${column}.${direction}`);
    }
    if(Number.isInteger(limit)) params.set('limit',String(limit));
    const response=await fetch(`${url}/rest/v1/${contract.table_name}?${params}`,{headers});
    if(!response.ok) throw new Error(`${sourceKey} request failed (${response.status})`);
    return {data:await response.json(),contract};
  }
  window.ObservatoryLive={read,getContract,version:'observatory-live-v1'};
})();
