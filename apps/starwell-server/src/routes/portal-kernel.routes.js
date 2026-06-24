import { Router } from 'express';
import { generateRoomFromSeed } from '../utils/seed-generator.js';

export const portalKernelRouter = Router();

const schemaVersion = '0.1.0';
let activeChamberWorkspace = null;

portalKernelRouter.get('/active-room', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (!activeChamberWorkspace) {
    return res.status(200).json({
      ok: true,
      schemaVersion,
      source: 'starwell-server/portal-kernel/active-room',
      chamberActive: false,
      message: 'No seed card loaded into the workspace.',
    });
  }

  return res.status(200).json({
    ok: true,
    schemaVersion,
    source: 'starwell-server/portal-kernel/active-room',
    chamberActive: true,
    data: activeChamberWorkspace,
  });
});

portalKernelRouter.post('/load-seed', (req, res) => {
  const { seedToken } = req.body;

  try {
    const calculatedChamber = generateRoomFromSeed(seedToken);
    activeChamberWorkspace = calculatedChamber;

    console.log(`[🌲 PORTAL KERNEL]: Loaded room seed layout at ${calculatedChamber.derivedCoordinates}`);

    return res.status(200).json({
      ok: true,
      schemaVersion,
      source: 'starwell-server/portal-kernel/load-seed',
      message: 'Chamber workspace initialised. Audio metadata is user-initiated only.',
      actionRequired: 'Preview room seed card before wiring audio driver hooks.',
      roomCard: calculatedChamber,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      schemaVersion,
      source: 'starwell-server/portal-kernel/load-seed',
      error: error.message,
    });
  }
});
