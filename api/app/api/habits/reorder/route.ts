import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Habit from '@/lib/models/Habit';
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

export async function POST(req: Request) {
    try {
        await dbConnect();
        const userId = getUserId(req);

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { orderedIds } = body;

        console.log('[API] Reorder request body:', body);

        if (!orderedIds || !Array.isArray(orderedIds)) {
            console.error('[API] Invalid reorder data:', orderedIds);
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        // Bulk write for efficiency
        const operations = orderedIds.map((id: string, index: number) => ({
            updateOne: {
                filter: { _id: id, userId }, // Ensure user owns the habit
                update: { $set: { order: index } }
            }
        }));

        if (operations.length > 0) {
            await Habit.bulkWrite(operations);
        }

        return NextResponse.json({ message: 'Habits reordered successfully' });
    } catch (error: any) {
        console.error('Reorder error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
