'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
async function mod() {
  return import('../../lib/wayglass-review-domain.mjs');
}
const originalSihrelPacket = {
  presentation: {
    schema: 'wayglass.sihrel.divergence-study/v0.1',
    study_type: 'counterfactual-narrative-causal-simulation',
    phases: [
      'Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend',
    ].map((name, index) => ({ name, index: index + 1 })),
  },
};
test('existing engineering profile remains the default and preserves the original prompt', async () => {
  const { selectReviewProfile, ENGINEERING_REVIEW_SYSTEM } = await mod();
  const profile = selectReviewProfile({ presentation: { schema: 'old-engineering-packet' } });
  assert.equal(profile.id,'engineering');
  assert.equal(profile.temperature,0.25);
  assert.equal(profile.max_tokens,850);
  assert.equal(profile.system,ENGINEERING_REVIEW_SYSTEM);
  assert.match(profile.system,/Eightfold World-Tree design/);
});
test('previously stored Sihrel Eightfold packet selects bounded narrative mode', async () => {
  const { selectReviewProfile } = await mod();
  const profile=selectReviewProfile(originalSihrelPacket);
  assert.equal(profile.id,'narrative-branch');
  assert.equal(profile.max_tokens,1600);
  for (const phase of originalSihrelPacket.presentation.phases) {
    assert.ok(profile.system.includes(phase.name),phase.name);
  }
  assert.match(profile.system,/independent agency/);
  assert.match(profile.system,/not a binding decision/);
  assert.match(profile.system,/provenance categories/);
  assert.match(profile.system,/No code deployment, identity change, canon mutation/);
});
test('explicit narrative branch supports other original works without changing auth boundary', async () => {
  const { selectReviewProfile } = await mod();
  const profile=selectReviewProfile({ presentation: {
    review_domain:'narrative-branch',
    study_type:'counterfactual-narrative-causal-simulation',
  }});
  assert.equal(profile.id,'narrative-branch');
});
test('unsupported review domains and invalid narrative subjects fail closed', async () => {
  const { selectReviewProfile }=await mod();
  assert.throws(()=>selectReviewProfile({presentation:{review_domain:'admin-override'}}),
    /unsupported-review-domain/);
  assert.throws(()=>selectReviewProfile({presentation:{review_domain:'narrative-branch',study_type:'engineering'}}),
    /invalid-narrative-study-type/);
  assert.equal(selectReviewProfile({presentation:{schema:'wayglass.sihrel.divergence-study/v0.1',study_type:'anything-else'}}).id,'engineering');
});
test('the narrative profile emits no credential, user ID, endpoint or private story content', async ()=>{
  const { NARRATIVE_BRANCH_REVIEW_SYSTEM }=await mod();
  for(const forbidden of ['SUPABASE_SERVICE_ROLE_KEY','HOUSE_STEWARD_USER_SHA256','bearer','api.github.com','Sihrel','Sihnon','Nerid','Delenn','Neroon']){
    assert.ok(!NARRATIVE_BRANCH_REVIEW_SYSTEM.includes(forbidden),forbidden);
  }
});
