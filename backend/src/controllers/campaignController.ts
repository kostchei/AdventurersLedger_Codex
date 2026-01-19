import { Request, Response } from 'express';
import prisma from '../config/database';

// Create a new campaign
export const createCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Campaign name is required' });
      return;
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        dmId: req.user.id,
      },
      include: {
        dm: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        characters: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        maps: true,
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

// Get all campaigns for the current user (as DM or player)
export const getUserCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get campaigns where user is DM
    const dmCampaigns = await prisma.campaign.findMany({
      where: { dmId: req.user.id },
      include: {
        dm: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        characters: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        sessions: {
          orderBy: {
            sessionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    // Get campaigns where user has a character
    const playerCampaigns = await prisma.campaign.findMany({
      where: {
        characters: {
          some: {
            playerId: req.user.id,
          },
        },
      },
      include: {
        dm: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        characters: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        sessions: {
          orderBy: {
            sessionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    // Combine and deduplicate
    const campaignMap = new Map();
    [...dmCampaigns, ...playerCampaigns].forEach((campaign) => {
      if (!campaignMap.has(campaign.id)) {
        campaignMap.set(campaign.id, {
          ...campaign,
          role: campaign.dmId === req.user!.id ? 'DM' : 'Player',
        });
      }
    });

    const campaigns = Array.from(campaignMap.values());
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};

// Get a single campaign by ID
export const getCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        dm: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        characters: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        maps: true,
        sessions: {
          orderBy: {
            sessionNumber: 'desc',
          },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Check if user has access (is DM or has a character in the campaign)
    const hasAccess =
      campaign.dmId === req.user.id ||
      campaign.characters.some((char) => char.playerId === req.user!.id);

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      ...campaign,
      role: campaign.dmId === req.user.id ? 'DM' : 'Player',
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
};

// Update a campaign
export const updateCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { name, description, activeMapId } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can update the campaign' });
      return;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(activeMapId !== undefined && { activeMapId }),
      },
      include: {
        dm: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        characters: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        maps: true,
      },
    });

    res.json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};

// Delete a campaign
export const deleteCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can delete the campaign' });
      return;
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
};

// Get players who can be invited (all users except those already in campaign)
export const getInvitablePlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          select: {
            playerId: true,
          },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can view invitable players' });
      return;
    }

    const existingPlayerIds = campaign.characters.map((char) => char.playerId);

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: campaign.dmId } },
          { id: { notIn: existingPlayerIds } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching invitable players:', error);
    res.status(500).json({ error: 'Failed to fetch invitable players' });
  }
};
