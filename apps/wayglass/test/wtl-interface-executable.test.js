import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWyrdruneInterface} from '../src/wtl-interface-executable.js';
const source=['interface {','title "My helm"','material labradorite','heading "Welcome"','text "A living room"','action feather "Feather"','action open-codex "Codex"','}'].join('\n');
test('WTL source compiles into bounded typed IR and executable proposal',()=>{
 const r=compileWyrdruneInterface(source,{author:'owner',provenance:'local-test'});
 assert.equal(r.instructions.length,6);
 assert.equal(r.proposal.material,'labradorite');
 assert.equal(r.proposal.nodes[2].action,'feather');
 assert.equal(r.proposal.author,'owner');
 assert.equal(r.proposal.wtl_source,source);
});
test('WTL rejects code execution, unknown actions and trailing commands',()=>{
 for(const s of ['interface {\n eval "evil"\n}', 'interface {\n title "x"\n material clear\n action fetch "url"\n}',source+'\nopen-codex']){
  assert.throws(()=>compileWyrdruneInterface(s));
 }
});
test('WTL rejects missing provenance and over-budget instruction streams',()=>{
 assert.throws(()=>compileWyrdruneInterface(source,{provenance:''}));
 const many=['interface {','title "x"','material clear',...Array.from({length:33},()=> 'text "x"'),'}'].join('\n');
 assert.throws(()=>compileWyrdruneInterface(many));
});
test('WTL rejects forged JSON strings and unclosed blocks',()=>{
 assert.throws(()=>compileWyrdruneInterface('interface {\n title "x"\n material clear\n text "hello"'));
 assert.throws(()=>compileWyrdruneInterface('interface {\n title "x"\n material clear\n text "x"; process.exit(1)\n}'));
});
