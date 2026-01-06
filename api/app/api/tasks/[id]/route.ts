import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
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
        console.log('PUT Task Body:', body);

        // Habit Logic: Check for completion
        if (body.status === 'DONE') {
            const currentTask = await Task.findOne({ _id: id, userId });
            if (currentTask && currentTask.recurrence !== 'ONCE') {
                const now = new Date();
                const lastCompleted = currentTask.lastCompletedAt ? new Date(currentTask.lastCompletedAt) : null;
                const isSameDay = lastCompleted &&
                    lastCompleted.getDate() === now.getDate() &&
                    lastCompleted.getMonth() === now.getMonth() &&
                    lastCompleted.getFullYear() === now.getFullYear();

                if (!isSameDay) {
                    body.streak = (currentTask.streak || 0) + 1;
                    body.lastCompletedAt = now;
                } else {
                    // Already completed today, don't increment, but keep lastCompletedAt if passed?
                    // actually if body has lastCompletedAt we might overwrite.
                    // Let's ensure we don't accidentally reset it if frontend sends junk.
                    // But typically frontend sends whole object.
                    // We should strictly handle streak on backend.
                    body.streak = currentTask.streak; // Keep existing
                    body.lastCompletedAt = currentTask.lastCompletedAt; // Keep existing
                }
            }
        }

        const task = await Task.findOneAndUpdate(
            { _id: id, userId },
            body,
            { new: true, runValidators: true }
        );

        if (!task) {
            return NextResponse.json({ message: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ task }, { status: 200 });
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

        const task = await Task.findOneAndDelete({ _id: id, userId });

        if (!task) {
            return NextResponse.json({ message: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
