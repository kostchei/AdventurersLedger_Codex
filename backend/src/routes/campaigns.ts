import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as campaignController from '../controllers/campaignController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Campaign CRUD
router.post('/', campaignController.createCampaign);
router.get('/', campaignController.getUserCampaigns);
router.get('/:campaignId', campaignController.getCampaign);
router.put('/:campaignId', campaignController.updateCampaign);
router.delete('/:campaignId', campaignController.deleteCampaign);

// Invitations
router.get('/:campaignId/invitable-players', campaignController.getInvitablePlayers);

export default router;
