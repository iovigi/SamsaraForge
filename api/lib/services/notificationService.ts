import webpush from 'web-push';

// VAPID Keys should be in env, but for now we might generate them or use placeholder if not found.
// The user should set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local of API.

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BM2...'; // Placeholder
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '...'; // Placeholder

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:example@yourdomain.org',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export const sendNotification = async (subscription: any, payload: any) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return true;
    } catch (error) {
        console.error('Error sending notification', error);
        return false;
    }
};

export const generateVapidKeys = () => {
    return webpush.generateVAPIDKeys();
};
