import { Request, Response } from 'express';
import prisma from '../config/database';

// Create a new session
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId, sessionNumber, sessionDate, notes } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
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
      res.status(403).json({ error: 'Only the DM can create sessions' });
      return;
    }

    // Check if session number already exists
    const existingSession = await prisma.session.findUnique({
      where: {
        campaignId_sessionNumber: {
          campaignId,
          sessionNumber,
        },
      },
    });

    if (existingSession) {
      res.status(400).json({ error: 'Session number already exists for this campaign' });
      return;
    }

    const session = await prisma.session.create({
      data: {
        campaignId,
        sessionNumber,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        notes,
        isActive: false,
      },
      include: {
        attendances: {
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
      },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

// Get all sessions for a campaign
export const getCampaignSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    const sessions = await prisma.session.findMany({
      where: { campaignId },
      orderBy: { sessionNumber: 'desc' },
      include: {
        attendances: {
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
      },
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

// Get active session for a campaign
export const getActiveSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    const session = await prisma.session.findFirst({
      where: {
        campaignId,
        isActive: true,
      },
      include: {
        attendances: {
          where: {
            isOnline: true,
          },
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
      },
    });

    if (!session) {
      res.status(404).json({ error: 'No active session found' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching active session:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
};

// Start a session (set as active)
export const startSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can start sessions' });
      return;
    }

    // Deactivate any other active sessions for this campaign
    await prisma.session.updateMany({
      where: {
        campaignId: session.campaignId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Activate this session
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: true,
      },
      include: {
        attendances: {
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
      },
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

// End a session (set as inactive)
export const endSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.campaign.dmId !== req.user.id) {
      res.status(403).json({ error: 'Only the DM can end sessions' });
      return;
    }

    // Mark all attendances as offline
    await prisma.sessionAttendance.updateMany({
      where: {
        sessionId,
        isOnline: true,
      },
      data: {
        isOnline: false,
        disconnectedAt: new Date(),
      },
    });

    // Deactivate session
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
      },
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
};

// Add player to session attendance
export const addPlayerToSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { playerId } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Only DM can manually add players, or players can add themselves
    if (session.campaign.dmId !== req.user.id && playerId !== req.user.id) {
      res.status(403).json({ error: 'Not authorized to add this player' });
      return;
    }

    // Check if player is part of the campaign
    const character = await prisma.character.findFirst({
      where: {
        playerId,
        campaignId: session.campaignId,
      },
    });

    if (!character) {
      res.status(400).json({ error: 'Player is not part of this campaign' });
      return;
    }

    // Check if already attending
    const existingAttendance = await prisma.sessionAttendance.findUnique({
      where: {
        sessionId_playerId: {
          sessionId,
          playerId,
        },
      },
    });

    if (existingAttendance) {
      // Update to online if offline
      if (!existingAttendance.isOnline) {
        const updated = await prisma.sessionAttendance.update({
          where: { id: existingAttendance.id },
          data: {
            isOnline: true,
            disconnectedAt: null,
          },
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
        });
        res.json(updated);
        return;
      }

      res.json(existingAttendance);
      return;
    }

    // Create new attendance
    const attendance = await prisma.sessionAttendance.create({
      data: {
        sessionId,
        playerId,
        isOnline: true,
      },
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
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error adding player to session:', error);
    res.status(500).json({ error: 'Failed to add player to session' });
  }
};

// Remove player from session (mark as offline)
export const removePlayerFromSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, playerId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Only DM can remove players, or players can remove themselves
    if (session.campaign.dmId !== req.user.id && playerId !== req.user.id) {
      res.status(403).json({ error: 'Not authorized to remove this player' });
      return;
    }

    const attendance = await prisma.sessionAttendance.updateMany({
      where: {
        sessionId,
        playerId,
      },
      data: {
        isOnline: false,
        disconnectedAt: new Date(),
      },
    });

    res.json({ message: 'Player removed from session', attendance });
  } catch (error) {
    console.error('Error removing player from session:', error);
    res.status(500).json({ error: 'Failed to remove player from session' });
  }
};

// Get session details
export const getSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            dmId: true,
          },
        },
        attendances: {
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
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};
