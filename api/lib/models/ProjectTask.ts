import mongoose from 'mongoose';

const ProjectTaskSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    title: {
        type: String,
        required: [true, 'Please provide a task title'],
        maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    description: {
        type: String, // Can contain HTML/Markdown for rich text imports
    },
    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'DONE'],
        default: 'TODO',
    },
    estimatedTime: {
        type: Number, // In minutes or hours? Let's assume minutes for now or string description
        default: 0
    },
    estimatedTimeUnit: {
        type: String,
        enum: ['minutes', 'hours', 'days'],
        default: 'hours' // e.g. "2 hours"
    },
    order: {
        type: Number,
        default: 0, // For Kanban sorting
    },
    comments: [
        {
            text: { type: String, required: true },
            authorName: { type: String }, // Store name for snapshot
            authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    files: [
        {
            name: String,
            url: String,
            type: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }
    ],
}, { timestamps: true });

export default mongoose.models.ProjectTask || mongoose.model('ProjectTask', ProjectTaskSchema);
