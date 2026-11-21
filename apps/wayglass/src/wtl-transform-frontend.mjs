// WTL experimental derivational frontend: source -> AST -> typed IR -> semantic value.
// Deliberately scoped to roots, tend/wonder and optional bounded Möbius twists.
import {root,transform,trace,meaning} from './wtl-transform-semantics.mjs';
const MAX_SOURCE=512,MAX_DEPTH=24;
export function parseWTL(source){
 if(typeof source!=='string'||source.length>MAX_SOURCE)throw SyntaxError('WTL source must be a bounded string');
 const tokens=[];
 const tokenPattern=/[A-Za-z][A-Za-z0-9_]*|[-+]?(?:\d+(?:\.\d+)?|\.\d+)|[(),@]/y;
 let offset=0;
 while(offset<source.length){
  if(/\s/.test(source[offset])){offset++;continue;}
  tokenPattern.lastIndex=offset;
  const match=tokenPattern.exec(source);
  if(!match)throw SyntaxError('Unexpected WTL character at offset '+offset);
  tokens.push(match[0]);offset=tokenPattern.lastIndex;
 }
 // Whitespace may separate tokens, but never splice a name or numeric literal.
 if(tokens.length>128)throw SyntaxError('WTL token limit');
 let at=0;
 function expr(depth){
  if(depth>MAX_DEPTH)throw SyntaxError('WTL nesting limit');
  const name=tokens[at++];
  if(!name||!/^[a-z][a-z0-9_]*$/.test(name))throw SyntaxError('Expected WTL name');
  if(tokens[at]!=='(')return Object.freeze({type:'Root',name});
  at++;
  const subject=expr(depth+1);
  let twist=0;
  if(tokens[at]===','){at++;if(tokens[at++]!=='twist'||tokens[at++]!=='@')throw SyntaxError('Expected twist@number');twist=Number(tokens[at++]);if(!Number.isFinite(twist))throw SyntaxError('Invalid twist');}
  if(tokens[at++]!==')')throw SyntaxError('Expected closing parenthesis');
  return Object.freeze({type:'Transform',operator:name,subject,twist});
 }
 const ast=expr(0);if(at!==tokens.length)throw SyntaxError('Trailing WTL tokens');return ast;
}
export function lowerWTL(ast){
 if(!ast||typeof ast!=='object')throw TypeError('Invalid AST');
 if(ast.type==='Root'){const node=root(ast.name);return Object.freeze({type:'WTL.Root',node,semanticType:'Possibility'});}
 if(ast.type!=='Transform')throw TypeError('Unknown AST node');
 const child=lowerWTL(ast.subject);
 const node=transform(ast.operator,child.node,{twist:ast.twist});
 return Object.freeze({type:'WTL.Derivation',node,semanticType:ast.operator==='wonder'?'OpenQuestion':'TendedPossibility',inputType:child.semanticType,origin:trace(node),effects:Object.freeze([])});
}
export function compileWTL(source){
 const ast=parseWTL(source),ir=lowerWTL(ast);
 return Object.freeze({schema:'wtl.derivation-compile/v0.1',ast,ir,meaning:meaning(ir.node),lineage:Object.freeze(trace(ir.node)),effects:Object.freeze([]),persisted:false});
}
