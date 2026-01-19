import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { campaignApi } from '../lib/campaigns';
import CreateCampaignModal from '../components/CreateCampaignModal';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.getUserCampaigns,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Adventurer's Ledger</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {user?.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-white">{user?.name || user?.email}</span>
              </div>
              <button
                onClick={logout}
                className="btn btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'Adventurer'}!
          </h2>
          <p className="text-gray-400">Choose a campaign or create a new one to get started.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading campaigns...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Campaign Card */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="card hover:shadow-xl transition-shadow border-2 border-dashed border-gray-600 flex items-center justify-center min-h-[200px] hover:border-primary-500"
            >
              <div className="text-center">
                <div className="text-5xl mb-3">➕</div>
                <h3 className="text-xl font-semibold text-white mb-2">Create Campaign</h3>
                <p className="text-gray-400 text-sm">Start a new adventure</p>
              </div>
            </button>

            {/* Campaign Cards */}
            {campaigns?.map((campaign: any) => (
              <div
                key={campaign.id}
                onClick={() => navigate(`/campaign/${campaign.id}`)}
                className="card hover:shadow-xl transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white truncate">{campaign.name}</h3>
                  <span
                    className={`px-2 py-1 text-white text-xs rounded ${
                      campaign.role === 'DM' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  >
                    {campaign.role}
                  </span>
                </div>
                {campaign.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>👥 {campaign.characters?.length || 0} players</span>
                  {campaign.sessions?.[0] && (
                    <span>📅 Session {campaign.sessions[0].sessionNumber}</span>
                  )}
                </div>
              </div>
            ))}

            {campaigns?.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400 mb-4">No campaigns yet. Create one to get started!</p>
              </div>
            )}
          </div>
        )}
      </main>

      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
