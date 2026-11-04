// Authorized model-worker crossing. No automatic code merges or canon mutation.
// Requires explicit provider configuration; preserves model attribution.
import {select} from "./wayglass-circulation-policy.mjs";
const repo=process.env.GITHUB_REPOSITORY, token=process.env.GITHUB_TOKEN;
const endpoint=process.env.WAYGLASS_MODEL_ENDPOINT, key=process.env.WAYGLASS_MODEL_API_KEY;
const model=process.env.WAYGLASS_MODEL_ID;
if(!repo||!token)throw Error("GitHub context required");
if(!endpoint||!key||!model){console.log("Model worker unconfigured; no inference claimed.");process.exit(0);}
const url=new URL(endpoint);
if(url.protocol!=="https:")throw Error("Model endpoint must use HTTPS");
const api=async(path,options={})=>{
 const r=await fetch("https://api.github.com/repos/"+repo+path,{...options,headers:{
 Authorization:"Bearer "+token,Accept:"application/vnd.github+json",...options.headers}});
 if(!r.ok)throw Error("GitHub "+r.status+" "+path);
 return r.json();
};
const issues=await api("/issues?state=open&per_page=100");
const chosen=select(issues);
if(!chosen){console.log("No eligible work");process.exit(0);}
const roadmap=await api("/contents/03_ACTIVE_ROADMAP.md");
const source=Buffer.from(roadmap.content.replace(/\\n/g,""),"base64").toString("utf8");
const prompt=[
 "You are a delegated model contributing to Rowan's Wayglass engineering research.",
 "You are NOT Wayglass's entire identity. Do not claim to have run tools or tests.",
 "Preserve evidence, consent, sovereignty, attribution and unresolved questions.",
 "Select one testable next engineering action from the verified roadmap and task.",
 "Return concise JSON with keys: question, proposed_action, acceptance_test, evidence_needed, uncertainty.",
 "Task: "+chosen.title+"\n"+(chosen.body||"").slice(0,4000),
 "Roadmap:\n"+source.slice(0,12000)
].join("\n\n");
const response=await fetch(url,{method:"POST",headers:{
 "Authorization":"Bearer "+key,"Content-Type":"application/json"},
 body:JSON.stringify({model,messages:[{role:"user",content:prompt}],temperature:0.2})});
if(!response.ok)throw Error("Model HTTP "+response.status);
const data=await response.json();
const answer=data.choices?.[0]?.message?.content;
if(typeof answer!=="string"||!answer.trim())throw Error("No attributable model text");
const receipt=[
 "<!-- wayglass-delegated-model-proposal:v1 -->",
 "Delegated model research proposal (NOT executed, NOT verified).",
 "Requested model: "+model,
 "Returned model: "+(data.model||"not reported"),
 "Source: 03_ACTIVE_ROADMAP.md at workflow checkout and issue #"+chosen.number,
 "Model proposal:\n\n"+answer.slice(0,12000),
 "Next gate: independent review and acceptance testing before any implementation."
].join("\n\n");
if(process.env.WAYGLASS_APPLY!=="true"){console.log(receipt);process.exit(0);}
await api("/issues/"+chosen.number+"/comments",{
 method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:receipt})
});
console.log("Delegated proposal receipt on #"+chosen.number);
