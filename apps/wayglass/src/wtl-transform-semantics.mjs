// WTL derivational semantics experiment, proposal only.
// Transformation preserves roots and order. No evaluation, side effects or canon adoption.
const ROOTS=new Set(['perceive','open','sustain','possibility','worldseed']);
export function root(name){if(!ROOTS.has(name))throw Error('Unknown WTL experimental root');return Object.freeze({kind:'root',name});}
export function transform(operator,subject,{twist=0}={}){
 if(!['wonder','tend'].includes(operator))throw Error('Unknown transformation');
 if(!subject||!['root','transform'].includes(subject.kind))throw Error('Invalid subject');
 if(!Number.isFinite(twist)||Math.abs(twist)>1)throw Error('Twist out of bounds');
 return Object.freeze({kind:'transform',operator,subject,twist,derivation:Object.freeze(operator==='wonder'?['perceive','open']:['sustain','possibility']),status:'proposed'});
}
export function trace(node){return node.kind==='root'?[node.name]:[...trace(node.subject),...node.derivation,node.operator];}
export function meaning(node){
 if(node.kind==='root')return node.name;
 return node.operator==='wonder'? 'question-about('+meaning(node.subject)+')':'conditions-for('+meaning(node.subject)+')';
}
