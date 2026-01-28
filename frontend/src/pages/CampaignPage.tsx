import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../lib/campaigns';
import { pb } from '../lib/pb';
import HexMapViewer from '../components/HexMapViewer';
import { useFogOfWar } from '../hooks/useFogOfWar';
import { useAuthStore } from '../store/authStore';
import WorldState from '../components/WorldState';
import type { HexCoord } from '../utils/hexGrid';
import type { CampaignMember, CampaignNomination, MapLayer } from '../types';
import MapUploadModal from '../components/MapUploadModal';



export default function CampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [currentZ, setCurrentZ] = useState(0);
  const { revealedHexes, revealHex } = useFogOfWar(currentZ);
  const [partyPosition, setPartyPosition] = useState<{ hexX: number; hexY: number; z: number } | null>(null);
  const [isMapUploadModalOpen, setIsMapUploadModalOpen] = useState(false);
  const queryClient = useQueryClient();

  /* Removed nominationMutation since it was unused */

  const acceptMutation = useMutation({
    mutationFn: (nominationId: string) => campaignApi.acceptNomination(campaignId!, nominationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId, 'nominations'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (nominationId: string) => campaignApi.declineNomination(campaignId!, nominationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId, 'nominations'] });
    },
  });

  /* Removed handleNominationSubmit since it was unused */

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignApi.getCampaign(campaignId!),
    enabled: !!campaignId,
  });

  useQuery<CampaignMember[]>({
    queryKey: ['campaign', campaignId, 'members'],
    queryFn: () => campaignApi.getCampaignMembers(campaignId!),
    enabled: !!campaignId,
  });

  const { data: nominations } = useQuery<CampaignNomination[]>({
    queryKey: ['campaign', campaignId, 'nominations'],
    queryFn: () => campaignApi.getCampaignNominations(campaignId!),
    enabled: !!campaignId,
  });

  // Fetch maps/layers from PocketBase (world_state)
  const { data: maps, refetch: refetchMaps } = useQuery<MapLayer[]>({
    queryKey: ['maps', campaignId],
    queryFn: async () => {
      const records = await pb.collection('world_state').getFullList({
        filter: `campaign = "${campaignId}"`,
        sort: 'z_index',
      });
      return records.map(r => ({
        id: r.id,
        imageUrl: r.map_file ? pb.files.getUrl(r, r.map_file) : r.map_url,
        hexColumns: r.hex_columns || 50,
        hexRows: r.hex_rows || 50,
        imageWidth: r.image_width || 2000,
        imageHeight: r.image_height || 2000,
        hexOrientation: 'flat',
        z: r.z_index,
        createdAt: r.created,
        updatedAt: r.updated,
      }));
    },
    enabled: !!campaignId,
  });

  const isDM = user?.id === campaign?.dmId;

  // Subscribe to Party Position
  useEffect(() => {
    if (!campaignId) return;

    pb.collection('decals').subscribe('*', (e) => {
      if (e.action === 'update' && e.record.site_name === 'party') {
        setPartyPosition({
          hexX: e.record.q,
          hexY: e.record.r,
          z: e.record.z,
        });
      }
    });

    return () => {
      pb.collection('decals').unsubscribe('*');
    };
  }, [campaignId]);

  const handleHexClick = async (hex: HexCoord & { z: number }) => {
    if (!isDM) return;

    try {
      const partyDecal = await pb.collection('decals').getFirstListItem('site_name="party"');
      await pb.collection('decals').update(partyDecal.id, {
        q: hex.q,
        r: hex.r,
        z: hex.z,
      });

      await revealHex(hex.q, hex.r, hex.z);
    } catch (err: unknown) {
      console.error('Failed to move party:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Campaign not found</p>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-primary-600 text-white rounded">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/campaign/${campaignId}/join`;
    navigator.clipboard.writeText(link);
    alert('Invitation link copied to chronicle clipboard!');
  };

  const activeMap = maps?.find((m: MapLayer) => m.z === currentZ) || maps?.[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="h-14 bg-slate-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] line-clamp-1">{campaign?.name}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Chronicle Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/campaign/${campaignId}/stats`)}
            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/30 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Character Profile
          </button>
          <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
            {maps?.map((map: MapLayer) => (
              <button
                key={map.id}
                onClick={() => setCurrentZ(map.z)}
                className={`px-3 py-1 rounded text-[10px] font-black transition-all ${currentZ === map.z ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                LEVEL {map.z}
              </button>
            ))}
          </div>
          {isDM && (
            <button
              onClick={() => setIsMapUploadModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/10 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Upload
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Viewer */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {activeMap ? (
            <HexMapViewer
              map={activeMap}
              currentZ={currentZ}
              revealedHexes={revealedHexes}
              partyPosition={partyPosition || undefined}
              isDM={isDM}
              onHexClick={handleHexClick}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-sm px-6">
                <div className="text-4xl mb-4 opacity-20">🗺️</div>
                <h2 className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs mb-2">Unmapped Territory</h2>
                <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest leading-loose">
                  This portion of the realm has not yet been chronicled in the ledger.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-84 bg-slate-900 border-l border-white/5 flex flex-col shadow-2xl z-10">
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">World Log</h3>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
            <section>
              <WorldState />
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Nominations</h3>
                {isDM && (
                  <button
                    onClick={handleCopyInviteLink}
                    className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30 transition-all font-black uppercase tracking-tighter"
                  >
                    Copy Link
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {nominations?.length ? (
                  nominations.map((nomination) => {
                    const isCurrentNominee = nomination.nominatedPlayerId === user?.id;
                    const canAct = isCurrentNominee && nomination.status === 'PENDING';
                    return (
                      <div
                        key={nomination.id}
                        className="bg-slate-800/40 border border-white/5 rounded-xl p-3 shadow-inner"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-white">
                              {nomination.nominatedPlayer?.name || nomination.nominatedPlayerId}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                              By {nomination.nominatedBy?.name || nomination.nominatedById}
                            </p>
                          </div>
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${nomination.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-white/5'
                              }`}
                          >
                            {nomination.status}
                          </span>
                        </div>
                        {canAct && (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => acceptMutation.mutate(nomination.id)}
                              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/30 transition-all flex-1"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => declineMutation.mutate(nomination.id)}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-black uppercase rounded-lg border border-red-500/30 transition-all flex-1"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-slate-600 italic text-center py-4 bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
                    No active nominations.
                  </p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {/* Map Upload Modal */}
      {isMapUploadModalOpen && (
        <MapUploadModal
          campaignId={campaignId!}
          onClose={() => setIsMapUploadModalOpen(false)}
          onUploadSuccess={() => refetchMaps()}
        />
      )}
    </div>
  );
}
