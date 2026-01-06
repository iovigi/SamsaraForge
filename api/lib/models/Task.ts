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
    timeFrame: {
        start: { type: String, default: '00:00' },
        end: { type: String, default: '00:00' },
    },
    // Scheduling Fields
    scheduledDate: {
        type: Date, // For ONCE recurrence
    },
    weekDays: {
        type: [Number], // 0-6 (Sun-Sat) for WEEKLY
    },
    monthDay: {
        type: Number, // 1-31 for MONTHLY
    },
    reminderCron: {
        type: String, // Cron expression
    },
    comments: [
        {
            text: { type: String, required: true },
            authorEmail: { type: String },
            createdAt: { type: Date, default: Date.now }
        }
    ],
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
