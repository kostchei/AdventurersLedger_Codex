import { useState, useEffect, useCallback } from 'react';
import { pb } from '../lib/pb';

export function useServerStatus() {
    const [isOnline, setIsOnline] = useState<boolean | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const checkStatus = useCallback(async () => {
        try {
            // Health check to PocketBase
            await pb.health.check();
            setIsOnline(true);
            setIsRetrying(false);
            setRetryCount(0);
        } catch (error) {
            console.error('Server status check failed:', error);
            setIsOnline(false);
        }
    }, []);

    useEffect(() => {
        checkStatus();

        // Initial check
        let timeoutId: ReturnType<typeof setTimeout>;

        if (isOnline === false) {
            setIsRetrying(true);
            // Exponential backoff: 2s, 4s, 8s, up to 30s
            const delay = Math.min(Math.pow(2, retryCount + 1) * 1000, 30000);

            timeoutId = setTimeout(() => {
                setRetryCount((prev: number) => prev + 1);
                checkStatus();
            }, delay);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isOnline, retryCount, checkStatus]);

    const retry = () => {
        setRetryCount(0);
        checkStatus();
    };

    return { isOnline, isRetrying, retry, retryCount };
}
