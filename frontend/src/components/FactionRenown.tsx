import { useCharacterStats } from '../hooks/useCharacterStats';

interface FactionRenownProps {
    isDM: boolean;
}

const FACTIONS = [
    "Cult of the Dragon", "Emerald Enclave", "Harpers", "Lords’ Alliance",
    "Order of the Gauntlet", "Purple Dragon Knights", "Red Wizards", "Zhentarim",
    "Fire Knives", "Nine Golden Swords", "Shadow Thieves", "Xanathar Guild",
    "Arcane Brotherhood", "Aurora’s Emporium", "the Howling Hatred", "the Black Earth",
    "the Eternal Flame", "the Crushing Wave", "Flaming Fist", "Kraken Society",
    "Order of Delvers", "Spellguard", "Waterclock Guild"
];

const getRank = (renown: number) => {
    if (renown >= 50) return { title: 'Exalted', color: 'text-amber-400' };
    if (renown >= 40) return { title: 'Commander', color: 'text-indigo-400' };
    if (renown >= 30) return { title: 'Leader', color: 'text-emerald-400' };
    if (renown >= 25) return { title: 'Veteran', color: 'text-blue-400' };
    if (renown >= 15) return { title: 'Senior Agent', color: 'text-slate-300' };
    if (renown >= 10) return { title: 'Agent', color: 'text-slate-400' };
    if (renown >= 5) return { title: 'Operative', color: 'text-slate-500' };
    if (renown >= 3) return { title: 'Associate', color: 'text-slate-600' };
    return { title: 'Stranger', color: 'text-slate-700' };
};

export default function FactionRenown({ isDM }: FactionRenownProps) {
    const { stats, updateFactionRenown } = useCharacterStats();

    if (!stats) return null;

    const factions = stats.factions || {};

    const handleUpdate = (faction: string, amount: number) => {
        const current = factions[faction] || 0;
        updateFactionRenown(faction, Math.max(0, current + amount));
    };

    return (
        <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-1">Active Allegiances</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {FACTIONS.map(faction => {
                    const renown = factions[faction] || 0;
                    const rank = getRank(renown);

                    return (
                        <div
                            key={faction}
                            className={`p-4 rounded-2xl border transition-all ${renown > 0 ? 'bg-slate-800/40 border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'bg-slate-900/40 border-white/5 opacity-60 hover:opacity-100'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-white uppercase tracking-wider truncate mb-0.5">{faction}</p>
                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${rank.color}`}>{rank.title}</p>
                                </div>
                                <div className="text-right ml-4">
                                    <div className="text-lg font-black text-indigo-400 font-mono leading-none">{renown}</div>
                                    <div className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Renown</div>
                                </div>
                            </div>

                            {isDM && (
                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => handleUpdate(faction, -1)}
                                        className="h-6 w-6 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all font-bold"
                                    >
                                        -
                                    </button>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Adjust</span>
                                    <button
                                        onClick={() => handleUpdate(faction, 1)}
                                        className="h-6 w-6 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] text-slate-600 italic text-center px-4 leading-relaxed mt-4">
                Your deeds across the realm earn you influence among these powerful organizations. 10 Renown marks you as a local hero.
            </p>
        </div>
    );
}
