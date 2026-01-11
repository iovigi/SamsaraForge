import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please provide an email for this user.'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password for this user.'],
    },
    nickname: {
        type: String,
        required: false,
    },
    quoteNotifications: {
        type: Boolean,
        default: false
    },
    quoteNotificationIntervalMin: {
        type: Number,
        default: 1440 // Default to 24 hours
    },
    lastQuoteNotificationSentAt: {
        type: Date,
        default: null
    },
    language: {
        type: String,
        enum: ['en', 'bg'],
        default: 'en'
    }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
