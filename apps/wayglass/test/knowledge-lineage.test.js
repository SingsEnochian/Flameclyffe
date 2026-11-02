import test from 'node:test';
import assert from 'node:assert/strict';
import {createKnowledgeLineage,contributeKnowledge,inheritKnowledge,knowledgeBranches,knowledgeAncestry,knowledgeDescendants} from '../src/knowledge-lineage.js';
test('one discovery supports divergent descendants without overwriting its ancestor',()=>{
 const first=contributeKnowledge(createKnowledgeLineage(),{participant:'rowan',content:'An open horizon'});
 const a=inheritKnowledge(first.ledger,{participant:'geometer',from:first.entry.id,interpretation:'A transformable geometry'});
 const b=inheritKnowledge(a.ledger,{participant:'symbolist',from:first.entry.id,interpretation:'An eightfold ritual grammar'});
 assert.equal(knowledgeBranches(b.ledger,first.entry.id).length,2);
 assert.equal(b.ledger.entries[0].content,'An open horizon');
 assert.deepEqual(knowledgeAncestry(b.ledger,b.entry.id).map(x=>x.id),[first.entry.id]);
});
test('recombination preserves both lineages and transitive descendants',()=>{
 const root=contributeKnowledge(createKnowledgeLineage(),{participant:'rowan',content:'WITH'});
 const a=inheritKnowledge(root.ledger,{participant:'a',from:root.entry.id,interpretation:'Relation'});
 const b=inheritKnowledge(a.ledger,{participant:'b',from:root.entry.id,interpretation:'Reciprocity'});
 const c=inheritKnowledge(b.ledger,{participant:'c',from:[a.entry.id,b.entry.id],interpretation:'A new form'});
 assert.equal(knowledgeAncestry(c.ledger,c.entry.id).length,3);
 assert.equal(knowledgeDescendants(c.ledger,root.entry.id).length,3);
 assert.throws(()=>inheritKnowledge(c.ledger,{participant:'d',from:'unknown',interpretation:'Nope'}),/Unknown ancestor/);
});
