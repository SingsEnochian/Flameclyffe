import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';
import { createSupabaseCommonsLedgerStore } from '../../_shared/supabase-commons-store.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

let store;
const handle = (request) => {
  store ||= createSupabaseCommonsLedgerStore(env);
  return createHouseCommonsHandler({ env, store })(request);
};

export default { fetch: handle };
