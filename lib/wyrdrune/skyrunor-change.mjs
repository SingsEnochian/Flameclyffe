// General semantic change proposals. Representation is not consent or execution.
export const CHANGE_SCHEMA='wyrdrune.change/v0.1';
export const CHANGE_PREFIX='ᛋᚴᚳ:';
export const CHANGE_DOMAINS=Object.freeze({value:'ᚠ',identity:'ᛗ',relationship:'ᚷ',state:'ᛋ',time:'ᛏ',provenance:'ᛈ',consent:'ᚹ',structure:'ᛟ',capability:'ᚲ',environment:'ᛖ',extension:'ᛉ'});
export const CHANGE_KINDS=Object.freeze({declare:'ᛞ',observe:'ᛟ',create:'ᚲ',replace:'ᚱ',remove:'ᚾ',increment:'ᛁ',transform:'ᛏ',move:'ᛗ',copy:'ᚲᛈ',rename:'ᚱᚾ',merge:'ᛗᚷ',split:'ᛋ',link:'ᛚ',unlink:'ᚢ',transition:'ᛏᚱ',schedule:'ᛋᚲ',cancel:'ᚲᚾ',grant:'ᚷ',revoke:'ᚱᚹ',correct:'ᚲᚱ',revert:'ᚱᚹᛏ',migrate:'ᛗᚷᚱ',extension:'ᛉ'});
const text=(x,label)=>{if(typeof x!=='string'||!x.trim()||x.length>4000)throw new TypeError('Expected bounded '+label+'.');return x;};
function exact(x,keys){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==keys.slice().sort().join(','))throw new TypeError('Unexpected change fields; no information may be silently discarded.');}
function typed(x,depth=0){
 if(depth>20)throw new RangeError('Change value is too deeply nested.');
 if(['absent','unknown','null'].includes(x?.type)){exact(x,['type']);return {type:x.type};}
 exact(x,['type','value']);
 switch(x.type){
  case 'text': if(typeof x.value!=='string')throw new TypeError('Expected text.');break;
  case 'number': if(typeof x.value!=='number'||!Number.isFinite(x.value)||Object.is(x.value,-0))throw new TypeError('Expected finite canonical number.');break;
  case 'boolean': if(typeof x.value!=='boolean')throw new TypeError('Expected boolean.');break;
  case 'reference': text(x.value,'reference');break;
  case 'list': if(!Array.isArray(x.value))throw new TypeError('Expected list.');return {type:x.type,value:x.value.map(v=>typed(v,depth+1))};
  case 'record': {
   if(!x.value||typeof x.value!=='object'||Array.isArray(x.value))throw new TypeError('Expected record.');
   return {type:x.type,value:Object.fromEntries(Object.keys(x.value).sort().map(k=>[k,typed(x.value[k],depth+1)]))};
  }
  default: throw new TypeError('Unsupported typed change value.');
 }
 return {type:x.type,value:x.value};
}
export function validateChange(input){
 if(JSON.stringify(input)?.length>60000)throw new RangeError('Change proposal exceeds 60 KB.');
 exact(input,['schema','domain','kind','meaning','subject','path','before','after','provenance','consent','effective_at']);
 if(input.schema!==CHANGE_SCHEMA||!Object.hasOwn(CHANGE_DOMAINS,input.domain)||!Object.hasOwn(CHANGE_KINDS,input.kind))throw new TypeError('Unsupported change version, domain or kind. Use extension to retain an uninterpreted meaning.');
 text(input.meaning,'change meaning');text(input.subject,'subject');
 if(!Array.isArray(input.path)||input.path.length>32||!input.path.every(x=>typeof x==='string'&&x.length>0&&x.length<256))throw new TypeError('Expected an explicit path of text segments.');
 exact(input.provenance,['author','source','supersedes']);text(input.provenance.author,'author reference');text(input.provenance.source,'source reference');
 if(!Array.isArray(input.provenance.supersedes)||input.provenance.supersedes.length>32||!input.provenance.supersedes.every(v=>typeof v==='string'&&v.length>0&&v.length<4000))throw new TypeError('Expected superseded source references.');
 exact(input.consent,['status','reference']);
 if(!['not-requested','requested','declared','revoked'].includes(input.consent.status)||
   !(input.consent.reference===null||typeof input.consent.reference==='string'&&input.consent.reference.trim().length>0))throw new TypeError('Invalid consent evidence.');
 if(['declared','revoked'].includes(input.consent.status)&&!input.consent.reference)throw new TypeError('Declared or revoked consent requires a source reference; it is still not authenticated authority.');
 if(input.effective_at!==null&&!(typeof input.effective_at==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input.effective_at)&&Number.isFinite(Date.parse(input.effective_at))&&new Date(input.effective_at).toISOString()===input.effective_at))throw new TypeError('Expected a canonical UTC instant or null.');
 const before=typed(input.before),after=typed(input.after);
 if(input.kind==='create'&&before.type!=='absent')throw new TypeError('Create requires an absent prior value.');
 if(input.kind==='remove'&&after.type!=='absent')throw new TypeError('Remove requires an absent following value.');
 return {schema:CHANGE_SCHEMA,domain:input.domain,kind:input.kind,meaning:input.meaning,subject:input.subject,path:[...input.path],before,after,
  provenance:{author:input.provenance.author,source:input.provenance.source,supersedes:[...input.provenance.supersedes]},
  consent:{status:input.consent.status,reference:input.consent.reference},effective_at:input.effective_at};
}
export function changeToGlyphs(input){const ast=validateChange(input);return CHANGE_PREFIX+CHANGE_DOMAINS[ast.domain]+'/'+CHANGE_KINDS[ast.kind]+' '+JSON.stringify(ast);}
export function glyphsToChange(glyphs){
 if(typeof glyphs!=='string'||!glyphs.startsWith(CHANGE_PREFIX)||glyphs.length>61000)throw new SyntaxError('Expected semantic change proposal header.');
 const offset=glyphs.indexOf(' ');if(offset<0)throw new SyntaxError('Missing typed change payload.');
 const ast=validateChange(JSON.parse(glyphs.slice(offset+1)));
 if(changeToGlyphs(ast)!==glyphs)throw new SyntaxError('Noncanonical or contradictory change glyphs.');
 return ast;
}
export function changeToEnglish(input){const ast=validateChange(input);return 'Proposed '+ast.kind+' change in '+ast.domain+'.\nTyped change record: '+JSON.stringify(ast);}
export function englishToChange(english){
 if(typeof english!=='string'||english.length>61000)throw new TypeError('Expected bounded structured change English.');
 const marker='\nTyped change record: ',offset=english.indexOf(marker);
 if(offset<0)throw new SyntaxError('Missing typed change record.');
 const ast=validateChange(JSON.parse(english.slice(offset+marker.length)));
 if(changeToEnglish(ast)!==english)throw new SyntaxError('Contradictory or unsupported change English.');return ast;
}
export function inspectChange(input){
 const ast=validateChange(input);
 return {schema:'wyrdrune.change-receipt/v0.1',ast,glyphs:changeToGlyphs(ast),english:changeToEnglish(ast),
  representation_supported:true,execution_supported:false,status:'proposal-only',executed:false,
  reason:ast.kind==='extension'||ast.domain==='extension'?'Uninterpreted extension retained; no executor is registered.':'A domain executor and current authenticated authority are required; this codec never applies changes.',
  consent_verified:false,physically_verified:false,external_effects:[]};
}
export const EXAMPLE_CHANGE=Object.freeze({schema:CHANGE_SCHEMA,domain:'identity',kind:'declare',meaning:'Owner declares their eye colour',subject:'owner',path:['eyes','colour'],before:{type:'unknown'},after:{type:'text',value:'hazel green'},provenance:{author:'owner',source:'owner-authored-draft',supersedes:[]},consent:{status:'not-requested',reference:null},effective_at:null});
