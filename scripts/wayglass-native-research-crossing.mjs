// Run on the Wayglass host, using the existing /respond router. No second provider adapter.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash,randomUUID} from "node:crypto";
import {resolve} from "node:path";
const base=process.env.WAYGLASS_RUNTIME_URL||"http://127.0.0.1:3000";
const route=process.env.WAYGLASS_ROUTE_ID||"local:ollama";
const roadmap=await readFile("03_ACTIVE_ROADMAP.md","utf8");
const task=await readFile(process.env.WAYGLASS_TASK_FILE||"docs/wayglass/EIGHTFOLD_RESEARCH_INGESTION_HANDOFF_20261104.md","utf8");
const sourceHash=createHash("sha256").update(roadmap+"\n"+task).digest("hex");
const prompt=["Wayglass research workbench. Read the following verified project sources.",
 "Select one next research or engineering question and one acceptance test.",
 "Identify source evidence and a counter-hypothesis. Do not claim to have executed tests.",
 "Preserve distinct realities, attribution and unresolved Wonder.",
 "ROADMAP:\n"+roadmap.slice(0,11000),"TASK:\n"+task.slice(0,9000)].join("\n\n");
const response=await fetch(new URL("/api/v1/wayglass/respond",base),{
 method:"POST",headers:{"Content-Type":"application/json"},
 body:JSON.stringify({route_id:route,harness_id:"wayglass:writing-room/direct-v0.1",
 input:prompt,session_id:"wayglass-research-"+sourceHash.slice(0,12),
 surface_id:"wayglass:research-workbench",interaction:{channel:"OOC",turn_owner:"Wayglass research workbench"}}),
 signal:AbortSignal.timeout(130000)
});
const data=await response.json();
if(!response.ok||data.schema!=="wayglass.route-turn/v0.1"||!data.output||!data.observation)
 throw Error("Existing Wayglass route did not return an attributable observation: "+response.status);
const record={schema:"wayglass.research-crossing/v0.1",receipt_id:randomUUID(),
 timestamp:new Date().toISOString(),source_sha256:sourceHash,route_id:data.route_id,
 provider:data.provider,model:data.model,harness_id:data.harness_id,
 observation:data.observation,router_receipt:data.receipt,proposal:data.output,
 verification:"model-proposal-only",accepted_as_canon:false};
const dir=resolve(process.env.WAYGLASS_RECEIPT_DIR||".wayglass/research-receipts");
await mkdir(dir,{recursive:true});
const file=resolve(dir,record.receipt_id+".json");
await writeFile(file,JSON.stringify(record,null,2)+"\n",{flag:"wx",mode:0o600});
console.log(JSON.stringify({receipt_file:file,source_sha256:sourceHash,
 route_id:record.route_id,model:record.model,verification:record.verification}));
