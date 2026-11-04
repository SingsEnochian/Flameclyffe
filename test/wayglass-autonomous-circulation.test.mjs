import test from "node:test";
import assert from "node:assert/strict";
import {select,eligible,priority,receipt,marker} from "../scripts/wayglass-circulation-policy.mjs";
const task=(number,title,body="")=>({number,title,body,state:"open"});
test("prioritizes verification evidence over generic work",()=>{
 assert.equal(select([task(1,"Wayglass styling"),task(2,"Wayglass observer","verified receipt acceptance")]).number,2);
});
test("skips completed selection receipts and advances",()=>{
 assert.equal(select([task(1,"Wayglass observer","verified receipt"),task(2,"Wayglass return")],new Set([1])).number,2);
});
test("never selects pull requests, closed issues or unrelated tasks",()=>{
 assert.equal(eligible({...task(1,"Wayglass"),pull_request:{}}),false);
 assert.equal(eligible({...task(1,"Wayglass"),state:"closed"}),false);
 assert.equal(select([task(3,"Unrelated")]),null);
});
test("receipts are explicitly not execution proof",()=>{
 const text=receipt(task(4,"Wayglass Return"));
 assert.ok(text.includes(marker));assert.match(text,/execution NOT claimed/);
});
