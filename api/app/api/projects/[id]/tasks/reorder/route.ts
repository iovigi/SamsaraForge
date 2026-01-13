import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProjectTask from '@/lib/models/ProjectTask';
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = getUserId(req);
        const { id: projectId } = await params;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { tasks } = body; // Expecting { tasks: [ { _id, status, order } ] }

        if (!tasks || !Array.isArray(tasks)) {
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        console.log(`[API] Reordering tasks for Project ${projectId}`);

        // Bulk write for efficiency
        const operations = tasks.map((task: any) => ({
            updateOne: {
                filter: { _id: task._id, projectId }, // Ensure task belongs to project
                update: { $set: { order: task.order, status: task.status } }
            }
        }));

        if (operations.length > 0) {
            await ProjectTask.bulkWrite(operations);
        }

        return NextResponse.json({ message: 'Tasks reordered successfully' });

    } catch (error: any) {
        console.error('Project Task Reorder Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
