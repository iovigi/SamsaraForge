import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Habit from '@/lib/models/Habit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const getUserId = (req: Request) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch (err) {
        return null;
    }
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        const { id } = await params;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        console.log('PUT Habit Body:', body);

        // Habit Logic: Check for completion
        if (body.status === 'DONE') {
            const currentHabit = await Habit.findOne({ _id: id, userId });
            if (currentHabit) {
                const now = new Date();
                const lastCompleted = currentHabit.lastCompletedAt ? new Date(currentHabit.lastCompletedAt) : null;
                const isSameDay = lastCompleted &&
                    lastCompleted.getDate() === now.getDate() &&
                    lastCompleted.getMonth() === now.getMonth() &&
                    lastCompleted.getFullYear() === now.getFullYear();

                // Always record the completion in history (counts as a Victory)
                const completionTime = new Date();
                await Habit.updateOne({ _id: id }, { $push: { completionDates: completionTime } });
                body.lastCompletedAt = completionTime;
                console.log(`[API] Habit ${id} completed. Added to history.`);

                if (!isSameDay) {
                    // Only increment streak if NOT 'ONCE'
                    if (currentHabit.recurrence !== 'ONCE') {
                        body.streak = (currentHabit.streak || 0) + 1;
                        console.log(`[API] Habit ${id} streak incremented to ${body.streak}`);
                    }
                } else {
                    body.streak = currentHabit.streak;
                    console.log(`[API] Habit ${id} isSameDay. Streak kept at ${body.streak}`);
                }
            }
        }

        const habit = await Habit.findOneAndUpdate(
            { _id: id, userId },
            body,
            { new: true, runValidators: true }
        );

        if (!habit) {
            return NextResponse.json({ message: 'Habit not found' }, { status: 404 });
        }

        return NextResponse.json({ habit }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        const { id } = await params;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const habit = await Habit.findOneAndDelete({ _id: id, userId });

        if (!habit) {
            return NextResponse.json({ message: 'Habit not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Habit deleted successfully' }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
