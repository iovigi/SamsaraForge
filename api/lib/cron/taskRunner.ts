import cron from 'node-cron';
import Task from '../models/Task';
import { sendNotification } from '../services/notificationService';
// We need a Subscription model to fetch subs. For now assuming we have a way to get subs.
// Actually, we likely need to store subscriptions in DB linked to User.

// Placeholder Subscription Model import (will implement next)
// import Subscription from '../models/Subscription';

const checkTasks = async () => {
    try {
        const now = new Date();
        const currentHeight = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDate();
        const currentWeekDay = now.getDay(); // 0-6

        // Find all TODO tasks
        // This is inefficient for large DBs, but fine for MVP.
        // We should populate user to get email/sub if needed, or query Subscription by userId.
        const tasks = await Task.find({ status: 'TODO' }).populate('userId');

        for (const task of tasks) {
            // Check TimeFrame
            if (task.timeFrame) {
                const [startH, startM] = task.timeFrame.start.split(':').map(Number);
                const [endH, endM] = task.timeFrame.end.split(':').map(Number);
                const nowMinutes = currentHeight * 60 + currentMinute;
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;

                if (nowMinutes < startMinutes || nowMinutes > endMinutes) {
                    continue; // Outside timeframe
                }
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

            if (cronMatches(task.reminderCron, now)) {
                // SEND NOTIFICATION
                console.log(`Sending notification for task: ${task.title}`);
                // Fetch subscription for user
                // const sub = await Subscription.findOne({ userId: task.userId._id });
                // if (sub) sendNotification(sub, { title: 'Task Reminder', body: task.title });
            }
        }
    } catch (err) {
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
