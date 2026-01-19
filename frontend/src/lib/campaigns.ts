import api from './api';
import { Campaign } from '../types';

export const campaignApi = {
  // Get all campaigns for current user
  getUserCampaigns: async (): Promise<Campaign[]> => {
    const response = await api.get('/api/campaigns');
    return response.data;
  },

  // Get single campaign
  getCampaign: async (campaignId: string): Promise<Campaign> => {
    const response = await api.get(`/api/campaigns/${campaignId}`);
    return response.data;
  },

  // Create new campaign
  createCampaign: async (data: { name: string; description?: string }): Promise<Campaign> => {
    const response = await api.post('/api/campaigns', data);
    return response.data;
  },

  // Update campaign
  updateCampaign: async (
    campaignId: string,
    data: { name?: string; description?: string; activeMapId?: string }
  ): Promise<Campaign> => {
    const response = await api.put(`/api/campaigns/${campaignId}`, data);
    return response.data;
  },

  // Delete campaign
  deleteCampaign: async (campaignId: string): Promise<void> => {
    await api.delete(`/api/campaigns/${campaignId}`);
  },
};
