import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useCharacterStats } from '../hooks/useCharacterStats';
import HPBar from './character/HPBar';
import AbilityScoreGrid from './character/AbilityScoreGrid';

interface CharacterStatsProps {
    isDM?: boolean;
}

export default function CharacterStats({ isDM = false }: CharacterStatsProps) {
    const { stats, loading, error, updateHP, updateGold, addXP } = useCharacterStats();
    const [editingStat, setEditingStat] = useState<'gold' | 'xp' | null>(null);
    const [editValue, setEditValue] = useState('');

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse h-16 bg-slate-800/50 rounded-xl"></div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="animate-pulse h-14 bg-slate-800/30 rounded-lg"></div>
                    <div className="animate-pulse h-14 bg-slate-800/30 rounded-lg"></div>
                </div>
                <div className="animate-pulse h-24 bg-slate-800/20 rounded-lg"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg text-red-500 text-xs text-center font-medium">
                Failed to channel character data.
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-slate-500 text-sm italic text-center py-4 bg-slate-900/20 rounded-lg">
                No ledger entry found for this character.
            </div>
        );
    }

    const startEditing = (type: 'gold' | 'xp', currentVal: number) => {
        if (!isDM) return;
        setEditingStat(type);
        setEditValue(currentVal.toString());
    };

    const handleStatSubmit = async () => {
        const newValue = parseInt(editValue);
        if (isNaN(newValue)) return;

        if (editingStat === 'gold') {
            await updateGold(newValue);
        } else if (editingStat === 'xp') {
            // For XP we use addXP which takes the DELTA, so we calculate difference
            const delta = newValue - stats.xp;
            await addXP(delta);
        }
        setEditingStat(null);
    };

    return (
        <div className="space-y-6">
            {/* Vitality Section */}
            <section className="bg-slate-800/30 border border-slate-800/50 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                <HPBar
                    hp={stats.hp}
                    maxHp={stats.max_hp}
                    isDM={isDM}
                    onHPChange={(newHP: number) => updateHP(newHP - stats.hp)}
                />
            </section>

            {/* Economy & Experience Section */}
            <div className="grid grid-cols-2 gap-3">
                {/* Gold Card */}
                <div
                    onClick={() => startEditing('gold', stats.gold)}
                    className={`bg-slate-800/20 border border-slate-800/40 p-3 rounded-lg text-center transition-all ${isDM ? 'cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/30 active:scale-95' : ''}`}
                >
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Fortune</div>
                    {editingStat === 'gold' ? (
                        <input
                            autoFocus
                            type="number"
                            value={editValue}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
                            onBlur={handleStatSubmit}
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleStatSubmit()}
                            className="w-full bg-slate-900 border border-amber-500 rounded px-1 text-sm text-center text-amber-400 font-mono focus:outline-none"
                        />
                    ) : (
                        <div className="text-amber-400 font-mono text-xl font-bold flex items-baseline justify-center gap-1">
                            {stats.gold}
                            <span className="text-[10px] text-amber-500/60 uppercase font-black">gp</span>
                        </div>
                    )}
                </div>

                {/* XP Card */}
                <div
                    onClick={() => startEditing('xp', stats.xp)}
                    className={`bg-slate-800/20 border border-slate-800/40 p-3 rounded-lg text-center transition-all ${isDM ? 'cursor-pointer hover:border-primary-500/50 hover:bg-slate-800/30 active:scale-95' : ''}`}
                >
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Journey</div>
                    {editingStat === 'xp' ? (
                        <input
                            autoFocus
                            type="number"
                            value={editValue}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
                            onBlur={handleStatSubmit}
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleStatSubmit()}
                            className="w-full bg-slate-900 border border-primary-500 rounded px-1 text-sm text-center text-primary-400 font-mono focus:outline-none"
                        />
                    ) : (
                        <div className="text-primary-400 font-mono text-xl font-bold flex items-baseline justify-center gap-1">
                            {stats.xp}
                            <span className="text-[10px] text-primary-500/60 uppercase font-black">xp</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Conditions Section */}
            {stats.conditions.length > 0 && (
                <section>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 leading-none">Active Afflictions</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {stats.conditions.map((condition: string) => (
                            <span
                                key={condition}
                                className="px-2 py-1 bg-red-900/20 text-red-400 border border-red-900/40 rounded-md text-[9px] font-black uppercase tracking-wider"
                            >
                                {condition}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Ability Scores Section */}
            <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 leading-none">Attributes</h3>
                <AbilityScoreGrid stats={stats.stats_json} />
            </section>
        </div>
    );
}
