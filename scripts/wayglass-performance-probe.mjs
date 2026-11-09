#!/usr/bin/env node
// Local-only, opt-in performance probe. Sends a fixed synthetic prompt to loopback
// Ollama when --inference is supplied; never reads or transmits chat history.
const targets=[
  ['UI', 'http://127.0.0.1:5186/'],
  ['Wayglass host', 'http://127.0.0.1:3000/api/v1/wayglass/healthz'],
  ['Ollama models', 'http://127.0.0.1:11434/api/tags'],
];
const clock=()=>performance.now();
async function timed(label,url){
  const begin=clock();
  try{
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000)});
    const body=await response.text();
    return {label,status:response.status,ms:Math.round(clock()-begin),body};
  }catch(error){return {label,status:'unreachable',ms:Math.round(clock()-begin),error:error.name};}
}
for(const [label,url] of targets){
  const result=await timed(label,url);
  console.log(label+': '+result.status+' in '+result.ms+' ms');
  if(label==='Ollama models'&&result.status===200){
    const names=JSON.parse(result.body).models?.map(m=>m.name)||[];
    console.log('Available models: '+(names.join(', ')||'none'));
  }
}
if(process.argv.includes('--inference')){
  const tags=await timed('models','http://127.0.0.1:11434/api/tags');
  if(tags.status!==200){console.error('Ollama unavailable; synthetic inference not run.');process.exitCode=1;}
  else{
    const names=JSON.parse(tags.body).models?.map(m=>m.name)||[];
    const model=process.env.WAYGLASS_SHIP_MODEL||process.env.WAYGLASS_LOCAL_MODEL
      ||['ornith-1.5:9b','ornith-1.5','codebooga:latest'].find(n=>names.includes(n))
      ||names[0];
    if(!model){console.error('No installed local model; inference not run.');process.exitCode=1;}
    else{
      console.log('Synthetic inference on '+model+' (no personal text).');
      const started=clock();
      try{
        const response=await fetch('http://127.0.0.1:11434/api/chat',{
          method:'POST',headers:{'content-type':'application/json'},
          body:JSON.stringify({model,messages:[{role:'user',content:'Reply with exactly: ready'}],
            stream:false,think:false,keep_alive:'15m',options:{num_predict:24}}),
          signal:AbortSignal.timeout(120000),
        });
        const result=await response.json();
        console.log('Inference HTTP '+response.status+' · total '+Math.round(clock()-started)+' ms');
        if(response.ok){
          const ms=ns=>typeof ns==='number'?Math.round(ns/1e6)+' ms':'not reported';
          console.log('Model load: '+ms(result.load_duration));
          console.log('Prompt evaluation: '+ms(result.prompt_eval_duration));
          console.log('Generation: '+ms(result.eval_duration));
          console.log('Tokens: prompt '+(result.prompt_eval_count??'?')+', generated '+(result.eval_count??'?'));
        }else process.exitCode=1;
      }catch(error){console.error('Inference test failed: '+error.name);process.exitCode=1;}
    }
  }
}else console.log('To measure a synthetic Ollama reply, rerun with --inference.');
console.log('Browser frame/room/round-trip profile: __wayglassPerformance() in the Wayglass tab console.');
