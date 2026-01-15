import cron from 'node-cron';
import Habit from '../models/Habit';
import { sendNotification } from '../services/notificationService';
import { sendEmail } from '../services/emailService';
import jwt from 'jsonwebtoken';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { quotes } from '../data/quotes';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'debug_cron.log');

const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    try {
        fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    } catch (e) {
        console.error('Failed to write to log file', e);
    }
    console.log(msg);
};

// Force model registration
if (!User) {
    log('User model not loaded!');
}

const cronMatches = (expression: string, date: Date): boolean => {
    if (!expression) return false;
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) return false;

    const [min, hour, dom, month, dow] = parts;
    const curMin = date.getMinutes();
    const curHour = date.getHours();

    const matchPart = (part: string, val: number): boolean => {
        if (part === '*') return true;
        if (part.startsWith('*/')) {
            const step = parseInt(part.substring(2));
            return val % step === 0;
        }
        if (part.includes('/')) {
            const [start, step] = part.split('/').map(Number);
            if (val < start) return false;
            return (val - start) % step === 0;
        }
        return parseInt(part) === val;
    };

    return matchPart(min, curMin) && matchPart(hour, curHour);
};

export const checkTasks = async () => {
    try {
        const now = new Date();
        const currentHeight = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDate();
        const currentWeekDay = now.getDay(); // 0-6

        const timeString = `${String(currentHeight).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        log(`[TaskRunner] Running Check at ${timeString}`);

        // --- QUOTE NOTIFICATIONS ---
        // Find users who want quotes NOW (Legacy exact match)
        const usersForQuotes = await User.find({
            quoteNotifications: true,
            quoteNotificationTime: timeString
        });

        // Interval based quote notifications
        const quoteUsers = await User.find({ quoteNotifications: true });

        for (const user of quoteUsers) {
            const lastSent = user.lastQuoteNotificationSentAt ? new Date(user.lastQuoteNotificationSentAt).getTime() : 0;
            const intervalMs = (user.quoteNotificationIntervalMin || 1440) * 60 * 1000;
            const timeSinceLast = now.getTime() - lastSent;

            if (timeSinceLast >= intervalMs) {
                const sendQuote = async () => {
                    const lang = (user.language || 'en') as keyof typeof quotes;
                    const userQuotes = quotes[lang];
                    const randomQuote = userQuotes[Math.floor(Math.random() * userQuotes.length)];

                    const subscriptions = await Subscription.find({ userId: user._id });
                    if (subscriptions.length > 0) {
                        const payload = {
                            title: lang === 'bg' ? 'Дневна Мотивация' : 'Daily Motivation',
                            body: `"${randomQuote.text}" - ${randomQuote.author}`,
                            icon: '/icon.png',
                            data: {
                                url: '/'
                            }
                        };

                        for (const sub of subscriptions) {
                            try {
                                await sendNotification(sub, payload);
                            } catch (error) {
                                console.error(`Failed to send quote push to user ${user._id}:`, error);
                            }
                        }
                    }

                    // Send Email if enabled
                    if (user.emailQuoteNotifications) {
                        console.log(`[TaskRunner] Sending quote email to ${user.email}`);
                        try {
                            const emailSubject = lang === 'bg' ? 'Дневна Мотивация' : 'Daily Motivation';
                            const emailText = `"${randomQuote.text}" - ${randomQuote.author}\n\nSamsara Forge`;
                            const emailHtml = `
                                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                                    <h2 style="color: #4A90E2;">${lang === 'bg' ? 'Дневна Мотивация' : 'Daily Motivation'}</h2>
                                    <blockquote style="font-size: 1.2em; font-style: italic; color: #555; border-left: 4px solid #4A90E2; padding-left: 15px; margin: 20px 0;">
                                        "${randomQuote.text}"
                                    </blockquote>
                                    <p style="font-weight: bold; color: #333;">- ${randomQuote.author}</p>
                                     <p style="font-size: 0.8em; color: #888; margin-top: 30px;">
                                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #888;">
                                            ${lang === 'bg' ? 'Настройки на известията' : 'Notification Settings'}
                                        </a>
                                    </p>
                                </div>
                            `;
                            await sendEmail({
                                to: user.email,
                                subject: emailSubject,
                                text: emailText,
                                html: emailHtml
                            });
                            log(`[TaskRunner] Quote email sent successfully to ${user.email}`);
                        } catch (error) {
                            log(`[TaskRunner] Failed to send quote email to ${user.email}: ${error}`);
                        }
                    } else {
                        log(`[TaskRunner] User ${user.email} has email quote notifications disabled.`);
                    }

                    // Update last sent time
                    user.lastQuoteNotificationSentAt = now;
                    await user.save();
                };
                await sendQuote();
            }
        }
        // ---------------------------

        // DAILY RESET LOGIC
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const tasksToReset = await Habit.find({
            status: 'DONE',
            recurrence: { $in: ['DAILY', 'WEEKLY', 'MONTHLY'] },
            lastCompletedAt: { $lt: startOfToday }
        });

        if (tasksToReset.length > 0) {
            log(`[TaskRunner] Found ${tasksToReset.length} habits to potentially reset.`);
            for (const task of tasksToReset) {
                let shouldReset = false;

                if (task.recurrence === 'DAILY') {
                    shouldReset = true;
                } else if (task.recurrence === 'WEEKLY') {
                    if (task.weekDays && task.weekDays.includes(currentWeekDay)) {
                        shouldReset = true;
                    }
                } else if (task.recurrence === 'MONTHLY') {
                    if (task.monthDay === currentDay) {
                        shouldReset = true;
                    }
                }

                if (shouldReset) {
                    task.status = 'TODO';
                    await task.save();
                    log(`[Daily Reset] Reset Task "${task.title}" to TODO.`);
                }
            }
        }

        const tasks = await Habit.find({
            $or: [{ status: 'TODO' }, { status: 'DONE' }]
        }).populate('userId');

        // log(`[TaskRunner] Found ${tasks.length} active tasks to check.`);

        for (const task of tasks) {
            // Recurrence Matching
            let recurrenceMatch = false;
            // Simplified Recurrence Check Logic
            if (task.recurrence === 'ONCE') {
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

            // Timeframe Reset Logic
            const [endH, endM] = task.timeFrame && task.timeFrame.end ? task.timeFrame.end.split(':').map(Number) : [23, 59];
            const endMinutes = endH * 60 + endM;
            const nowMinutes = currentHeight * 60 + currentMinute;

            if (nowMinutes > endMinutes && task.recurrence !== 'ONCE') {
                if (task.status !== 'DONE') {
                    log(`[Timeframe Reset] Task ${task.title} MISSED. Resetting.`);
                    task.status = 'TODO';
                    task.streak = 0;
                    await task.save();
                }
                continue;
            }

            // Timeframe Validity Check for Notifications
            let isWithinTimeframe = true;
            if (task.timeFrame) {
                if (nowMinutes > endMinutes) isWithinTimeframe = false;
            }

            // Send Notification Logic
            if (task.status !== 'DONE' && isWithinTimeframe && cronMatches(task.reminderCron, now) && task.notify !== false) {
                log(`Cron matched for ${task.title}! Sending notification...`);

                // Push Notifications
                const subs = await Subscription.find({ userId: task.userId._id });
                if (subs.length > 0) {
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
                            url: `/habits?openTask=${task._id}`,
                            snoozeToken
                        },
                        actions: [
                            { action: 'snooze', title: 'Snooze 30m' }
                        ]
                    };
                    for (const sub of subs) {
                        await sendNotification(sub, payload);
                    }
                }

                // Email Notifications
                if (task.userId.emailNotifications) {
                    log(`[TaskRunner] User ${task.userId.email} has email reminders enabled. Sending...`);
                    try {
                        const userLang = task.userId.language || 'en';
                        const subject = userLang === 'bg' ? `Напомняне: ${task.title}` : `Reminder: ${task.title}`;
                        const text = userLang === 'bg'
                            ? `Време е за вашия навик: ${task.title}`
                            : `It's time for your habit: ${task.title}`;
                        const html = `
                             <div style="font-family: Arial, sans-serif; padding: 20px;">
                                 <h2 style="color: #2ECC71;">${userLang === 'bg' ? 'Напомняне за Навик' : 'Habit Reminder'}</h2>
                                 <p style="font-size: 1.1em;">
                                     ${userLang === 'bg' ? 'Време е за:' : 'It\'s time for:'} <strong>${task.title}</strong>
                                 </p>
                                 ${task.description ? `<p><em>${task.description}</em></p>` : ''}
                                 <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #2ECC71; color: white; text-decoration: none; border-radius: 5px;">
                                     ${userLang === 'bg' ? 'Отвори Пътя' : 'Open Dashboard'}
                                 </a>
                             </div>
                         `;

                        await sendEmail({
                            to: task.userId.email,
                            subject: subject,
                            text: text,
                            html: html
                        });
                        log(`[TaskRunner] Reminder email sent successfully to ${task.userId.email}`);
                    } catch (emailError) {
                        log(`[TaskRunner] Failed to send reminder email to ${task.userId.email}: ${emailError}`);
                    }
                } else {
                    log(`[TaskRunner] User ${task.userId.email} has email reminders disabled.`);
                }
            }
        }
    } catch (err) {
        log(`Error in Task Runner: ${err}`);
        log(`Error in Task Runner: ${err}`);
    }
};

export const startTaskRunner = () => {
    cron.schedule('* * * * *', checkTasks);
    console.log('Task Runner Started');
};
