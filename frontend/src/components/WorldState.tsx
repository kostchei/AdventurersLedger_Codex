import { useWorldState } from '../hooks/useWorldState';

interface WorldStateProps {
    campaignId?: string;
}

export default function WorldState({ campaignId }: WorldStateProps) {
    const { state, loading, error } = useWorldState(campaignId);

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i}>
                        <div className="animate-pulse h-3 w-20 bg-slate-800/50 rounded mb-3"></div>
                        <div className="animate-pulse h-16 bg-slate-800/20 rounded-lg"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg text-red-500 text-xs text-center font-medium">
                The world archives are currently inaccessible.
            </div>
        );
    }

    if (!campaignId) {
        return (
            <div className="text-slate-500 text-sm italic text-center py-8 bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
                No campaign selected.
            </div>
        );
    }

    if (!state) {
        return (
            <div className="text-slate-500 text-sm italic text-center py-8 bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
                The world is currently a blank slate.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Dungeon Progress */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Epic Conquests</h3>
                </div>
                <div className="space-y-2.5">
                    {state.cleared_dungeons_list.length > 0 ? (
                        state.cleared_dungeons_list.map(dungeon => (
                            <div
                                key={dungeon}
                                className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg group hover:bg-emerald-500/10 transition-colors"
                            >
                                <span className="text-emerald-500 text-lg leading-none select-none">◈</span>
                                <span className="text-sm font-medium text-emerald-200/80 group-hover:text-emerald-200 transition-colors">{dungeon}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-slate-600 italic px-2">No legendary locales reclaimed yet.</div>
                    )}
                </div>
            </section>

            {/* Note: In a full implementation, Ecological Impact and Persons of Interest 
                might come from separate related collections (Phase 6.4 & 6.5) */}

            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-800/50"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-tighter">
                    <span className="bg-gray-900 px-2 text-slate-700">Archives</span>
                </div>
            </div>

            <p className="text-[10px] text-slate-600 italic text-center leading-relaxed px-4">
                "The world is changed. I feel it in the water. I feel it in the earth. I smell it in the air."
            </p>
        </div>
    );
}
