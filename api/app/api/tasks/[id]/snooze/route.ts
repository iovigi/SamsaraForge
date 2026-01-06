
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ message: 'Token required' }, { status: 400 });
        }

        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            if (decoded.taskId !== id || decoded.action !== 'snooze') {
                return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
            }
        } catch (err) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        // Token is valid, perform snooze (30 mins)
        const task = await Task.findById(id);
        if (!task) {
            return NextResponse.json({ message: 'Task not found' }, { status: 404 });
        }

        // Set snoozeUntil to 30 mins from now
        const snoozeTime = new Date(Date.now() + 30 * 60 * 1000);
        task.snoozeUntil = snoozeTime;
        await task.save();

        console.log(`Task ${id} snoozed until ${snoozeTime.toISOString()}`);

        return NextResponse.json({ message: 'Snoozed successfully', snoozeUntil: snoozeTime }, { status: 200 });

    } catch (error: any) {
        console.error('Snooze Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
