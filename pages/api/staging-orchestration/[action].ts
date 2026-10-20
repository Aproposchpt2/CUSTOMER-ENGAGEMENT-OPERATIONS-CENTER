import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../utils/supabase/server';

const { createNodeGatewayHandler } = require('../../../twilio-bridge/tests/staging-runner/staging-gateway-node-adapter.cjs');

// Stream raw body to the bounded gateway reader; never add credentials to client props.
export const config = { api: { bodyParser: false } };

const handler = createNodeGatewayHandler({
  env: process.env,
  getCookieAccessToken: async (req: NextApiRequest, res: NextApiResponse) => {
    const client = createClient(req, res);
    const { data, error } = await client.auth.getSession();
    // getSession does not authorize the request: remote getUser and RLS membership in the gateway do.
    return error ? null : data.session?.access_token ?? null;
  },
});

export default handler;
