import { NextResponse } from 'next/server';
import { connectToDB } from '../../../../../lib/db';
import ProjectTask from '../../../../../lib/models/ProjectTask';
import { verifyToken } from '../../../../../lib/services/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDB();
        const user = await verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params; // projectId
        const { tasks } = await req.json(); // Array of { _id, status, order }

        if (!tasks || !Array.isArray(tasks)) {
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        const operations = tasks.map((task: any) => ({
            updateOne: {
                filter: { _id: task._id, projectId: id },
                update: { $set: { status: task.status, order: task.order } }
            }
        }));

        if (operations.length > 0) {
            await ProjectTask.bulkWrite(operations);
        }

        return NextResponse.json({ message: 'Tasks reordered successfully' });
    } catch (error) {
        console.error('Task reorder error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
