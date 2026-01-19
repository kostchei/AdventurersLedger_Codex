import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import prisma from './database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  campaignId?: string;
  sessionId?: string;
}

export const initializeSocket = (httpServer: HTTPServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.userId;

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join a campaign/session room
    socket.on('join:session', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;

        // Verify session exists and user has access
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: {
            campaign: true,
            attendances: {
              where: {
                playerId: socket.userId,
              },
            },
          },
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Check if user is DM or has a character in the campaign
        const isDM = session.campaign.dmId === socket.userId;
        const hasCharacter = await prisma.character.findFirst({
          where: {
            playerId: socket.userId,
            campaignId: session.campaignId,
          },
        });

        if (!isDM && !hasCharacter) {
          socket.emit('error', { message: 'Not authorized to join this session' });
          return;
        }

        // Join the room
        socket.join(`session:${sessionId}`);
        socket.sessionId = sessionId;
        socket.campaignId = session.campaignId;

        // Update or create attendance record
        if (!isDM) {
          await prisma.sessionAttendance.upsert({
            where: {
              sessionId_playerId: {
                sessionId,
                playerId: socket.userId!,
              },
            },
            update: {
              isOnline: true,
              disconnectedAt: null,
            },
            create: {
              sessionId,
              playerId: socket.userId!,
              isOnline: true,
            },
          });
        }

        // Notify others in the session
        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        });

        socket.to(`session:${sessionId}`).emit('player:joined', {
          player: user,
          sessionId,
        });

        // Send current session state to the joining player
        const attendances = await prisma.sessionAttendance.findMany({
          where: {
            sessionId,
            isOnline: true,
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        });

        socket.emit('session:state', {
          sessionId,
          attendances,
        });

        console.log(`User ${socket.userId} joined session ${sessionId}`);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Leave a session
    socket.on('leave:session', async () => {
      try {
        if (!socket.sessionId) return;

        const sessionId = socket.sessionId;

        // Update attendance to offline
        await prisma.sessionAttendance.updateMany({
          where: {
            sessionId,
            playerId: socket.userId,
          },
          data: {
            isOnline: false,
            disconnectedAt: new Date(),
          },
        });

        // Notify others
        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
          select: {
            id: true,
            name: true,
          },
        });

        socket.to(`session:${sessionId}`).emit('player:left', {
          player: user,
          sessionId,
        });

        socket.leave(`session:${sessionId}`);
        socket.sessionId = undefined;
        socket.campaignId = undefined;

        console.log(`User ${socket.userId} left session ${sessionId}`);
      } catch (error) {
        console.error('Error leaving session:', error);
      }
    });

    // Party movement and hex revelation (DM only)
    socket.on('party:move', async (data: { hexX: number; hexY: number }) => {
      try {
        if (!socket.sessionId || !socket.campaignId) {
          socket.emit('error', { message: 'Not in an active session' });
          return;
        }

        const session = await prisma.session.findUnique({
          where: { id: socket.sessionId },
          include: {
            campaign: true,
          },
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Verify user is DM
        if (session.campaign.dmId !== socket.userId) {
          socket.emit('error', { message: 'Only DM can move the party' });
          return;
        }

        const { hexX, hexY } = data;

        // Update party position
        await prisma.partyPosition.upsert({
          where: {
            campaignId: socket.campaignId,
          },
          update: {
            hexX,
            hexY,
          },
          create: {
            campaignId: socket.campaignId,
            mapId: session.campaign.activeMapId || 'default',
            hexX,
            hexY,
          },
        });

        // Calculate visible hexes (TODO: implement terrain-based visibility)
        const visibleHexes = calculateVisibleHexes(hexX, hexY, 1); // Default 1 hex range

        // Get all online players in this session
        const attendances = await prisma.sessionAttendance.findMany({
          where: {
            sessionId: socket.sessionId,
            isOnline: true,
          },
        });

        // Reveal hexes for each attending player
        for (const attendance of attendances) {
          for (const hex of visibleHexes) {
            await prisma.playerRevealedHex.upsert({
              where: {
                playerId_campaignId_hexX_hexY: {
                  playerId: attendance.playerId,
                  campaignId: socket.campaignId,
                  hexX: hex.x,
                  hexY: hex.y,
                },
              },
              update: {},
              create: {
                playerId: attendance.playerId,
                campaignId: socket.campaignId,
                sessionId: socket.sessionId,
                hexX: hex.x,
                hexY: hex.y,
              },
            });
          }
        }

        // Broadcast hex reveals to all players in session
        io.to(`session:${socket.sessionId}`).emit('hexes:revealed', {
          position: { x: hexX, y: hexY },
          visibleHexes,
        });

        console.log(`Party moved to (${hexX}, ${hexY}) in session ${socket.sessionId}`);
      } catch (error) {
        console.error('Error moving party:', error);
        socket.emit('error', { message: 'Failed to move party' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        if (socket.sessionId && socket.userId) {
          await prisma.sessionAttendance.updateMany({
            where: {
              sessionId: socket.sessionId,
              playerId: socket.userId,
            },
            data: {
              isOnline: false,
              disconnectedAt: new Date(),
            },
          });

          const user = await prisma.user.findUnique({
            where: { id: socket.userId },
            select: {
              id: true,
              name: true,
            },
          });

          socket.to(`session:${socket.sessionId}`).emit('player:left', {
            player: user,
            sessionId: socket.sessionId,
          });
        }

        console.log(`User disconnected: ${socket.userId}`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  return io;
};

// Helper function to calculate visible hexes
// This is a simple implementation - can be enhanced with terrain visibility rules
function calculateVisibleHexes(centerX: number, centerY: number, range: number): Array<{ x: number; y: number }> {
  const hexes: Array<{ x: number; y: number }> = [];

  // Add center hex
  hexes.push({ x: centerX, y: centerY });

  // Add surrounding hexes based on range
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;

      // Simple cube distance check for hex grid
      const dz = -dx - dy;
      if (Math.abs(dx) <= range && Math.abs(dy) <= range && Math.abs(dz) <= range) {
        hexes.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  }

  return hexes;
}

export default initializeSocket;
