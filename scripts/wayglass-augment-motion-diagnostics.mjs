// CI-only diagnosis for the rendered First Contact reduced-motion regression.
// Does not weaken acceptance, alter product code or persist beyond the runner checkout.
import {readFile,writeFile} from 'node:fs/promises';
const path='scripts/wayglass-first-contact-browser.mjs';
const src=await readFile(path,'utf8');
const needle=" await page.waitForFunction(()=>document.querySelector('[data-motion-toggle]')?.disabled===false);";
if(!src.includes(needle))throw new Error('Expected first-contact reduced-motion assertion missing');
const patch=[
 " try {",
 "  await page.waitForFunction(()=>document.querySelector('[data-motion-toggle]')?.disabled===false,null,{timeout:5000});",
 " } catch(original) {",
 "  const observed=await page.evaluate(()=>({",
 "   mediaReduced:matchMedia('(prefers-reduced-motion: reduce)').matches,",
 "   toggleDisabled:document.querySelector('[data-motion-toggle]')?.disabled,",
 "   togglePressed:document.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed'),",
 "   htmlMotion:document.documentElement.dataset.wgMotion,",
 "   featherHeld:document.querySelector('.wg-helm-feather')?.dataset.held,",
 "   visibility:document.visibilityState,",
 "  }));",
 "  throw new Error('FIRST CONTACT MOTION DIAGNOSTIC '+JSON.stringify(observed)+' '+original.message);",
 " }"
].join('\n');
await writeFile(path,src.replace(needle,patch));
