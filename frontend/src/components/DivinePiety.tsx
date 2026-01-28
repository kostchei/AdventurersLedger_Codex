import { useState } from 'react';
import { useCharacterStats } from '../hooks/useCharacterStats';

interface DivinePietyProps {
    isDM: boolean;
}

interface Deity {
    name: string;
    domain: string;
    worshipers: string;
    plane: string;
}

const DEITIES: Deity[] = [
    { name: "Amaunator", domain: "Sun", plane: "Mechanus", worshipers: "Farmers, lawmakers, travelers" },
    { name: "Asmodeus", domain: "Indulgence", plane: "The Nine Hells (Nessus)", worshipers: "Corrupt politicians, desperate folk" },
    { name: "Auril", domain: "Winter", plane: "Pandemonium (Pandesmos)", worshipers: "Druids, inhabitants of cold climates" },
    { name: "Azuth", domain: "Wizardry", plane: "Arcadia (Buxenus)", worshipers: "Arcane spellcasters" },
    { name: "Bane", domain: "Tyranny", plane: "Acheron (Avalas)", worshipers: "Conquerors, Fighters, Monks, tyrants" },
    { name: "Beshaba", domain: "Misfortune", plane: "The Abyss", worshipers: "Gamblers, Red Wizards, Rogues" },
    { name: "Bhaal", domain: "Murder", plane: "Gehenna (Khalas)", worshipers: "Assassins, murderers" },
    { name: "Chauntea", domain: "Agriculture", plane: "Elysium (Eronia)", worshipers: "Farmers, gardeners, homesteaders" },
    { name: "Cyric", domain: "Lies", plane: "Pandemonium (Cocytus)", worshipers: "Liars, manipulators, power-hungry folk" },
    { name: "Deneir", domain: "Writing", plane: "Elysium (Amoria)", worshipers: "Sages, scribes, students, teachers" },
    { name: "Eilistraee", domain: "Song and moonlight", plane: "Arborea (Arvandor)", worshipers: "Bladesingers, elves, performing artists" },
    { name: "Eldath", domain: "Peace", plane: "Elysium (Eronia)", worshipers: "Druids, pacifists, the dying" },
    { name: "Gond", domain: "Craft", plane: "The Outlands", worshipers: "Artificers, crafters, engineers, inventors" },
    { name: "Helm", domain: "Watchfulness", plane: "Mechanus", worshipers: "Explorers, Fighters, guards, Paladins" },
    { name: "Ilmater", domain: "Endurance", plane: "Bytopia (Shurrock)", worshipers: "Monks, the oppressed, the poor" },
    { name: "Kelemvor", domain: "Dead", plane: "Astral Plane (Fugue Plane)", worshipers: "Funeral workers, the dying" },
    { name: "Lathander", domain: "Dawn and renewal", plane: "Elysium (Eronia)", worshipers: "Aristocrats, athletes, merchants, youths" },
    { name: "Leira", domain: "Illusion", plane: "Limbo", worshipers: "Actors, con artists, Illusionists, Rogues" },
    { name: "Lliira", domain: "Joy", plane: "Arborea (Arvandor)", worshipers: "Bards, dancers, poets, revelers, singers" },
    { name: "Lolth", domain: "Spiders", plane: "The Abyss (Demonweb Pits)", worshipers: "Evil drow, folk who travel the Underdark" },
    { name: "Loviatar", domain: "Pain", plane: "Gehenna (Mungoth)", worshipers: "Those suffering from pain or betrayal" },
    { name: "Malar", domain: "Hunt", plane: "Carceri (Colothys)", worshipers: "Barbarians, hunters, lycanthropes" },
    { name: "Mask", domain: "Thieves", plane: "Hades (Niflheim)", worshipers: "Assassins, Rogues, thieves, tricksters" },
    { name: "Mielikki", domain: "Forests", plane: "The Beastlands (Krigala)", worshipers: "Fey, foresters, Rangers" },
    { name: "Milil", domain: "Poetry and song", plane: "Elysium (Amoria)", worshipers: "Bards, orators, poets, singers" },
    { name: "Myrkul", domain: "Death", plane: "Hades (Oinos)", worshipers: "Necromancers, undead" },
    { name: "Mystra", domain: "Magic", plane: "Elysium (Eronia)", worshipers: "Anyone who uses magic" },
    { name: "Oghma", domain: "Knowledge", plane: "The Outlands", worshipers: "Archivists, cartographers, sages" },
    { name: "Red Knight", domain: "Strategy", plane: "Arcadia (Buxenus)", worshipers: "Fighters, game players, strategists" },
    { name: "Selûne", domain: "Moon", plane: "Ysgard (Ysgard)", worshipers: "Lycanthropes, sailors, spellcasters" },
    { name: "Shar", domain: "Darkness and loss", plane: "Hades (Niflheim)", worshipers: "Anyone suffering pain or loss" },
    { name: "Shaundakul", domain: "Travel", plane: "Ysgard (Ysgard)", worshipers: "Guides, explorers, Rangers, travelers" },
    { name: "Silvanus", domain: "Wild nature", plane: "The Outlands", worshipers: "Barbarians, Druids, Rangers, wood elves" },
    { name: "Sune", domain: "Love and beauty", plane: "Arborea (Arvandor)", worshipers: "Artists, hedonists, lovers" },
    { name: "Talona", domain: "Poison and disease", plane: "Carceri (Cathrys)", worshipers: "Those suffering from plague" },
    { name: "Talos", domain: "Storms", plane: "Pandemonium (Pandesmos)", worshipers: "Barbarians, druids, raiders" },
    { name: "Tempus", domain: "War", plane: "Limbo", worshipers: "Fighters, mercenaries, warriors" },
    { name: "Torm", domain: "Courage and self-sacrifice", plane: "Mount Celestia (Mercuria)", worshipers: "Guardians, knights, Paladins" },
    { name: "Tymora", domain: "Good fortune", plane: "Arborea (Arvandor)", worshipers: "Gamblers, Harpers, merchants, Rogues" },
    { name: "Tyr", domain: "Justice", plane: "Mount Celestia (Lunia)", worshipers: "Judges, law enforcers, lawyers, Paladins" },
    { name: "Umberlee", domain: "Sea", plane: "The Abyss", worshipers: "Coastal dwellers, sailors" },
    { name: "Waukeen", domain: "Trade", plane: "The Outlands", worshipers: "Merchants, the rich, traders" }
];

