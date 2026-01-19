import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Join a session
  joinSession(sessionId: string) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('join:session', { sessionId });
  }

  // Leave a session
  leaveSession() {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('leave:session');
  }

  // Move party (DM only)
  moveParty(hexX: number, hexY: number) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('party:move', { hexX, hexY });
  }

  // Listen for hex reveals
  onHexesRevealed(callback: (data: any) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('hexes:revealed', callback);
  }

  // Listen for session state
  onSessionState(callback: (data: any) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('session:state', callback);
  }

  // Listen for player joined
  onPlayerJoined(callback: (data: any) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('player:joined', callback);
  }

  // Listen for player left
  onPlayerLeft(callback: (data: any) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('player:left', callback);
  }

  // Remove all listeners
  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }
}

export const socketService = new SocketService();
