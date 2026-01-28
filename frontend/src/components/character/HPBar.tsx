import React from 'react';

interface HPBarProps {
    hp: number;
    maxHp: number;
    showLabel?: boolean;
    isDM?: boolean;
    onHPChange?: (newHP: number) => void;
}

const HPBar: React.FC<HPBarProps> = ({ hp, maxHp, showLabel = true, isDM: _isDM = false, onHPChange: _onHPChange }) => {
    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

    // Determine color based on health percentage
    const getBarColor = () => {
        if (hpPercent < 25) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
        if (hpPercent < 50) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
        return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
    };

    return (
        <div className="w-full">
            {showLabel && (
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vitality</span>
                    <span className="text-sm font-mono text-white font-bold">{hp} <span className="text-slate-500 mx-0.5">/</span> {maxHp} <span className="text-[10px] text-slate-500 ml-1">HP</span></span>
                </div>
            )}
            <div className="h-2.5 w-full bg-slate-900/80 rounded-full overflow-hidden border border-slate-950/50 p-[1px]">
                <div
                    className={`h-full transition-all duration-700 ease-out rounded-full ${getBarColor()}`}
                    style={{ width: `${hpPercent}%` }}
                ></div>
            </div>
            {hpPercent < 15 && (
                <div className="mt-1 text-[9px] text-red-500 font-bold uppercase tracking-tighter animate-pulse">
                    Critical Condition
                </div>
            )}
        </div>
    );
};

export default HPBar;
