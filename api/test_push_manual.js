require('dotenv').config({ path: '.env.local' });
const webpush = require('web-push');
const mongoose = require('mongoose');

// Mongoose schema logic locally
const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    endpoint: { type: String, required: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

async function testPush() {
    console.log('--- VAPID Key Check ---');
    console.log('Public Key (env):', process.env.VAPID_PUBLIC_KEY);
    console.log('Private Key (env):', process.env.VAPID_PRIVATE_KEY ? '******' + process.env.VAPID_PRIVATE_KEY.slice(-5) : 'MISSING');
    console.log('Subject (env):', process.env.VAPID_SUBJECT);

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.error('Missing VAPID keys!');
        process.exit(1);
    }

    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:test@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    try {
        await mongoose.connect('mongodb://localhost:27017/samsara-forge');
        console.log('Connected to DB');

        const userId = '695adbd081067b9d68a5b32a';
        const subs = await Subscription.find({ userId: userId });
        console.log(`Found ${subs.length} subscriptions`);

        for (const sub of subs) {
            console.log(`Sending to endpoint: ${sub.endpoint.slice(0, 30)}...`);
            try {
                await webpush.sendNotification(sub, JSON.stringify({
                    title: 'Manual Test Notification',
                    body: 'If you see this, push works!',
                }));
                console.log('SUCCESS: Notification sent.');
            } catch (err) {
                console.error('FAILED to send:', err.statusCode, err.body || err.message);
                if (err.statusCode === 410) {
                    console.log('Subscription is gone, deleting...');
                    await Subscription.deleteOne({ _id: sub._id });
                }
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Script Error:', err);
        process.exit(1);
    }
}

testPush();
