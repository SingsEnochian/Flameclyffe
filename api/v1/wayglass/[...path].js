import { createWayglassGatewayHandler } from '../../_shared/wayglass-gateway.mjs';
import { vercelEnv } from '../../_shared/vercel-env.mjs';

export default { fetch: createWayglassGatewayHandler({ env: vercelEnv }) };
