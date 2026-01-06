const mongoose = require('mongoose');

// Mongoose schema logic locally to avoid imports in script
const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    endpoint: { type: String, required: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

async function check() {
    try {
        await mongoose.connect('mongodb://localhost:27017/samsara-forge'); // Assuming generic local URI or check .env.local
        console.log('Connected to DB');

        const userId = '695adbd081067b9d68a5b32a';
        const subs = await Subscription.find({ userId: userId });

        console.log(`Found ${subs.length} subscriptions for user ${userId}`);
        console.log(JSON.stringify(subs, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
