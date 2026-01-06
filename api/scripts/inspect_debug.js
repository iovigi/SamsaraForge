
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    recurrence: { type: String },
    scheduledDate: { type: Date },
    timeFrame: {
        start: { type: String },
        end: { type: String },
    },
    reminderCron: { type: String },
}, { timestamps: true });

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

async function inspect() {
    await mongoose.connect(MONGODB_URI);

    // IDs from log
    const ids = ['695bb3461e06a6d6e0f60ef3', '695d17994ab3ff9326cc588e'];

    const tasks = await Task.find({ _id: { $in: ids } });

    console.log('--- INSPECTION RESULTS ---');
    tasks.forEach(t => {
        console.log(`\nTitle: ${t.title}`);
        console.log(`ID: ${t._id}`);
        console.log(`Recurrence: ${t.recurrence}`);
        console.log(`ScheduledDate: ${t.scheduledDate ? t.scheduledDate.toISOString() : 'NULL'}`);
        console.log(`TimeFrame: ${t.timeFrame?.start} - ${t.timeFrame?.end}`);
        console.log(`Cron: ${t.reminderCron}`);

        // Debug Check
        const now = new Date();
        const isToday = t.scheduledDate &&
            t.scheduledDate.getDate() === now.getDate() &&
            t.scheduledDate.getMonth() === now.getMonth() &&
            t.scheduledDate.getFullYear() === now.getFullYear();
        console.log(`Is Today (${now.toISOString()}): ${isToday}`);
    });

    process.exit(0);
}

inspect();
