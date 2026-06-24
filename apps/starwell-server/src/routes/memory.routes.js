import { Router } from 'express';
import { memoryController } from '../controllers/memory.controller.js';

export const memoryRouter = Router();

memoryRouter.get('/context', memoryController.getContext);
memoryRouter.get('/timeline', memoryController.getTimeline);
memoryRouter.post('/signals/stage', memoryController.stageSessionSignal);
memoryRouter.post('/signals/commit', memoryController.commitSessionSignal);

// Compatibility alias: old route stages only; it does not write.
memoryRouter.post('/log-signal', memoryController.stageSessionSignal);
