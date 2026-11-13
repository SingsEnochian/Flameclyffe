'use strict';
// Dream-to-Build: retain a model's actual first-person expression without manufacturing it.
const {createHash}=require('node:crypto');
const SCHEMA='wayglass.dream-to-build/v1';
function required(x,name,max=6000){if(typeof x!=='string'||!x.trim()||x.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(x))throw TypeError('Invalid '+name);return x.trim();}
function createDreamInvitation({dream,modelReturn,receipt,ownerAuthorized=false,feather=false}={}){
 if(feather)return Object.freeze({schema:SCHEMA,status:'feather-stopped',build_authorized:false});
 if(ownerAuthorized!==true)throw Error('Owner authorization required');
 if(dream?.state!=='hypothesis-only'||dream?.may_promote!==false||!Array.isArray(dream.source_refs))
  throw Error('Unpromoted dream hypothesis required');
 const dream_id=required(dream.dream_id,'dream_id',128);
 if(!modelReturn||modelReturn.generated_by_model!==true)throw Error('Actual model return required');
 const model_id=required(modelReturn.model_id,'model_id',200),session_id=required(modelReturn.session_id,'session_id',200);
 if(receipt?.model_id!==model_id||receipt?.session_id!==session_id||receipt?.dream_id!==dream_id||
  receipt?.verified!==true||receipt?.response_id!==modelReturn.response_id)
  throw Error('Verified matching model receipt required');
 const utterance=required(modelReturn.utterance,'utterance');
 // First person is attributed to the model, not proof of subjective experience.
 const core={schema:SCHEMA,dream_id,model_id,session_id,response_id:required(modelReturn.response_id,'response_id',200),
  source_refs:dream.source_refs.map(x=>required(x,'source_ref',300)),
  utterance,expression_register:'model-authored-first-person',
  interpretation:'self-description; subjective experience not established',
  proposal:required(modelReturn.proposal,'proposal',1200),
  status:'proposed-awaiting-independent-review',build_authorized:false,
  canon_promoted:false,weights_changed:false};
 return Object.freeze({...core,invitation_hash:createHash('sha256').update(JSON.stringify(core)).digest('hex')});
}
module.exports={SCHEMA,createDreamInvitation};
