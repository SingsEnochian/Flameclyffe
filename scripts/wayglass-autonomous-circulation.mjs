// Wayglass autonomous circulation: scheduled, idempotent GitHub task selection.
// This is a coordinator, not a claim that a model has independently spoken.
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw new Error("GitHub repository and workflow token required");
const api = async (path, options={}) => {
  const response = await fetch("https://api.github.com"+path, {
    ...options,
    headers: {Accept:"application/vnd.github+json",Authorization:"Bearer "+token,
      "X-GitHub-Api-Version":"2022-11-28",...options.headers}
  });
  if (!response.ok) throw new Error("GitHub API "+response.status+" "+path);
  return response.json();
};
const [owner,name]=repo.split("/");
const issues=await api("/repos/"+owner+"/"+name+"/issues?state=open&per_page=100");
const candidates=issues.filter(x=>!x.pull_request && /wayglass|arcsweep|return engine/i.test(x.title+" "+(x.body||"")));
const scored=candidates.map(issue=>{
  const body=issue.body||"";
  const score=(/verified|receipt|cold.return|observer/i.test(body)?4:0)
    +(/test|acceptance|replay/i.test(body)?3:0)
    +(/block|dependency/i.test(body)?1:0);
  return {issue,score};
}).sort((a,b)=>b.score-a.score||a.issue.number-b.issue.number);
const chosen=scored[0]?.issue;
if (!chosen) {console.log("No eligible issue. No mutation.");process.exit(0);}
const marker="<!-- wayglass-autonomous-circulation:v1 -->";
const comments=await api("/repos/"+owner+"/"+name+"/issues/"+chosen.number+"/comments?per_page=100");
if(comments.some(c=>(c.body||"").includes(marker))) {
  console.log("Existing selection receipt on #"+chosen.number+"; no duplicate.");process.exit(0);
}
const receipt=[marker,"Wayglass scheduled circulation selection",
  "Selected existing task #"+chosen.number+": "+chosen.title,
  "Reason: verification/receipt/replay priorities from the accepted roadmap.",
  "State: selected for an authorized worker; execution NOT claimed.",
  "Next: worker must read task acceptance criteria, inspect evidence, and return a real test receipt.",
  "No permissions, canon, identity or other constellation state changed."].join("\n");
if(process.env.WAYGLASS_APPLY!=="true") {
  console.log("Dry-run selection: #"+chosen.number+"\n"+receipt);process.exit(0);
}
await api("/repos/"+owner+"/"+name+"/issues/"+chosen.number+"/comments",{
 method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:receipt})
});
console.log("Selection receipt posted for #"+chosen.number);
