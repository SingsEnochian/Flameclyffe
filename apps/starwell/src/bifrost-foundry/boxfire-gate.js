const fail = (code, reason, details = {}) => ({ ok:false, code, reason, details });

export function inspectOrgan(report) {
  if (!report?.organ) return fail('MISSING_ORGAN','No organ identifier supplied.');
  if (!report.reachableFromShell) return fail('MISSING_MOUNT',`${report.organ} is not reachable from the primary Bifröst shell.`);
  if (!report.consumesBifrostState) return fail('PRIVATE_TRUTH',`${report.organ} does not consume canonical BifrostState.`);
  if (!report.emitsReceipts && !report.updatesSharedState) return fail('MISSING_CIRCULATION',`${report.organ} neither updates shared state nor emits traceable receipts.`);
  if (!report.profileMapped) return fail('MISSING_NERVES',`${report.organ} is not mapped to the active world tone, visual, haptic, and narrative profile.`);
  if (report.requiresLegacyDemo) return fail('ORPHANED_ORGAN',`${report.organ} still depends on a separate legacy demo.`);
  if (report.placeholder) return fail('MISSING_SPLEEN',`${report.organ} is a placeholder, not a mounted organ.`);
  if (!Array.isArray(report.tests) || report.tests.some(test => test.status !== 'PASS')) {
    return fail('FAILED_TESTS',`${report.organ} has missing or failing acceptance tests.`, { tests: report.tests || [] });
  }
  if (!Array.isArray(report.platforms) || report.platforms.some(platform => platform.required && platform.status !== 'PASS')) {
    return fail('PLATFORM_BLOCKED',`${report.organ} has an unmet required platform gate.`, { platforms: report.platforms || [] });
  }
  return { ok:true, code:'ORGAN_ACCEPTED', reason:`${report.organ} is mounted, innervated, circulating, profile-mapped, and tested.` };
}

export function assertOrgan(report) {
  const result = inspectOrgan(report);
  if (!result.ok) throw Object.assign(new Error(`${result.code}: ${result.reason}`), { gateResult: result });
  return result;
}
