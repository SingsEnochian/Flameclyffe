import { publicWayglassRoutes } from '../../../lib/wayglass-route-registry.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required.' });
  return res.status(200).json({
    schema: 'wayglass.route-catalogue/v0.1',
    routes: publicWayglassRoutes(),
  });
}
