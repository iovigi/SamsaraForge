'use client';
import { useEffect } from 'react';

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
import { urlBase64ToUint8Array } from '../utils/notifications';

export default function PushManager() {
    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            registerSw();
        }
    }, []);

    const registerSw = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('SW registered', registration);

            // We no longer auto-subscribe here to avoid permission spam or "invalid key" errors if env is missing.
            // The subscription logic is now handled in Settings page via usePushSubscription hook.
            // However, if we want to sync existing subscriptions, we can check getSubscription().

            /*
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                // optional: sync with backend
            }
            */

        } catch (error) {
            console.error('SW Error', error);
        }
    };

    // Removed local subscribe implementation to avoid duplication and conflicts.
    // usePushSubscription hook handles this.

    return null; // Headless component
}
