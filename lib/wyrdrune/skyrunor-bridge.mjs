// One public semantic translation boundary shared by iPad, Wayglass and its host.
import {translateDeclaration} from './skyrunor.mjs';
import {PROGRAM_PREFIX,wtlToSemanticProgram,semanticProgramToWtl,astToSemanticProgram} from './skyrunor-program.mjs';
import {CHANGE_PREFIX,glyphsToChange,englishToChange,inspectChange} from './skyrunor-change.mjs';
import {englishToWtl} from './bidirectional.mjs';
export function translateSemantic({format,input},options={}) {
 switch(format){
  case 'skyrunor':
   if(typeof input==='string'&&input.startsWith(PROGRAM_PREFIX))return semanticProgramToWtl(input,options);
   if(typeof input==='string'&&input.startsWith(CHANGE_PREFIX))return inspectChange(glyphsToChange(input));
   return translateDeclaration({format,input},options);
  case 'wtl':
   // Compact declarations when possible; otherwise preserve the ENTIRE WTL grammar.
   try{return translateDeclaration({format,input},options);}catch{return wtlToSemanticProgram(input,options);}
  case 'program-ast': return astToSemanticProgram(input,options);
  case 'change': return inspectChange(input);
  case 'change-en-GB': return inspectChange(englishToChange(input));
  case 'structured-en-GB': return translateSemantic({format:'wtl',input:englishToWtl(input,options).source},options);
  default:return translateDeclaration({format,input},options);
 }
}
