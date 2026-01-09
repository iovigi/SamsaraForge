import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Habit from '@/lib/models/Habit';
import User from '@/lib/models/User';
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        const { id } = await params;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ message: 'Text is required' }, { status: 400 });
        }

        // Fetch user to get email/nickname
        const user = await User.findById(userId);
        const authorLabel = user ? (user.nickname || user.email || 'Anonymous') : 'Anonymous';

        const updatedHabit = await Habit.findOneAndUpdate(
            { _id: id, userId },
            {
                $push: {
                    comments: {
                        text,
                        createdAt: new Date(),
                        authorEmail: authorLabel
                    }
                }
            },
            { new: true }
        );

        if (!updatedHabit) {
            return NextResponse.json({ message: 'Habit not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Comment added', habit: updatedHabit }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
