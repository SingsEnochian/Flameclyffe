import {select, marker, receipt} from "./wayglass-circulation-policy.mjs";
const repo=process.env.GITHUB_REPOSITORY, token=process.env.GITHUB_TOKEN;
if(!repo||!token)throw Error("GitHub repository and workflow token required");
const api=async(path,options={})=>{
 const r=await fetch("https://api.github.com"+path,{...options,headers:{
 Accept:"application/vnd.github+json",Authorization:"Bearer "+token,
 "X-GitHub-Api-Version":"2022-11-28",...options.headers}});
 if(!r.ok)throw Error("GitHub API "+r.status+" "+path);
 return r.json();
};
const root="/repos/"+repo;
async function pages(path) {
 const all=[];
 for(let page=1;page<=100;page++){
   const separator=path.includes("?")?"&":"?";
   const batch=await api(path+separator+"per_page=100&page="+page);
   if(!Array.isArray(batch))throw Error("Expected paginated list");
   all.push(...batch);
   if(batch.length<100)return all;
 }
 throw Error("Pagination bound exceeded; refusing incomplete selection");
}
const issues=await pages(root+"/issues?state=open");
const receipts=new Set();
for(const issue of issues.filter(x=>!x.pull_request&&/wayglass|arcsweep|return engine/i.test(x.title+" "+(x.body||"")))){
 const comments=await pages(root+"/issues/"+issue.number+"/comments");
 if(comments.some(c=>(c.body||"").includes(marker)))receipts.add(issue.number);
}
const chosen=select(issues,receipts);
if(!chosen){console.log("No unreceipted eligible tasks; no mutation.");process.exit(0);}
const body=receipt(chosen);
if(process.env.WAYGLASS_APPLY!=="true"){
 console.log("Dry run: "+body);process.exit(0);
}
await api(root+"/issues/"+chosen.number+"/comments",{
 method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})
});
console.log("Selection receipt posted for #"+chosen.number);
