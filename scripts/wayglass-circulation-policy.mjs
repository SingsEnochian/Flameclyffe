// Pure selection policy shared by the scheduled coordinator and tests.
export const marker = "<!-- wayglass-autonomous-circulation:v1 -->";
export function eligible(issue) {
  return !issue.pull_request && issue.state === "open" &&
    /wayglass|arcsweep|return engine/i.test(issue.title+" "+(issue.body||""));
}
export function priority(issue) {
  const text = issue.title+" "+(issue.body||"");
  return (/verified|receipt|cold.return|observer/i.test(text)?4:0)
    + (/test|acceptance|replay/i.test(text)?3:0)
    + (/block|dependency/i.test(text)?1:0);
}
export function select(issues, receiptedIds = new Set()) {
  return issues.filter(eligible).filter(x=>!receiptedIds.has(x.number))
    .sort((a,b)=>priority(b)-priority(a)||a.number-b.number)[0]||null;
}
export function receipt(issue) {
  return [marker,"Wayglass scheduled circulation selection",
    "Selected existing task #"+issue.number+": "+issue.title,
    "Reason: verification/receipt/replay priorities from the accepted roadmap.",
    "State: selected for an authorized worker; execution NOT claimed.",
    "Next: worker must read task acceptance criteria, inspect evidence, and return a real test receipt.",
    "No permissions, canon, identity or other constellation state changed."].join("\n");
}
