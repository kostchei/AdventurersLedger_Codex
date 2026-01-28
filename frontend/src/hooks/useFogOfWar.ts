import { useEffect, useState } from 'react';
import { pb } from '../lib/pb';
import { useAuthStore } from '../store/authStore';

export interface FoWHex {
    q: number;
    r: number;
    z: number;
}

export function useFogOfWar(currentZ: number = 0) {
    const { user } = useAuthStore();
    const [revealedHexes, setRevealedHexes] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const getHexKey = (q: number, r: number, z: number) => `${q},${r},${z}`;

    useEffect(() => {
        if (!user) {
            setRevealedHexes(new Set());
            setLoading(false);
            return;
        }

        // Fetch initial revealed hexes
        const fetchInitialHexes = async () => {
            try {
                const records = await pb.collection('fog_of_war').getFullList({
                    filter: `user = "${user.id}" && z = ${currentZ}`,
                });

                const newSet = new Set<string>();
                records.forEach((record) => {
                    const r = record as unknown as FoWHex;
                    newSet.add(getHexKey(r.q, r.r, r.z));
                });
                setRevealedHexes(newSet);
            } catch (error) {
                console.error('Failed to fetch initial fog of war:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialHexes();

        // Subscribe to new reveals
        pb.collection('fog_of_war').subscribe('*', (e) => {
            if (e.action === 'create' && e.record.user === user.id && e.record.z === currentZ) {
                setRevealedHexes((prev) => {
                    const next = new Set(prev);
                    next.add(getHexKey(e.record.q, e.record.r, e.record.z));
                    return next;
                });
            }
        });

        return () => {
            pb.collection('fog_of_war').unsubscribe('*');
        };
    }, [user, currentZ]);

    const revealHex = async (q: number, r: number, z: number = currentZ) => {
        if (!user) return;
        const key = getHexKey(q, r, z);
        if (revealedHexes.has(key)) return;

        try {
            await pb.collection('fog_of_war').create({
                user: user.id,
                q, r, z
            });
            // The subscription will handle updating the local set if it's on the current layer
        } catch (error) {
            console.error('Failed to reveal hex:', error);
        }
    };

    return { revealedHexes, revealHex, loading };
}
