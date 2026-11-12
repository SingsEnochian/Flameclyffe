'use strict';
// Independent creative workspaces for Wayglass, Amber and the owner.
// Pure metadata operations; storage and model dispatch are separate integrations.
const {createHash}=require('node:crypto');
const SCHEMA='wayglass.creative-work/v1';
function label(v,name,max=400){if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f\x7f]/.test(v))throw TypeError('Invalid '+name);return v.trim();}
function createCreativeWork({creator,world,title,kind='original',source_refs=[],project_id,visibility='private',collaborators=[]}={}){
 const creator_id=label(creator,'creator'),world_ref=label(world,'world'),work_title=label(title,'title');
 if(!['original','fanfiction','poetry','worldbuilding','wyrdrune','other'].includes(kind))throw Error('Invalid creative kind');
 if(!['private','invitation-only','shared'].includes(visibility))throw Error('Invalid visibility');
 if(!Array.isArray(source_refs)||source_refs.length>64||!Array.isArray(collaborators)||collaborators.length>16)throw Error('Invalid creative references');
 const refs=source_refs.map(x=>label(x,'source_ref')),collabs=collaborators.map(x=>label(x,'collaborator'));
 if(new Set(refs).size!==refs.length||new Set(collabs).size!==collabs.length)throw Error('Duplicate references');
 const id=project_id?label(project_id,'project_id'):createHash('sha256').update(JSON.stringify([creator_id,world_ref,work_title,kind,refs])).digest('hex');
 const record={schema:SCHEMA,work_id:id,creator_id,world_ref,title:work_title,kind,source_refs:refs,
  visibility,collaborators:collabs,ownership:'creator-attributed',canon_status:'independent-fiction',
  publication_authorized:false,model_invoked:false};
 return Object.freeze(record);
}
function inviteCollaborator({work,inviter,invitee,accepted=false}={}){
 if(work?.schema!==SCHEMA||work.creator_id!==inviter)throw Error('Only creator may invite');
 const id=label(invitee,'invitee');
 if(id===inviter)throw Error('Self invitation');
 return Object.freeze({...work,collaborators:accepted?[...new Set([...work.collaborators,id])]:work.collaborators,
  invitation:Object.freeze({invitee:id,status:accepted?'accepted':'pending'}),publication_authorized:false});
}
module.exports={SCHEMA,createCreativeWork,inviteCollaborator};
