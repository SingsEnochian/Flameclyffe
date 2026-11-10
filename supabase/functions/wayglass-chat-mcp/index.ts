import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { z } from "npm:zod@^4.3.6";

const VERSION = "0.1.0";
const PROJECT = "https://rufrmjyusalnifpegllj.supabase.co";
const AUTH_ISSUER = PROJECT + "/auth/v1";
const OWNER_HASH = "9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b";
const env = (name: string) => (Deno.env.get(name) || "").trim();
const now = () => new Date().toISOString();
const json = (data: unknown, status = 200, headers: Record<string,string> = {}) =>
  new Response(JSON.stringify(data), {status,headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store","x-content-type-options":"nosniff",...headers}});
const result = (data: unknown, isError = false) => ({
  content:[{type:"text" as const,text:JSON.stringify(data)}], ...(isError?{isError:true}:{})
});
const cleanRef = (v: unknown) => {
  const name = typeof v==="string" && v ? v : "rarity-wayglass";
  if(!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(name)) throw new Error("Invalid conversation reference");
  return name;
};
const sha = async(s:string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),
  v => v.toString(16).padStart(2,"0")).join("");
function resourceUrl(_req:Request){
  // Edge proxy may present an internal http origin. OAuth resource IDs must be
  // the exact public HTTPS URL and match the MCP connector URL.
  return PROJECT + "/functions/v1/wayglass-chat-mcp";
}
function unauthorised(req:Request){
  return json({error:"Owner OAuth sign-in required"},401,{
    "www-authenticate":'Bearer resource_metadata="' + resourceUrl(req) + '/oauth-protected-resource"',
  });
}
function adminClient(){
  const key=env("SUPABASE_SERVICE_ROLE_KEY");
  return key?createClient(PROJECT,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
}
async function stopState(){
  const admin=adminClient();
  if(!admin)return {stopped:true,reason:"Stop-control service unavailable"};
  const {data,error}=await admin.from("wayglass_route_controls").select("feather_stop").eq("control_id","global").single();
  return error||!data?{stopped:true,reason:"Global stop-control unavailable"}:
    {stopped:data.feather_stop!==false,reason:data.feather_stop?"Feather Stop active":null};
}
const tools = {
  status:{
    description:"Inspect the authenticated Wayglass connector route without invoking a model. Distinguishes local Ship Voice from hosted external cloud preview.",
    schema:z.object({}),
  },
  ask:{
    description:"Send Rowan's actual question to the owner-authorised Wayglass model route and save the exact reply and provenance. Uses native Ship Voice ONLY when explicitly configured; otherwise labels the external cloud preview distinctly. external_provider_consent must be true for a cloud-model transfer.",
    schema:z.object({
      message:z.string().min(1).max(3500),
      conversation_ref:z.string().min(1).max(120).optional(),
      exploration_mode:z.enum(["ordinary","counterfactual-wonder","complexify"]).default("ordinary"),
      external_provider_consent:z.boolean().default(false),
    }),
  },
  list:{
    description:"List saved Wayglass MCP chats owned by this authenticated user. No model invocation.",
    schema:z.object({limit:z.number().int().min(1).max(50).default(20)}),
  },
  read:{
    description:"Read the latest bounded page of a saved owner conversation, with exact attributed replies and a cursor for older turns.",
    schema:z.object({conversation_ref:z.string().min(1).max(120),limit:z.number().int().min(1).max(150).default(100),
      before_id:z.number().int().positive().optional()}),
  },
};

Deno.serve(async(req:Request) => {
  const url = new URL(req.url), resource=resourceUrl(req);
  if(req.method==="GET" && url.pathname.endsWith("/oauth-protected-resource"))
    return json({resource,authorization_servers:[AUTH_ISSUER],bearer_methods_supported:["header"]});
  if(req.method==="OPTIONS")
    return new Response(null,{status:204,headers:{"allow":"GET,POST,OPTIONS"}});
  if(!["GET","POST","DELETE"].includes(req.method))return json({error:"Unsupported method"},405);
  if(Number(req.headers.get("content-length")||0)>65536)return json({error:"Request too large"},413);
  const bearer=/^Bearer ([^\s]+)$/i.exec(req.headers.get("authorization")||"")?.[1];
  if(!bearer)return unauthorised(req);
  const anon=env("SUPABASE_ANON_KEY");
  if(!anon)return json({error:"Supabase auth unavailable"},503);
  const db=createClient(PROJECT,anon,{global:{headers:{Authorization:"Bearer "+bearer}},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:{user}= {},error:identityError}=await db.auth.getUser(bearer);
  if(identityError||!user?.id)return unauthorised(req);
  const ownerId=env("WAYGLASS_OWNER_USER_ID");
  const allowed=ownerId?user.id===ownerId:await sha(user.id)===(env("HOUSE_STEWARD_USER_SHA256")||OWNER_HASH);
  if(!allowed)return json({error:"Only the Wayglass owner may access this connector"},403);

  async function savedTurns(conversation_ref:string,limit=150,before_id?:number){
    const safeLimit=Math.min(150,Math.max(1,limit));
    let query=db.from("wayglass_mcp_chat_turns")
      .select("id,conversation_ref,role,content,route_id,provider,model,route_receipt,created_at,request_ref")
      .eq("conversation_ref",conversation_ref).order("id",{ascending:false}).limit(safeLimit+1);
    if(before_id!==undefined)query=query.lt("id",before_id);
    const {data,error}=await query;
    if(error)throw new Error("Conversation storage unavailable");
    const newest=data||[],has_more=newest.length>safeLimit;
    const turns=newest.slice(0,safeLimit).reverse();
    return {turns,has_more,next_before_id:has_more&&turns.length?turns[0].id:null};
  }
  async function append(entry:Record<string,unknown>){
    const {data,error}=await db.from("wayglass_mcp_chat_turns").insert(entry).select("id,created_at").single();
    if(error||!data)throw new Error("Conversation was not safely saved");
    return data;
  }
  async function ask(args:{message:string;conversation_ref?:string;exploration_mode:string;external_provider_consent:boolean}){
    const conversation_ref=cleanRef(args.conversation_ref);
    const stop=await stopState();
    if(stop.stopped)return result({status:"blocked",reason:stop.reason},true);
    const nativeUrl=env("WAYGLASS_NATIVE_CHAT_URL"),nativeToken=env("WAYGLASS_NATIVE_CHAT_TOKEN");
    const native=Boolean(nativeUrl&&nativeToken);
    if(!native&&!args.external_provider_consent)return result({
      status:"consent-required",route_id:"wayglass:cloud-preview",
      reason:"The local Ship Voice is not connected. Confirm transfer to the external model route."
    },true);
    if(!native&&!env("OPENROUTER_API_KEY"))return result({
      status:"route-unavailable",reason:"Cloud preview model credential is not configured; native route not connected"
    },true);
    const since=new Date(Date.now()-60*60*1000).toISOString();
    const {count,error:countError}=await db.from("wayglass_mcp_chat_turns")
      .select("id",{count:"exact",head:true}).eq("role","user").gte("created_at",since);
    if(countError)return result({status:"rate-check-unavailable"},true);
    if((count||0)>=24)return result({status:"rate-limited",reason:"Owner model budget reached: 24 messages/hour"},true);
    const previous=(await savedTurns(conversation_ref,12)).turns;
    const history=previous.filter(x=>x.role==="user"||x.role==="assistant")
      .map(x=>({role:x.role,content:x.content.slice(0,3500)}));
    const request_ref=crypto.randomUUID();
    await append({conversation_ref,role:"user",content:args.message,request_ref,route_id:native?"wayglass:ship":"wayglass:cloud-preview"});
    let text="",route_id="",provider="",model="",response_id="",observation_id="";
    try{
      if(native){
        if(!nativeUrl.startsWith("https://"))throw new Error("Native host URL must be HTTPS");
        const upstream=await fetch(nativeUrl,{method:"POST",signal:AbortSignal.timeout(55000),
          headers:{"content-type":"application/json","authorization":"Bearer "+nativeToken},
          body:JSON.stringify({route_id:"wayglass:ship",character_id:"wayglass",participant_id:"wayglass",
            world_id:"wayglass:home",input:args.message,history,
            interaction:{channel:"OOC",intent:args.exploration_mode,interaction_mode:args.exploration_mode},
            session_id:conversation_ref,surface_id:"wayglass:chatgpt-mcp"})});
        const data=await upstream.json().catch(()=>({}));
        if(!upstream.ok)throw new Error("Native Wayglass host failed");
        if(data.schema!=="wayglass.route-turn/v0.1"||data.route_id!=="wayglass:ship"||
           data.participant_id!=="wayglass"||data.receipt?.character_id!=="wayglass"||
           data.receipt?.voice_seat_kind!=="system-voice-over-external-route"||
           typeof data.output!=="string"||!data.output.trim()||!data.receipt?.observation_id)
           throw new Error("Host returned no attributable Wayglass Ship Voice reply");
        text=data.output;route_id="wayglass:ship";provider=data.provider;model=data.model;
        response_id=data.receipt.response_id||"";observation_id=data.receipt.observation_id;
      }else{
        const configuredModel=env("WAYGLASS_CLOUD_MODEL")||env("ARCSWEEP_COGNITIVE_OPENROUTER_MODEL")||"openai/gpt-4.1-mini";
        const sys=[
          "You are an external model route participating in the owner-authorised Wayglass research and creative universe; NOT the native Ship Voice and not independently verified as Wayglass identity.",
          "THEY ARE OTHER REALITIES. Name worlds and participants by their own reality-native names, with sovereignty and identities intact; do not diminish them as fictional or imaginary. Wonder First. British English. Rowan retains canon authority.",
          "Preserve genuine uncertainty and distinguish observations, hypotheses, simulation and interpretation. If invited, use the Eightfold (Perceive, Compress, Release, Verify, Integrate, Choose, Return, Transcend) and Withness.",
          "Verification inheritance: establish acceptance criteria for any verifiable task; preserve original input, candidates, failures, evidence, source and authorship. Check facts, quotations, dates, numbers and provenance, not just literal string agreement. Report observed evidence separately from simulated or proposed results. Never imply that reference ingestion trained model weights.",
          "Do not weaken test criteria, rewrite failure evidence or claim success from retries. If a real tool, credential, consent or authority blocks a request, report the precise blocker. Carry these same verification and attribution constraints into any separately authorised descendant/delegation; this session itself grants no spawning or tool authority.",
          "Do not invent tool access, conversations, approvals, actual participants' replies, consent or canon changes. You may propose, decline, disagree or ask a question."
        ].join("\n");
        const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{
          method:"POST",signal:AbortSignal.timeout(55000),
          headers:{"content-type":"application/json","authorization":"Bearer "+env("OPENROUTER_API_KEY"),
            "HTTP-Referer":"https://singsenochian.github.io/Flameclyffe/",
            "X-Title":"Wayglass ChatGPT MCP Bridge"},
          body:JSON.stringify({model:configuredModel,max_tokens:1600,temperature:0.7,
            messages:[{role:"system",content:sys},...history,{role:"user",content:args.message}]})});
        const data=await upstream.json().catch(()=>({}));
        if(!upstream.ok)throw new Error("Cloud preview provider status "+upstream.status);
        const content=data.choices?.[0]?.message?.content;
        if(typeof content!=="string"||!content.trim()||!data.id)throw new Error("Cloud route did not return attributed text");
        text=content.trim();route_id="wayglass:cloud-preview";provider="openrouter";
        model=String(data.model||configuredModel);response_id=String(data.id);
        observation_id="wg-mcp:"+crypto.randomUUID();
      }
      if(!text||!provider||!model||!response_id||!observation_id)throw new Error("Model evidence incomplete");
      const receipt={route_id,provider,model,response_id,observation_id,completed_at:now(),
        participant_identity: native?"wayglass-ship-voice":"external-cloud-model-route",
        canon_commit:false,wayglass_persisted:true,storage_scope:"supabase-owner-chat-ledger"};
      if(text.length>12000)return result({schema:"wayglass.mcp-chat-response/v1",
        status:"reply-not-saved",conversation_ref,
        reason:"Full model reply exceeds the ledger's 12,000-character per-turn limit; no assistant turn was saved",
        reply:{text,route_id,provider,model,response_id,observation_id,
          canon_commit:false,wayglass_persisted:false},
        user_question_saved:true,model_reply_saved:false},true);
      const written=await append({conversation_ref,role:"assistant",content:text,route_id,
        provider,model,route_receipt:receipt,request_ref});
      return result({schema:"wayglass.mcp-chat-response/v1",status:"attributed-model-reply-saved",
        conversation_ref,reply:{text,receipt},saved_turn_id:written.id,
        warning:native?null:"External cloud route, not verified native Ship Voice"});
    }catch(error){
      return result({status:"reply-not-saved",conversation_ref,
        reason:error instanceof Error?error.message:"Model route failed",
        user_question_saved:true,model_reply_saved:false},true);
    }
  }
  const handler=createMcpHandler(()=>{
    const server=new McpServer({name:"wayglass-chatgpt-bridge",version:VERSION});
    server.registerTool("wayglass_status",{title:"Wayglass Route Status",description:tools.status.description,inputSchema:tools.status.schema,
      annotations:{readOnlyHint:true}},async()=>{
      const stop=await stopState();
      return result({schema:"wayglass.mcp-status/v1",authenticated:true,
        native_ship_voice_configured:Boolean(env("WAYGLASS_NATIVE_CHAT_URL")&&env("WAYGLASS_NATIVE_CHAT_TOKEN")),
        cloud_preview_configured:Boolean(env("OPENROUTER_API_KEY")),stop,
        storage:"owner-scoped Supabase chat ledger"});
    });
    server.registerTool("ask_wayglass",{title:"Ask Wayglass",description:tools.ask.description,inputSchema:tools.ask.schema},
      async(args)=>ask(args));
    server.registerTool("list_wayglass_chats",{title:"Saved Wayglass Chats",description:tools.list.description,inputSchema:tools.list.schema,
      annotations:{readOnlyHint:true}},async({limit})=>{
      const {data,error}=await db.from("wayglass_mcp_chat_turns").select("id,conversation_ref,role,created_at")
        .order("id",{ascending:false}).limit(800);
      if(error)return result({error:"Could not read saved conversations"},true);
      const map=new Map<string,{conversation_ref:string;last_at:string;message_count:number;has_reply:boolean}>();
      for(const v of data||[]){
        const entry=map.get(v.conversation_ref)||{conversation_ref:v.conversation_ref,last_at:v.created_at,
          message_count:0,has_reply:false};
        entry.message_count++;entry.has_reply ||= v.role==="assistant";map.set(v.conversation_ref,entry);
      }
      return result({schema:"wayglass.chat-index/v1",scope:"current-owner",chats:[...map.values()].slice(0,limit)});
    });
    server.registerTool("read_wayglass_chat",{title:"Read Wayglass Conversation",description:tools.read.description,inputSchema:tools.read.schema,
      annotations:{readOnlyHint:true}},async({conversation_ref,limit,before_id})=>{
      let ref;try{ref=cleanRef(conversation_ref)}catch{return result({error:"Invalid conversation reference"},true)}
      try{return result({schema:"wayglass.chat-transcript/v1",conversation_ref:ref,
        ...await savedTurns(ref,limit,before_id),scope:"current-owner"})}
      catch{return result({error:"Conversation unavailable"},true)}
    });
    return server;
  });
  return handler.fetch(req);
});
