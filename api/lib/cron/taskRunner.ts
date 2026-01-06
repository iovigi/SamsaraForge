import cron from 'node-cron';
import Task from '../models/Task';
import { sendNotification } from '../services/notificationService';
import jwt from 'jsonwebtoken';
// We need a Subscription model to fetch subs. For now assuming we have a way to get subs.
// Actually, we likely need to store subscriptions in DB linked to User.

// Placeholder Subscription Model import (will implement next)
import Subscription from '../models/Subscription';
import User from '../models/User';

import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'debug_cron.log');

const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    console.log(msg);
};

// Force model registration
if (!User) {
    log('User model not loaded!');
} else {
    // Accessing modelName ensures the import is not elided and model is registered
    // log(`User model loaded: ${User.modelName}`);
}

const checkTasks = async () => {
    try {
        const now = new Date();
        const currentHeight = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDate();
        const currentWeekDay = now.getDay(); // 0-6

        log(`[TaskRunner] Running Check at ${currentHeight}:${currentMinute}`);

        // --- HABIT RESET LOGIC ---
        // Find recurring tasks that are DONE but shouldn't be anymore (new day/period)
        // For MVP, we reset DAILY and WEEKLY tasks if lastCompletedAt is not today.
        // (For Weekly, you might want to reset only on specific days, but "Habit" usually implies "Do it again today" or "Do it again this week")
        // If it's a "Daily" habit, we reset it at midnight (effectively now if lastCompleted < today).
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const tasksToReset = await Task.find({
            status: 'DONE',
            recurrence: { $in: ['DAILY', 'WEEKLY', 'MONTHLY'] },
            lastCompletedAt: { $lt: startOfToday }
        });

        if (tasksToReset.length > 0) {
            log(`[TaskRunner] Found ${tasksToReset.length} habits to reset.`);
            for (const task of tasksToReset) {
                // For WEEKLY, we might only want to reset if today IS one of the weekdays? 
                // OR we reset it immediately so it appears as TODO for the next occurrence?
                // "Habit" usually means "Daily Streak".
                // Let's assume Daily Reset for all for now to keep them appearing in "To Do" list.
                // A "Weekly" task appearing in TODO on a Tuesday when it's due Friday is fine.
                task.status = 'TODO';
                await task.save();
                log(`Reset Task ${task.title} to TODO`);
            }
        }
        // -------------------------

        // Find all TODO tasks
        // This is inefficient for large DBs, but fine for MVP.
        // We also check notify: { $ne: false } to handle legacy docs where field might be missing (default true)
        const tasks = await Task.find({ status: 'TODO', notify: { $ne: false } }).populate('userId');

        log(`[TaskRunner] Found ${tasks.length} TODO tasks`);

        for (const task of tasks) {
            log(`Checking Task: ${task.title} (ID: ${task._id})`);

            // Check TimeFrame
            if (task.timeFrame) {
                const [startH, startM] = task.timeFrame.start.split(':').map(Number);
                const [endH, endM] = task.timeFrame.end.split(':').map(Number);
                const nowMinutes = currentHeight * 60 + currentMinute;
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;

                log(`Timeframe Check: Now=${nowMinutes}, Start=${startMinutes}, End=${endMinutes}`);

                if (nowMinutes < startMinutes || nowMinutes > endMinutes) {
                    log(`Skipping - Outside timeframe`);
                    continue; // Outside timeframe
                }
            } else {
                log(`No timeframe, proceeding.`);
            }

            // Check Recurrence
            let recurrenceMatch = false;
            if (task.recurrence === 'ONCE') {
                // Check Scheduled Date
                if (task.scheduledDate) {
                    const tDate = new Date(task.scheduledDate);
                    if (tDate.getDate() === currentDay && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
                        recurrenceMatch = true;
                    }
                }
            } else if (task.recurrence === 'DAILY') {
                recurrenceMatch = true;
            } else if (task.recurrence === 'WEEKLY') {
                if (task.weekDays && task.weekDays.includes(currentWeekDay)) {
                    recurrenceMatch = true;
                }
            } else if (task.recurrence === 'MONTHLY') {
                if (task.monthDay === currentDay) {
                    recurrenceMatch = true;
                }
            }

            log(`Recurrence Match: ${recurrenceMatch} (${task.recurrence})`);

            if (!recurrenceMatch) continue;

            // Check Cron
            // We can use cron parser to check if current minute matches expression.
            // But we already have logic or use node-cron validate?
            // Actually `node-cron` schedules jobs. It doesn't easily "check" if a string matches NOW.
            // We can use a parser library or simple manual check if we want to reuse the cron string.
            // OR we can rely on the fact that this runner runs EVERY MINUTE.
            // We need to parse task.reminderCron and see if it matches current time.

            // For now, let's assume we want to support standard cron.
            // We can use `cron-parser` package if strictly needed, or implement simple check for our generated formats.
            // Since we built the UI, we know formats:
            // */n
            // m */n
            // m S/I

            log(`Checking Cron: ${task.reminderCron}`);

            // CHECK SNOOZE
            if (task.snoozeUntil && new Date(task.snoozeUntil) > now) {
                log(`Skipping - Snoozed until ${task.snoozeUntil}`);
                continue;
            }

            if (cronMatches(task.reminderCron, now)) {
                // SEND NOTIFICATION
                log(`Cron matched! Sending notification...`);
                // Fetch subscriptions for user
                const subs = await Subscription.find({ userId: task.userId._id });
                if (subs.length > 0) {
                    log(`Found ${subs.length} subscriptions, sending...`);

                    // Generate Snooze Token
                    const snoozeToken = jwt.sign(
                        { taskId: task._id, action: 'snooze' },
                        process.env.JWT_SECRET || 'your-secret-key',
                        { expiresIn: '1h' }
                    );

                    const payload = {
                        title: 'Task Reminder',
                        body: task.title,
                        data: {
                            taskId: task._id,
                            url: `/kanban?openTask=${task._id}`, // Deep link to specific task
                            snoozeToken
                        },
                        actions: [
                            { action: 'snooze', title: 'Snooze 30m' }
                        ]
                    };

                    for (const sub of subs) {
                        const result = await sendNotification(sub, payload);
                        log(`Send result: ${result}`);
                    }
                } else {
                    log('No subscription found for user');
                }
            } else {
                log(`Cron did not match.`);
            }
        }
    } catch (err) {
        log(`Error in Task Runner: ${err}`);
        console.error('Error in Task Runner:', err);
    }
};

const cronMatches = (expression: string, date: Date): boolean => {
    if (!expression) return false;
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) return false;

    const [min, hour, dom, month, dow] = parts;
    const curMin = date.getMinutes();
    const curHour = date.getHours();

    // Simple Parser for our supported formats
    const matchPart = (part: string, val: number): boolean => {
        if (part === '*') return true;
        if (part.startsWith('*/')) {
            const step = parseInt(part.substring(2));
            return val % step === 0;
        }
        if (part.includes('/')) {
            // S/I
            const [start, step] = part.split('/').map(Number);
            if (val < start) return false;
            return (val - start) % step === 0;
        }
        return parseInt(part) === val;
    };

    // Only checking Min and Hour for now as Recurrence handles others usually, 
    // but standard cron has DOM/DOW too.
    // Our UI only sets Min/Hour. The others are * * *.

    return matchPart(min, curMin) && matchPart(hour, curHour);
};

export const startTaskRunner = () => {
    // Run every minute
    cron.schedule('* * * * *', checkTasks);
    console.log('Task Runner Started');
};
