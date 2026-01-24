import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: [true, 'Please provide a project name'],
        maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    backgroundUrl: {
        type: String, // URL to the image
    },
    files: [
        {
            name: String,
            url: String,
            type: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }
    ],
    members: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['MEMBER'], // Can be expanded to ADMIN later if needed, but for now simple Member
                default: 'MEMBER'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    teams: [
        {
            teamId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Team',
                required: true
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