const getPietyRank = (score: number) => {
    if (score >= 50) return { title: 'Champion', color: 'text-amber-400' };
    if (score >= 25) return { title: 'Disciple', color: 'text-indigo-400' };
    if (score >= 10) return { title: 'Votary', color: 'text-emerald-400' };
    if (score >= 3) return { title: 'Devotee', color: 'text-blue-400' };
    return { title: 'Follower', color: 'text-slate-500' };
};

export default function DivinePiety({ isDM }: DivinePietyProps) {
    const { stats, selectDeity, updatePiety } = useCharacterStats();
    const [isSelecting, setIsSelecting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    if (!stats) return null;

    const activeDeityName = stats.active_deity;
    const activeDeity = DEITIES.find(d => d.name === activeDeityName);
    const pietyScore = activeDeityName ? (stats.piety_json?.[activeDeityName] || 0) : 0;
    const rank = getPietyRank(pietyScore);

    const filteredDeities = DEITIES.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeitySelect = (name: string) => {
        selectDeity(name);
        setIsSelecting(false);
        setSearchTerm('');
    };

    const handlePietyUpdate = (amount: number) => {
        if (!activeDeityName) return;
        updatePiety(activeDeityName, Math.max(0, pietyScore + amount));
    };

    return (
        <div className="mt-12 pt-8 border-t border-white/5 space-y-6">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Divine Piety</h3>
                {!isSelecting && (
                    <button
                        onClick={() => setIsSelecting(true)}
                        className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                    >
                        {activeDeityName ? 'Change Deity' : 'Select Deity'}
                    </button>
                )}
            </div>

            {isSelecting ? (
                <div className="bg-slate-900/60 rounded-3xl border border-white/5 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search the heavens..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none w-full"
                        />
                        <button onClick={() => setIsSelecting(false)} className="text-slate-500 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {filteredDeities.map(deity => (
                            <button
                                key={deity.name}
                                onClick={() => handleDeitySelect(deity.name)}
                                className="text-left p-3 rounded-xl bg-slate-800/20 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{deity.name}</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{deity.domain}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : activeDeity ? (
                <div className="p-6 bg-slate-900/40 rounded-3xl border border-indigo-500/20 shadow-xl shadow-indigo-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div>

                    <div className="relative flex items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-xl font-black text-white tracking-tight">{activeDeity.name}</h4>
                                <span className="h-1 w-1 rounded-full bg-indigo-500/40"></span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{activeDeity.domain}</span>
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${rank.color} mb-3`}>{rank.title}</p>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-50">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Plane: {activeDeity.plane}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-4xl font-black text-indigo-400 font-mono tracking-tighter leading-none mb-1">{pietyScore}</div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">Piety Level</div>
                        </div>
                    </div>

                    {isDM && (
                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-6">
                            <button
                                onClick={() => handlePietyUpdate(-1)}
                                className="h-8 w-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adjust Piety</span>
                            <button
                                onClick={() => handlePietyUpdate(1)}
                                className="h-8 w-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all font-bold"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => setIsSelecting(true)}
                    className="w-full p-8 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center gap-3 group hover:border-indigo-500/50 transition-all"
                >
                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">
                        ✨
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-300 transition-colors">Undevoted Journey</p>
                        <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-1">Select a deity to begin your divine path</p>
                    </div>
                </button>
            )}
        </div>
    );
}
