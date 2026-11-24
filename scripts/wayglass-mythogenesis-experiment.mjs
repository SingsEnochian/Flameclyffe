import {runMythogenesisExperiment} from '../apps/wayglass/src/mythogenesis-experiment.js';
const controller=new AbortController();
process.once('SIGINT',()=>controller.abort());
const report=await runMythogenesisExperiment({signal:controller.signal});
console.log(JSON.stringify(report,null,2));
if(report.status!=='completed')process.exitCode=1;
