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

// Selection is not execution. Keep the organism's distinct states visible.
export const executionMarker = '<!-- wayglass-cell-execution:v1 -->';
export function circulationState(comments = []) {
  const bodies = comments.map(c => typeof c === 'string' ? c : (c.body || ''));
  const selected = bodies.some(body => body.includes(marker));
  const executions = bodies.filter(body => body.includes(executionMarker));
  if (!executions.length) return selected ? 'awaiting-execution' : 'unselected';
  const latest = executions.at(-1);
  if (/^Result: verified$/m.test(latest) && /^Evidence: \S+/m.test(latest)) return 'verified';
  if (/^Result: blocked$/m.test(latest)) return 'blocked';
  if (/^Result: failed$/m.test(latest)) return 'failed';
  return 'unverified';
}
export function circulationSnapshot(issues, commentsByIssue = new Map()) {
  return issues.filter(eligible).map(issue => ({
    issue: issue.number, title: issue.title,
    state: circulationState(commentsByIssue.get(issue.number) || [])
  }));
}
