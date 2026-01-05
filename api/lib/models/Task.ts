import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'DONE'],
        default: 'TODO',
    },
    recurrence: {
        type: String,
        enum: ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'],
        default: 'ONCE',
    },
    duration: {
        type: String, // e.g., "25h", "30m"
    },
    reminderCron: {
        type: String, // Cron expression
    },
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
