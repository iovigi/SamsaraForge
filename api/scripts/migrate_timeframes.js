
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    timeFrame: {
        start: { type: String },
        end: { type: String },
    },
}, { timestamps: true });

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

async function migrate() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const tasks = await Task.find({
        'timeFrame.start': '00:00',
        'timeFrame.end': '00:00'
    });

    console.log(`Found ${tasks.length} tasks with default 00:00-00:00 timeframe.`);

    let fixed = 0;
    for (const t of tasks) {
        t.timeFrame.end = '23:59';
        // We need to mark it modified if it's nested? Mongoose usually handles this but explicit is safer.
        t.markModified('timeFrame');
        await t.save();
        fixed++;
        console.log(`Fixed task: ${t.title} (${t._id})`);
    }

    console.log(`Migration Complete. Fixed ${fixed} tasks.`);
    process.exit(0);
}

migrate();
