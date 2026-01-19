import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as mapController from '../controllers/mapController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Map CRUD
router.post('/', mapController.createMap);
router.get('/campaign/:campaignId', mapController.getCampaignMaps);
router.get('/:mapId', mapController.getMap);
router.put('/:mapId', mapController.updateMap);
router.delete('/:mapId', mapController.deleteMap);

// Hex data
router.get('/campaign/:campaignId/revealed-hexes', mapController.getPlayerRevealedHexes);
router.get('/campaign/:campaignId/party-position', mapController.getPartyPosition);

export default router;
