import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignApi } from '../lib/campaigns';

export default function JoinCampaign() {
    const { campaignId } = useParams<{ campaignId: string }>();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(true);

    useEffect(() => {
        const join = async () => {
            if (!campaignId) return;
            try {
                await campaignApi.joinCampaign(campaignId);
                // Small delay for thematic effect
                setTimeout(() => {
                    navigate(`/campaign/${campaignId}`);
                }, 1500);
            } catch (err: unknown) {
                console.error('Failed to join campaign:', err);
                setError(err instanceof Error ? err.message : 'The realm portal failed to stabilize. Ensure the invite is still valid.');
                setIsJoining(false);
            }
        };

        join();
    }, [campaignId, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-900/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-md w-full mx-4 text-center">
                {isJoining ? (
                    <div className="space-y-6">
                        <div className="relative inline-block">
                            <div className="h-24 w-24 rounded-full border-t-2 border-b-2 border-primary-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">🔮</div>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Stabilizing Realm Portal...</h1>
                        <p className="text-slate-400 font-medium italic">Joining the chronicle as an adventurer.</p>
                    </div>
                ) : (
                    <div className="bg-slate-900/80 backdrop-blur-2xl border border-red-900/30 rounded-3xl p-8 shadow-2xl">
                        <div className="text-5xl mb-6">🌋</div>
                        <h1 className="text-2xl font-bold text-white mb-4">Portal Collapse</h1>
                        <p className="text-slate-400 mb-8">{error}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
