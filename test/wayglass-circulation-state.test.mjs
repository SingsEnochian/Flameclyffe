import test from 'node:test';
import assert from 'node:assert/strict';
import {marker,executionMarker,circulationState,circulationSnapshot} from '../scripts/wayglass-circulation-policy.mjs';

test('selection is not mistaken for completed cellular work',()=>{
 assert.equal(circulationState([]),'unselected');
 assert.equal(circulationState([{body:marker}]),'awaiting-execution');
 assert.equal(circulationState([marker,executionMarker+'\nResult: verified']),'unverified');
});
test('verification requires evidence and latest execution wins',()=>{
 const verified=executionMarker+'\nResult: verified\nEvidence: https://example.org/receipt';
 assert.equal(circulationState([marker,verified]),'verified');
 assert.equal(circulationState([marker,verified,executionMarker+'\nResult: failed']),'failed');
 assert.equal(circulationState([marker,executionMarker+'\nResult: blocked']),'blocked');
});
test('snapshot keeps source issue and honest circulation state',()=>{
 const issue={number:19,title:'Wayglass Observer receipt test',state:'open'};
 assert.deepEqual(circulationSnapshot([issue],new Map([[19,[marker]]])),[
 {issue:19,title:issue.title,state:'awaiting-execution'}]);
});
