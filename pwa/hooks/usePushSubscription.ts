import { useState, useEffect } from 'react';
import { urlBase64ToUint8Array } from '../utils/notifications';
import { authenticatedFetch } from '../utils/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function usePushSubscription() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                setRegistration(reg);
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setSubscription(sub);
                        setIsSubscribed(true);
                    }
                    setLoading(false);
                });
            });
        } else {
            setLoading(false);
            console.warn('Push notifications not supported');
        }
    }, []);

    const subscribe = async () => {
        console.log('Subscribe clicked');
        console.log('Registration:', registration);
        console.log('VAPID:', VAPID_PUBLIC_KEY);

        if (!registration || !VAPID_PUBLIC_KEY) {
            console.error('Missing registration or key');
            setError('Push notifications not ready or VAPID key missing');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log('Requesting permission...');
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);

            if (permission === 'denied') {
                throw new Error('Notifications are blocked. Please allow them in your browser settings (lock icon in address bar).');
            }

            if (permission !== 'granted') {
                throw new Error('Notification permission was not granted.');
            }

            console.log('Converting key...');
            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            console.log('Subscribing to pushManager...');
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
            console.log('Got subscription:', sub);

            // Send to backend
            const res = await authenticatedFetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify({ subscription: sub }),
            });

            if (!res.ok) {
                throw new Error('Failed to save subscription to server');
            }

            setSubscription(sub);
            setIsSubscribed(true);
        } catch (err: any) {
            console.error('Failed to subscribe:', err);
            setError(err.message || 'Failed to subscribe');
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        if (!subscription) return;
        setLoading(true);
        setError(null);
        try {
            // Unsubscribe from backend first
            const res = await authenticatedFetch('/api/notifications/subscribe', {
                method: 'DELETE',
                body: JSON.stringify({ subscription }),
            });

            if (!res.ok) {
                console.warn('Failed to remove subscription from server');
            }

            // Unsubscribe from browser
            await subscription.unsubscribe();

            setSubscription(null);
            setIsSubscribed(false);
        } catch (err: any) {
            console.error('Failed to unsubscribe:', err);
            setError(err.message || 'Failed to unsubscribe');
        } finally {
            setLoading(false);
        }
    };

    return { isSubscribed, subscribe, unsubscribe, loading, error };
}
