import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFocusLaw,LAW_ID,LAW_PATH} from './one-ship-focus-law.mjs';
function fixture(){
 return {
  directive:'## 4a. Mandatory Focus Router Law · '+LAW_ID,
  register:{governance:{focus_router_law:LAW_PATH,focus_router_prerequisite:true}},
  impact:{schema:'wayglass.change-impact/v1',single_mission_issue:583,reconciliation_train_pr:661,entries:[{
   change_id:'sample',
   focus_router:{law:LAW_ID,state:'NOW',mission_issue:583,integration_pr:661,routing:'existing-train',
    duplicate_review:'Compared other source candidates before writing.',owner_outcome:'One working ship.',
    finish_line:'Exact-head check and source receipts.',return_marker:'Built / Verified / Held in #583.'}
  }]}
 };
}
function check(x){return validateFocusLaw(x.impact,x.register,x.directive);}
test('classified NOW work with review and Return passes',()=>{
 const x=fixture();assert.deepEqual(check(x),{law:LAW_ID,checked_entries:1,mission_issue:583,integration_pr:661});
});
test('missing law metadata rejects implementation',()=>{
 const x=fixture();delete x.impact.entries[0].focus_router;assert.throws(()=>check(x),/prerequisite missing/);
});
test('parked work is captured but cannot slip into implementation',()=>{
 const x=fixture();x.impact.entries[0].focus_router.state='PARKED';assert.throws(()=>check(x),/not authorised/);
});
test('another integration PR is not silently authorised',()=>{
 const x=fixture();x.impact.entries[0].focus_router.integration_pr=676;assert.throws(()=>check(x),/#583\/#661/);
});
test('missing duplicate review or Return marker fails closed',()=>{
 const x=fixture();x.impact.entries[0].focus_router.duplicate_review=' ';assert.throws(()=>check(x),/duplicate_review/);
 x.impact.entries[0].focus_router.duplicate_review='Existing candidates reviewed.';
 x.impact.entries[0].focus_router.return_marker='';assert.throws(()=>check(x),/return_marker/);
});
test('law cannot be self-certified without canonical adoption',()=>{
 const x=fixture();x.register.governance.focus_router_prerequisite=false;assert.throws(()=>check(x),/Canonical register/);
 x.register.governance.focus_router_prerequisite=true;x.directive='law absent';assert.throws(()=>check(x),/not adopted/);
});
