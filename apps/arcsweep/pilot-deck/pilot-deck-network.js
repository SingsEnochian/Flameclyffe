/** Own the entire Pilot Deck request deadline, including response-body reads. */
export async function fetchPilotJSON(url,options={},ms=13000){
  const controller=new AbortController();
  let timeout;
  const deadline=new Promise((_,reject)=>{
    timeout=setTimeout(()=>{
      const error=new Error('Hearthgate did not finish responding within '+ms/1000+' seconds. The control is ready to retry.');
      error.name='TimeoutError';
      // Reject first so even a transport that ignores abort cannot hold the UI.
      reject(error);
      controller.abort();
    },ms);
  });
  try{
    return await Promise.race([deadline,(async()=>{
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal});
      let data={};
      try{data=await response.json();}catch(error){if(error.name!=='SyntaxError')throw error;}
      return {response,data:data&&typeof data==='object'?data:{}};
    })()]);
  }finally{clearTimeout(timeout);}
}
