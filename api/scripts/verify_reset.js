
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

// Inline Schema Definition to avoid TypeScript import issues
const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
    notify: { type: Boolean, default: true },
    streak: { type: Number, default: 0 },
    lastCompletedAt: { type: Date },
    intention: { type: String },
    recurrence: { type: String, enum: ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'], default: 'ONCE' },
}, { timestamps: true });

// Prevent OverwriteModelError
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

async function simulateReset() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create a dummy task
        // Set lastCompletedAt to Yesterday 23:00 to be safely in the past
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 0, 0, 0);

        const testTask = await Task.create({
            title: 'Habit Reset Test Task - ' + Date.now(),
            status: 'DONE',
            recurrence: 'DAILY',
            lastCompletedAt: yesterday,
            userId: new mongoose.Types.ObjectId() // Random ID
        });

        console.log(`Created Test Task: ${testTask._id}`);
        console.log(`- Status: ${testTask.status}`);
        console.log(`- Recurrence: ${testTask.recurrence}`);
        console.log(`- LastCompletedAt: ${testTask.lastCompletedAt.toISOString()}`);
        console.log(`- Target Reset Condition: lastCompletedAt < Today (Start of Day)`);

        console.log('\nWaiting for Task Runner to reset status to TODO...');
        console.log('The Task Runner runs every minute. Monitoring for 90 seconds...');

        let checks = 0;
        const maxChecks = 15; // 15 * 6s = 90s
        const intervalTime = 6000;

        const interval = setInterval(async () => {
            checks++;
            const checkTask = await Task.findById(testTask._id);

            if (!checkTask) {
                console.error('Task disappeared!');
                clearInterval(interval);
                process.exit(1);
            }

            if (checkTask.status === 'TODO') {
                console.log('\n[SUCCESS] Task was automatically reset to TODO!');
                console.log(`- New Status: ${checkTask.status}`);

                await Task.findByIdAndDelete(testTask._id);
                console.log('Cleaned up test task.');
                clearInterval(interval);
                process.exit(0);
            } else {
                process.stdout.write(`.`); // progress dot
            }

            if (checks >= maxChecks) {
                console.log('\n[TIMEOUT] Task did not reset within 90 seconds.');
                console.log('Ensure the backend server is running and the Task Runner is active.');

                await Task.findByIdAndDelete(testTask._id);
                console.log('Cleaned up test task.');
                clearInterval(interval);
                process.exit(1);
            }
        }, intervalTime);

    } catch (err) {
        console.error('Script Error:', err);
        process.exit(1);
    }
}

simulateReset();
