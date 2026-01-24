import mongoose from 'mongoose';

const TeamInvitationSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        enum: ['ADMIN', 'MEMBER'],
        default: 'MEMBER'
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
        default: 'PENDING'
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

export default mongoose.models.TeamInvitation || mongoose.model('TeamInvitation', TeamInvitationSchema);
