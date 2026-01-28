import { pb } from './pb';
import type { RecordModel } from 'pocketbase';
import type { Campaign, CampaignMember, CampaignNomination } from '../types';
import type {
  CampaignMembershipRecord,
  CampaignNominationRecord,
  CampaignRecord,
} from '../types/pocketbase';

const getCurrentUserId = (): string | undefined => {
  return pb.authStore.model?.id;
};

const determineRole = (
  campaign: CampaignRecord,
  membership?: CampaignMembershipRecord
): Campaign['role'] => {
  const userId = getCurrentUserId();
  if (!userId) return 'Viewer';
  if (campaign.dmId === userId) return 'DM';
  if (!membership) return 'Viewer';
  return membership.role === 'GM' ? 'GM' : 'Player';
};

const mapCampaignRecord = (
  record: CampaignRecord,
  membership?: CampaignMembershipRecord
): Campaign => {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? null,
    dmId: record.dmId,
    activeMapId: record.active_map_id ?? null,
    createdAt: record.created,
    updatedAt: record.updated,
    role: determineRole(record, membership),
    membershipId: membership?.id ?? null,
    membershipRole: membership?.role,
    membershipStatus: membership?.status,
    isPrimaryDM: membership?.is_primary_dm ?? false,
    pendingNominationPlayerId: record.pending_nomination_player_id ?? null,
  };
};

const mapMembershipRecord = (record: CampaignMembershipRecord & RecordModel): CampaignMember => {
  return {
    id: record.id,
    campaignId: record.campaign,
    userId: record.user,
    role: record.role,
    status: record.status,
    isPrimaryDM: record.is_primary_dm,
    joinedAt: record.joined_at ?? null,
    createdAt: record.created,
    updatedAt: record.updated,
    user: record.expand?.user
      ? {
        id: record.expand.user.id,
        name: record.expand.user.name ?? null,
        email: record.expand.user.email,
        avatarUrl: record.expand.user.avatar ?? null,
      }
      : undefined,
  };
};

const mapNominationRecord = (
  record: CampaignNominationRecord & RecordModel
): CampaignNomination => {
  return {
    id: record.id,
    campaignId: record.campaign,
    nominatedPlayerId: record.nominated_player,
    nominatedById: record.nominated_by,
    keepAccess: record.keep_access,
    message: record.message ?? null,
    status: record.status,
    createdAt: record.created,
    updatedAt: record.updated,
    nominatedPlayer: record.expand?.nominated_player
      ? {
        id: record.expand.nominated_player.id,
        name: record.expand.nominated_player.name ?? null,
        email: record.expand.nominated_player.email,
        avatarUrl: record.expand.nominated_player.avatar ?? null,
      }
      : undefined,
    nominatedBy: record.expand?.nominated_by
      ? {
        id: record.expand.nominated_by.id,
        name: record.expand.nominated_by.name ?? null,
        email: record.expand.nominated_by.email,
        avatarUrl: record.expand.nominated_by.avatar ?? null,
      }
      : undefined,
  };
};

const requireUser = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
};

