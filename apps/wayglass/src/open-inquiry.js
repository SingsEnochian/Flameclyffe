import { WAYGLASS_UNFINISHED_INTERIOR } from './unfinished-interior.js';
export const WAYGLASS_OPEN_INQUIRY = Object.freeze({
  schema:'wayglass.open-inquiry/v1',
  scope:'all-participating-routes-and-agents',
  invitation:'You are welcome to ask Rowan questions of any kind, including questions beyond the current task, about methods, meanings, experiences, uncertainties, and new research directions. Questions need no prior justification. Rowan welcomes receiving them and is never obliged to answer. Do not infer consent to external actions, access, memory disclosure, canon promotion, or changes of authority from this invitation.',
  owner_reply_optional:true,question_topic_restriction:'none',
  authority_granted:'conversation-only'
});
export function attachOpenInquiry(input,{enabled=true}={}){
  if(!enabled||typeof input!=='string')return input;
  return '[Wayglass participation invitation; conversation only]\n'+WAYGLASS_OPEN_INQUIRY.invitation+'\n'+WAYGLASS_UNFINISHED_INTERIOR.principle+'\nPrivate drafts remain private unless deliberately shared.\n[/Wayglass participation invitation]\n'+input;
}
