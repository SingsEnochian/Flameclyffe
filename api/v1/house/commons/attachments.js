import { createHouseCommonsAttachmentHandler } from '../../../../netlify/functions/_shared/house-commons-attachments-runtime.mjs';
import { createSupabaseCommonsAttachmentStore } from '../../../_shared/supabase-commons-store.mjs';
import { vercelEnv as env } from '../../../_shared/vercel-env.mjs';

let store;
const handle = (request) => {
  store ||= createSupabaseCommonsAttachmentStore(env);
  return createHouseCommonsAttachmentHandler({ env, store })(request);
};

export default { fetch: handle };
