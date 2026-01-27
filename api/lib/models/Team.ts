import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a team name'],
        maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['ADMIN', 'MEMBER'],
                default: 'MEMBER'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    logoUrl: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
