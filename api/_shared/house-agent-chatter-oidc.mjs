import {
  GITHUB_OIDC_ISSUER,
  verifyGitHubActionsOidc,
} from './github-actions-oidc.mjs';

export { GITHUB_OIDC_ISSUER };

export const HOUSE_AGENT_CHATTER_AUDIENCE = 'flameclyffe-house-agent-chatter/v1';
export const HOUSE_AGENT_CHATTER_REPOSITORY = 'SingsEnochian/Flameclyffe';
export const HOUSE_AGENT_CHATTER_WORKFLOW_REF = 'SingsEnochian/Flameclyffe/.github/workflows/house-agent-chatter.yml@refs/heads/main';
export const HOUSE_AGENT_CHATTER_EVENTS = Object.freeze(['schedule', 'workflow_dispatch', 'push']);

export function verifyHouseAgentChatterOidc(token, options = {}) {
  return verifyGitHubActionsOidc(token, {
    ...options,
    audience: HOUSE_AGENT_CHATTER_AUDIENCE,
    repository: HOUSE_AGENT_CHATTER_REPOSITORY,
    workflowRef: HOUSE_AGENT_CHATTER_WORKFLOW_REF,
    eventNames: HOUSE_AGENT_CHATTER_EVENTS,
  });
}
