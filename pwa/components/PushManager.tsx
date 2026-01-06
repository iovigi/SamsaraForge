'use client';
import { useEffect } from 'react';

const PUBLIC_VAPID_KEY = 'BNprVZo2f-5BWNMiFVRdjbtJamkktDs4BDIN4_o1gvg6b_6P0NxIU5hvv-B1cK5lZp--uP7XINHYR06VSy7alAUA';

export default function PushManager() {
    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            registerSw();
        }
    }, []);

    const registerSw = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            // Check if already subscribed
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                // Ask permission
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    subscribe(registration);
                }
            } else {
                // Should probably sync with backend to ensure it's fresh
                sendSubscriptionToBackend(subscription);
            }
        } catch (error) {
            console.error('SW Error', error);
        }
    };

    const subscribe = async (registration: ServiceWorkerRegistration) => {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            });
            await sendSubscriptionToBackend(subscription);
        } catch (error) {
            console.error('Subscription failed', error);
        }
    };

    const sendSubscriptionToBackend = async (subscription: PushSubscription) => {
        // We need userId. Assuming we have auth context or stored token.
        // For now, if no auth, we might fail.
        // Ideally this component is inside AuthProvider.
        // We'll skip implementation detail of getting userId here and assume API handles it or we send dummy.
        // Actually, if we use the same auth as Tasks, we need to send the token.

        // Mocking fetch
        /*
        await fetch('http://localhost:5000/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, userId: '...' })
        });
        */
    };

    return null; // Headless component
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
