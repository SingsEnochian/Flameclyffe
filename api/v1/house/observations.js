import { createHouseObservationRuntimeHandler } from '../../../netlify/functions/_shared/house-observation-runtime.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

const handle = createHouseObservationRuntimeHandler({ env });

export default {
  fetch(request) {
    return handle(request);
  },
};
