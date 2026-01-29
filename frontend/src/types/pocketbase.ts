/**
 * Base interface for PocketBase records
 */
export interface PBBaseRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

/**
 * PBUser interface for users collection
 */
export interface PBUser extends PBBaseRecord {
  username: string;
  email: string;
  name: string;
  avatar: string;
  global_role: 'USER' | 'GM' | 'ADMIN';
}

/**
 * TS-001: UserStats interface for users_stats collection
 * Stores character statistics, HP, gold, XP, and conditions
 */
export interface UserStats extends PBBaseRecord {
  user_id: string;
  hp: number;
  max_hp: number;
  stats_json: StatsJson;
  gold: number;
  xp: number;
  conditions: string[];
  factions: Record<string, number>;
  active_deity: string | null;
  piety_json: Record<string, number>;
}

/**
 * Stats JSON structure for ability scores
 */
export interface StatsJson {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

/**
 * TS-002: FogOfWar interface for fog_of_war collection
 * Tracks revealed hexes per user with 3D coordinates (q, r, z)
 */
export interface FogOfWar extends PBBaseRecord {
  user_id: string;
  q: number;
  r: number;
  z: number;
  timestamp: string;
}

/**
 * TS-003: WorldState interface for world_state collection
 * Defines map layers and dungeon clearing progress
 */
export interface WorldState extends PBBaseRecord {
  layer_id: string;
  map_url: string;
  cleared_dungeons_list: string[];
}

/**
 * TS-004: Decal interface for decals collection
 * Map decorations/markers placed at hex coordinates
 */
export interface Decal extends PBBaseRecord {
  site_name: string;
  q: number;
  r: number;
  z: number;
  image_url: string;
  is_visible: boolean;
}

export interface CampaignRecord extends PBBaseRecord {
  name: string;
  dmId: string;
  description?: string;
  active_map_id?: string;
  pending_nomination_player_id?: string;
}

export interface CampaignMembershipRecord extends PBBaseRecord {
  campaign: string;
  user: string;
  role: 'PLAYER' | 'GM';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  is_primary_dm: boolean;
  joined_at?: string;
  expand?: {
    campaign?: CampaignRecord;
    user?: PBUser;
  };
}

export interface CampaignNominationRecord extends PBBaseRecord {
  campaign: string;
  nominated_player: string;
  nominated_by: string;
  keep_access: boolean;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  expand?: {
    nominated_player?: PBUser;
    nominated_by?: PBUser;
  };
}

/**
 * Type helpers for PocketBase collection names
 */
export type PBCollectionName =
  | 'users'
  | 'users_stats'
  | 'fog_of_war'
  | 'world_state'
  | 'decals'
  | 'campaigns'
  | 'campaign_memberships'
  | 'campaign_nominations';

/**
 * Map collection names to their record types
 */
export interface PBCollectionTypes {
  users: PBUser;
  users_stats: UserStats;
  fog_of_war: FogOfWar;
  world_state: WorldState;
  decals: Decal;
  campaigns: CampaignRecord;
  campaign_memberships: CampaignMembershipRecord;
  campaign_nominations: CampaignNominationRecord;
}

/**
 * Create input types (without auto-generated fields)
 */
export type CreateUserStats = Omit<UserStats, keyof PBBaseRecord>;
export type CreateFogOfWar = Omit<FogOfWar, keyof PBBaseRecord>;
export type CreateWorldState = Omit<WorldState, keyof PBBaseRecord>;
export type CreateDecal = Omit<Decal, keyof PBBaseRecord>;

/**
 * Update input types (all fields optional)
 */
export type UpdateUserStats = Partial<CreateUserStats>;
export type UpdateFogOfWar = Partial<CreateFogOfWar>;
export type UpdateWorldState = Partial<CreateWorldState>;
export type UpdateDecal = Partial<CreateDecal>;
