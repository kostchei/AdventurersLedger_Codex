import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as sessionController from '../controllers/sessionController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Session management
router.post('/', sessionController.createSession);
router.get('/campaign/:campaignId', sessionController.getCampaignSessions);
router.get('/campaign/:campaignId/active', sessionController.getActiveSession);
router.get('/:sessionId', sessionController.getSession);
router.post('/:sessionId/start', sessionController.startSession);
router.post('/:sessionId/end', sessionController.endSession);

// Session attendance
router.post('/:sessionId/attendance', sessionController.addPlayerToSession);
router.delete('/:sessionId/attendance/:playerId', sessionController.removePlayerFromSession);

export default router;
