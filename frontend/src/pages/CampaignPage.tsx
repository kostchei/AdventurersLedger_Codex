import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignApi } from '../lib/campaigns';
import api from '../lib/api';
import HexMapViewer from '../components/HexMapViewer';
import { socketService } from '../lib/socket';
import { HexCoord } from '../utils/hexGrid';
import { useAuthStore } from '../store/authStore';

export default function CampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [revealedHexes, setRevealedHexes] = useState<Set<string>>(new Set());
  const [partyPosition, setPartyPosition] = useState<{ hexX: number; hexY: number } | null>(null);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignApi.getCampaign(campaignId!),
    enabled: !!campaignId,
  });

  const { data: maps } = useQuery({
    queryKey: ['maps', campaignId],
    queryFn: async () => {
      const response = await api.get(`/api/maps/campaign/${campaignId}`);
      return response.data;
    },
    enabled: !!campaignId,
  });

  const { data: playerHexes } = useQuery({
    queryKey: ['revealed-hexes', campaignId],
    queryFn: async () => {
      const response = await api.get(`/api/maps/campaign/${campaignId}/revealed-hexes`);
      return response.data;
    },
    enabled: !!campaignId,
  });

  const { data: position } = useQuery({
    queryKey: ['party-position', campaignId],
    queryFn: async () => {
      const response = await api.get(`/api/maps/campaign/${campaignId}/party-position`);
      return response.data;
    },
    enabled: !!campaignId,
  });

  // Update revealed hexes from query
  useEffect(() => {
    if (playerHexes) {
      const hexSet = new Set<string>();
      playerHexes.forEach((hex: any) => {
        hexSet.add(`${hex.hexX},${hex.hexY}`);
      });
      setRevealedHexes(hexSet);
    }
  }, [playerHexes]);

  // Update party position from query
  useEffect(() => {
    if (position) {
      setPartyPosition({ hexX: position.hexX, hexY: position.hexY });
    }
  }, [position]);

  // Socket.io connection
  useEffect(() => {
    if (!token || !activeSessionId) return;

    // Connect socket
    const socket = socketService.connect(token);

    // Join session
    socketService.joinSession(activeSessionId);

    // Listen for hex reveals
    socketService.onHexesRevealed((data: any) => {
      console.log('Hexes revealed:', data);
      const newHexes = new Set(revealedHexes);
      data.visibleHexes.forEach((hex: { x: number; y: number }) => {
        newHexes.add(`${hex.x},${hex.y}`);
      });
      setRevealedHexes(newHexes);
      setPartyPosition({ hexX: data.position.x, hexY: data.position.y });
    });

    return () => {
      socketService.leaveSession();
      socketService.removeAllListeners();
    };
  }, [token, activeSessionId]);

  const handleHexClick = (hex: HexCoord) => {
    if (campaign?.role !== 'DM' || !activeSessionId) return;

    // Move party
    socketService.moveParty(hex.q, hex.r);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Campaign not found</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeMap = maps?.find((m: any) => m.id === campaign.activeMapId) || maps?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white">
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
              <span
                className={`px-2 py-1 text-white text-xs rounded ${
                  campaign.role === 'DM' ? 'bg-green-500' : 'bg-blue-500'
                }`}
              >
                {campaign.role}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Campaign Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Campaign Details</h3>
              {campaign.description && (
                <p className="text-gray-400 text-sm">{campaign.description}</p>
              )}
            </div>

            {/* Players */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Players ({campaign.characters?.length || 0})
              </h3>
              <div className="space-y-2">
                {campaign.characters?.map((char: any) => (
                  <div key={char.id} className="flex items-center gap-2 text-sm">
                    {char.player.avatarUrl && (
                      <img src={char.player.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                    )}
                    <div>
                      <div className="text-white">{char.name}</div>
                      <div className="text-gray-400 text-xs">
                        {char.player.name} - Lvl {char.level} {char.race} {char.class}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Recent Sessions</h3>
              <div className="space-y-2">
                {campaign.sessions?.slice(0, 5).map((session: any) => (
                  <div
                    key={session.id}
                    className={`p-2 rounded text-sm ${
                      session.isActive ? 'bg-green-900 text-green-100' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium">Session {session.sessionNumber}</div>
                    <div className="text-xs">
                      {new Date(session.sessionDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Map Viewer */}
        <div className="flex-1">
          {activeMap ? (
            <HexMapViewer
              map={activeMap}
              revealedHexes={revealedHexes}
              partyPosition={partyPosition || undefined}
              isDM={campaign.role === 'DM'}
              onHexClick={handleHexClick}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-400 mb-4">No map available</p>
                {campaign.role === 'DM' && (
                  <button className="btn btn-primary">Upload Map</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
