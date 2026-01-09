import Habit from '../models/Habit';

export const checkAndResetDailyHabits = async (userId: string) => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentWeekDay = now.getDay(); // 0-6
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find recurring tasks for this user that are DONE but might need reset
    // This query finds habits that are DONE and were last completed BEFORE today.
    const tasksToReset = await Habit.find({
        userId,
        status: 'DONE',
        recurrence: { $in: ['DAILY', 'WEEKLY', 'MONTHLY'] },
        lastCompletedAt: { $lt: startOfToday }
    });

    if (tasksToReset.length > 0) {
        console.log(`[HabitService] Found ${tasksToReset.length} habits to potentially reset for user ${userId}.`);

        for (const task of tasksToReset) {
            let shouldReset = false;

            if (task.recurrence === 'DAILY') {
                shouldReset = true;
            } else if (task.recurrence === 'WEEKLY') {
                // Check if today matches one of the weekDays
                if (task.weekDays && task.weekDays.includes(currentWeekDay)) {
                    shouldReset = true;
                }
            } else if (task.recurrence === 'MONTHLY') {
                // Check if today matches monthDay
                if (task.monthDay === currentDay) {
                    shouldReset = true;
                }
            }

            if (shouldReset) {
                task.status = 'TODO';
                await task.save();
                console.log(`[HabitService] Reset Habit "${task.title}" to TODO.`);
            }
        }
    }
};
