// WTL-authored interface proposals are data, never executable DOM or privileged code.
// A renderer preview does not imply that a Wayglass model generated the proposal.
export const ATELIER_SCHEMA='wayglass.wtl-interface-proposal/v1';
const MATERIALS=new Set(['opaline','labradorite','amber','moss','clear']);
const COMPONENTS=new Set(['heading','text','panel','status','action']);
const ACTIONS=new Set(['none','feather','open-codex','open-writing']);
const MAX_NODES=32;
const cleanSource=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const clean=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f\u007f]/u.test(value);
export function validateWtlInterfaceProposal(proposal){
  if(!proposal||typeof proposal!=='object'||Array.isArray(proposal)||proposal.schema!==ATELIER_SCHEMA)throw new TypeError('Unknown WTL interface proposal');
  if(!clean(proposal.title,100)||!MATERIALS.has(proposal.material))throw new TypeError('Invalid interface title or material');
  if(!Array.isArray(proposal.nodes)||proposal.nodes.length<1||proposal.nodes.length>MAX_NODES)throw new TypeError('Interface node budget exceeded');
  if(!cleanSource(proposal.wtl_source,16000)||!proposal.wtl_source.trim())throw new TypeError('Original WTL source required');
  if(!clean(proposal.author,120)||!clean(proposal.provenance,240))throw new TypeError('Attributable authorship and provenance required');
  const nodes=proposal.nodes.map((node,index)=>{
    if(!node||typeof node!=='object'||!COMPONENTS.has(node.kind)||!clean(node.text,500))throw new TypeError('Invalid interface node '+index);
    const action=node.action??'none';
    if(!ACTIONS.has(action)||(node.kind!=='action'&&action!=='none'))throw new TypeError('Unapproved interface action');
    return Object.freeze({kind:node.kind,text:node.text,action});
  });
  return Object.freeze({schema:ATELIER_SCHEMA,title:proposal.title,material:proposal.material,
    wtl_source:proposal.wtl_source,author:proposal.author,provenance:proposal.provenance,
    nodes:Object.freeze(nodes)});
}
export function renderWtlInterfaceProposal(root,raw,{onAction=()=>{}}={}){
  const proposal=validateWtlInterfaceProposal(raw);
  if(!root||typeof root.replaceChildren!=='function'||!root.ownerDocument)throw new TypeError('DOM root required');
  const doc=root.ownerDocument;
  const stage=doc.createElement('section');
  stage.className='wg-wtl-atelier-preview';
  stage.dataset.material=proposal.material;
  stage.setAttribute('aria-label',proposal.title);
  for(const node of proposal.nodes){
    const tag=node.kind==='heading'?'h2':node.kind==='action'?'button':node.kind==='panel'?'section':'p';
    const el=doc.createElement(tag);
    el.className='wg-wtl-atelier-'+node.kind;
    el.textContent=node.text; // Never interpret generated markup.
    if(node.kind==='status')el.setAttribute('role','status');
    if(node.kind==='action'){
      el.type='button';
      el.dataset.action=node.action;
      if(node.action==='none')el.disabled=true;
      else el.addEventListener('click',()=>onAction(node.action,{author:proposal.author,provenance:proposal.provenance}));
    }
    stage.append(el);
  }
  root.replaceChildren(stage);
  return proposal;
}
