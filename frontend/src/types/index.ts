export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  dmId: string;
  activeMapId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  playerId: string;
  campaignId: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  maxHp: number;
  currentHp: number;
  armorClass: number;
  proficiencyBonus: number;
  skills: any;
  equipment: any;
  spells: any;
  features: any;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  campaignId: string;
  sessionNumber: number;
  sessionDate: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  attendances?: SessionAttendance[];
  campaign?: {
    id: string;
    name: string;
    dmId: string;
  };
}

export interface SessionAttendance {
  id: string;
  sessionId: string;
  playerId: string;
  connectedAt: string;
  isOnline: boolean;
  disconnectedAt: string | null;
  player: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface HexCoordinate {
  x: number;
  y: number;
}

export interface PlayerRevealedHex {
  id: string;
  playerId: string;
  campaignId: string;
  sessionId: string;
  hexX: number;
  hexY: number;
  revealedAt: string;
}

export interface Map {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hexSize: number;
  hexColumns: number;
  hexRows: number;
  hexOrientation: string;
  hexData: Record<string, { terrain: string; elevation?: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface PartyPosition {
  id: string;
  campaignId: string;
  mapId: string;
  hexX: number;
  hexY: number;
  updatedAt: string;
}
