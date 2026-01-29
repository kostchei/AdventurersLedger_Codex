import { useEffect, useState, useCallback } from 'react';
import { worldStateApi } from '../lib/pbClient';
import type { WorldState } from '../types/pocketbase';

export function useWorldState(campaignId?: string) {
    const [state, setState] = useState<WorldState | null>(null);
    const [loading, setLoading] = useState(Boolean(campaignId));
    const [error, setError] = useState<Error | null>(null);

    const fetchState = useCallback(async () => {
        if (!campaignId) {
            setState(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await worldStateApi.getLatestForCampaign(campaignId);
            setState(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch world state:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    }, [campaignId]);

    useEffect(() => {
        if (!campaignId) {
            setLoading(false);
            setState(null);
            return;
        }

        fetchState();

        let unsubscribe: (() => void) | undefined;

        const setupSubscription = async () => {
            unsubscribe = await worldStateApi.subscribeToCampaign(campaignId, (e) => {
                setState(e.record);
            });
        };

        setupSubscription();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [campaignId, fetchState]);

    return { state, loading, error, refresh: fetchState };
}