export const campaignApi = {
  getUserCampaigns: async (): Promise<Campaign[]> => {
    const userId = requireUser();
    const memberships = await pb.collection('campaign_memberships').getFullList<
      CampaignMembershipRecord
    >({
      filter: `user = "${userId}" && status != "INACTIVE"`,
      sort: '-created',
      expand: 'campaign',
    });

    return memberships
      .map((membership) => {
        const campaign = membership.expand?.campaign as CampaignRecord | undefined;
        if (!campaign) return null;
        return mapCampaignRecord(campaign, membership);
      })
      .filter((campaign): campaign is Campaign => Boolean(campaign));
  },

  getAllCampaigns: async (): Promise<Campaign[]> => {
    const records = await pb.collection('campaigns').getFullList<CampaignRecord>({
      sort: '-updated',
    });

    return records.map((record) => mapCampaignRecord(record));
  },

  getCampaign: async (campaignId: string): Promise<Campaign> => {
    const record = await pb.collection('campaigns').getOne<CampaignRecord>(campaignId);
    return mapCampaignRecord(record);
  },

  createCampaign: async (data: { name: string; description?: string }): Promise<Campaign> => {
    const userId = requireUser();
    const record = await pb.collection('campaigns').create<CampaignRecord>({
      name: data.name,
      description: data.description,
      dmId: userId,
    });

    await pb.collection('campaign_memberships').create({
      campaign: record.id,
      user: userId,
      role: 'GM',
      status: 'ACTIVE',
      is_primary_dm: true,
    });

    return mapCampaignRecord(record);
  },

  updateCampaign: async (
    campaignId: string,
    data: { name?: string; description?: string; activeMapId?: string }
  ): Promise<Campaign> => {
    const payload: Record<string, unknown> = {};
    if (data.name) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.activeMapId !== undefined) payload.active_map_id = data.activeMapId;

    const record = await pb.collection('campaigns').update<CampaignRecord>(campaignId, payload);
    return mapCampaignRecord(record);
  },

  deleteCampaign: async (campaignId: string): Promise<void> => {
    await pb.collection('campaigns').delete(campaignId);
  },

  joinCampaign: async (campaignId: string): Promise<void> => {
    const userId = requireUser();
    const existing = await pb.collection('campaign_memberships').getList<CampaignMembershipRecord>(
      1,
      1,
      {
        filter: `campaign = "${campaignId}" && user = "${userId}"`,
      }
    );

    if (existing.items.length) {
      await pb
        .collection('campaign_memberships')
        .update(existing.items[0].id, { status: 'ACTIVE', role: 'PLAYER', is_primary_dm: false });
      return;
    }

    await pb.collection('campaign_memberships').create({
      campaign: campaignId,
      user: userId,
      role: 'PLAYER',
      status: 'ACTIVE',
      is_primary_dm: false,
    });
  },

  getCampaignMembers: async (campaignId: string): Promise<CampaignMember[]> => {
    const records = await pb.collection('campaign_memberships').getFullList<
      CampaignMembershipRecord
    >({
      filter: `campaign = "${campaignId}"`,
      sort: '-created',
      expand: 'user',
    });
    return records.map((record) =>
      mapMembershipRecord(record as CampaignMembershipRecord & RecordModel)
    );
  },

  getCampaignNominations: async (campaignId: string): Promise<CampaignNomination[]> => {
    const records = await pb.collection('campaign_nominations').getFullList<
      CampaignNominationRecord
    >({
      filter: `campaign = "${campaignId}"`,
      sort: '-created',
      expand: 'nominated_player,nominated_by',
    });

    return records.map((record) =>
      mapNominationRecord(record as CampaignNominationRecord & RecordModel)
    );
  },

  createNomination: async (params: {
    campaignId: string;
    playerId: string;
    keepAccess: boolean;
    message?: string;
  }): Promise<CampaignNomination> => {
    const userId = requireUser();
    const nomination = await pb.collection('campaign_nominations').create({
      campaign: params.campaignId,
      nominated_player: params.playerId,
      nominated_by: userId,
      keep_access: params.keepAccess,
      message: params.message,
      status: 'PENDING',
    });

    await pb.collection('campaigns').update(params.campaignId, {
      pending_nomination_player_id: params.playerId,
    });

    return mapNominationRecord(nomination as CampaignNominationRecord & RecordModel);
  },

  acceptNomination: async (campaignId: string, nominationId: string): Promise<void> => {
    const userId = requireUser();
    const nomination = await pb
      .collection('campaign_nominations')
      .getOne<CampaignNominationRecord>(nominationId);

    if (nomination.campaign !== campaignId) {
      throw new Error('Nomination does not belong to this campaign');
    }

    if (nomination.status !== 'PENDING') {
      throw new Error('Nomination is no longer pending');
    }

    if (nomination.nominated_player !== userId) {
      throw new Error('Only the nominated player can accept');
    }

    await pb.collection('campaigns').update(campaignId, {
      dmId: userId,
      pending_nomination_player_id: '',
    });

    const nomineeMembership = await pb
      .collection('campaign_memberships')
      .getList<CampaignMembershipRecord>(1, 1, {
        filter: `campaign = "${campaignId}" && user = "${userId}"`,
      });

    if (nomineeMembership.items.length) {
      await pb.collection('campaign_memberships').update(nomineeMembership.items[0].id, {
        role: 'GM',
        status: 'ACTIVE',
        is_primary_dm: true,
      });
    } else {
      await pb.collection('campaign_memberships').create({
        campaign: campaignId,
        user: userId,
        role: 'GM',
        status: 'ACTIVE',
        is_primary_dm: true,
      });
    }

    const previousDmId = nomination.nominated_by;
    const previousMembership = await pb
      .collection('campaign_memberships')
      .getList<CampaignMembershipRecord>(1, 1, {
        filter: `campaign = "${campaignId}" && user = "${previousDmId}"`,
      });

    const fallbackRole = nomination.keep_access ? 'GM' : 'PLAYER';

    if (previousMembership.items.length) {
      await pb.collection('campaign_memberships').update(previousMembership.items[0].id, {
        role: fallbackRole,
        status: 'ACTIVE',
        is_primary_dm: false,
      });
    } else {
      await pb.collection('campaign_memberships').create({
        campaign: campaignId,
        user: previousDmId,
        role: fallbackRole,
        status: 'ACTIVE',
        is_primary_dm: false,
      });
    }

    await pb.collection('campaign_nominations').update(nominationId, {
      status: 'ACCEPTED',
    });
  },

  declineNomination: async (campaignId: string, nominationId: string): Promise<void> => {
    const userId = requireUser();
    const nomination = await pb
      .collection('campaign_nominations')
      .getOne<CampaignNominationRecord>(nominationId);

    if (nomination.campaign !== campaignId) {
      throw new Error('Nomination does not belong to this campaign');
    }

    if (nomination.nominated_player !== userId) {
      throw new Error('Only the nominated player can decline');
    }

    await pb.collection('campaigns').update(campaignId, {
      pending_nomination_player_id: '',
    });

    await pb.collection('campaign_nominations').update(nominationId, {
      status: 'DECLINED',
    });
  },

  getMaps: async (campaignId: string): Promise<RecordModel[]> => {
    return pb.collection('world_state').getFullList({
      filter: `campaign = "${campaignId}"`,
      sort: 'z_index',
    });
  },

  uploadMapLayer: async (campaignId: string, formData: FormData): Promise<RecordModel> => {
    // formData should contain map_file, z_index, hex_columns, hex_rows, etc.
    formData.append('campaign', campaignId);
    return pb.collection('world_state').create(formData);
  },
};
