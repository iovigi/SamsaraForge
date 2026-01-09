import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Habit from '@/lib/models/Habit';
import { checkAndResetDailyHabits } from '@/lib/services/habitService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to get user ID from token
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

export async function GET(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Lazy Reset: Check if any daily habits need resetting for this user
        await checkAndResetDailyHabits(userId);

        const habits = await Habit.find({ userId }).sort({ createdAt: -1 });
        console.log('[API] GET /habits found:', habits.length, 'habits');
        if (habits.length > 0) {
            console.log('[API] Sample Habit 0 completionDates:', habits[0].completionDates);
            console.log('[API] Sample Habit 0 recurrence:', habits[0].recurrence);
        }
        return NextResponse.json({ habits }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const habit = await Habit.create({ ...body, userId });

        return NextResponse.json({ habit }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
