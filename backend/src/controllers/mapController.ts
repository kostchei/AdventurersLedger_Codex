import { Request, Response } from 'express';
import prisma from '../config/database';

// Create a new map for a campaign
export const createMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      campaignId,
      name,
      description,
      imageUrl,
      imageWidth,
      imageHeight,
      hexSize,
      hexColumns,
      hexRows,
      hexOrientation,
    } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!campaignId || !name || !imageUrl) {
      res.status(400).json({ error: 'Campaign ID, name, and image URL are required' });
      return;
    }

    // Verify user is DM of the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can create maps' });
      return;
    }

    const map = await prisma.map.create({
      data: {
        campaignId,
        name,
        description,
        imageUrl,
        imageWidth: imageWidth || 1000,
        imageHeight: imageHeight || 1000,
        hexSize: hexSize || 6,
        hexColumns: hexColumns || 20,
        hexRows: hexRows || 20,
        hexOrientation: hexOrientation || 'flat',
      },
    });

    res.status(201).json(map);
  } catch (error) {
    console.error('Error creating map:', error);
    res.status(500).json({ error: 'Failed to create map' });
  }
};

// Get all maps for a campaign
export const getCampaignMaps = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify user has access to the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          where: {
            playerId: req.user.id,
          },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const hasAccess = campaign.dmId === req.user.id || campaign.characters.length > 0;

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const maps = await prisma.map.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(maps);
  } catch (error) {
    console.error('Error fetching maps:', error);
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
};

// Get a single map by ID
export const getMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mapId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const map = await prisma.map.findUnique({
      where: { id: mapId },
      include: {
        campaign: {
          include: {
            characters: {
              where: {
                playerId: req.user.id,
              },
            },
          },
        },
      },
    });

    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    const hasAccess =
      map.campaign.dmId === req.user.id || map.campaign.characters.length > 0;

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(map);
  } catch (error) {
    console.error('Error fetching map:', error);
    res.status(500).json({ error: 'Failed to fetch map' });
  }
};

// Update a map
export const updateMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mapId } = req.params;
    const {
      name,
      description,
      imageUrl,
      imageWidth,
      imageHeight,
      hexSize,
      hexColumns,
      hexRows,
      hexOrientation,
      hexData,
    } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const map = await prisma.map.findUnique({
      where: { id: mapId },
      include: {
        campaign: true,
      },
    });

    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    if (map.campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can update maps' });
      return;
    }

    const updatedMap = await prisma.map.update({
      where: { id: mapId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl && { imageUrl }),
        ...(imageWidth && { imageWidth }),
        ...(imageHeight && { imageHeight }),
        ...(hexSize && { hexSize }),
        ...(hexColumns && { hexColumns }),
        ...(hexRows && { hexRows }),
        ...(hexOrientation && { hexOrientation }),
        ...(hexData && { hexData }),
      },
    });

    res.json(updatedMap);
  } catch (error) {
    console.error('Error updating map:', error);
    res.status(500).json({ error: 'Failed to update map' });
  }
};

// Delete a map
export const deleteMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mapId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const map = await prisma.map.findUnique({
      where: { id: mapId },
      include: {
        campaign: true,
      },
    });

    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    if (map.campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can delete maps' });
      return;
    }

    await prisma.map.delete({
      where: { id: mapId },
    });

    res.json({ message: 'Map deleted successfully' });
  } catch (error) {
    console.error('Error deleting map:', error);
    res.status(500).json({ error: 'Failed to delete map' });
  }
};

// Get revealed hexes for current player in a campaign
export const getPlayerRevealedHexes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const revealedHexes = await prisma.playerRevealedHex.findMany({
      where: {
        playerId: req.user.id,
        campaignId,
      },
      select: {
        hexX: true,
        hexY: true,
        revealedAt: true,
        session: {
          select: {
            sessionNumber: true,
            sessionDate: true,
          },
        },
      },
    });

    res.json(revealedHexes);
  } catch (error) {
    console.error('Error fetching revealed hexes:', error);
    res.status(500).json({ error: 'Failed to fetch revealed hexes' });
  }
};

// Get party position for a campaign
export const getPartyPosition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const position = await prisma.partyPosition.findUnique({
      where: {
        campaignId,
      },
    });

    if (!position) {
      res.status(404).json({ error: 'Party position not found' });
      return;
    }

    res.json(position);
  } catch (error) {
    console.error('Error fetching party position:', error);
    res.status(500).json({ error: 'Failed to fetch party position' });
  }
};
