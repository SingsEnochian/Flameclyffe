'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../rootfs/usr/libexec/wayglass/boot.wtl'),'utf8');
const {boot}=require('../rootfs/usr/libexec/wayglass/boot-wtl.cjs');
const wtl=require('../../../lib/wyrdrune/wyrdrune.cjs');
test('machine-level boot WTL compiles to one native Eightfold cycle',()=>{
 const ir=wtl.compile(source);
 assert.equal(ir.schema,'wyrdrune.ir/v0.1');
 assert.equal(ir.units.length,1);
});
test('missing host bundle fails closed and produces no success receipt',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'wayglass-os-'));
 try {
  await assert.rejects(boot({root,receiptDir:path.join(root,'receipts'),source}),/Incomplete/);
  assert.equal(fs.existsSync(path.join(root,'receipts','boot-latest.json')),false);
 } finally {fs.rmSync(root,{recursive:true,force:true})}
});
