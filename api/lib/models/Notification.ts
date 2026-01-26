import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'error', 'success', 'team_invitation'],
        default: 'info'
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    link: {
        type: String,
        required: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
