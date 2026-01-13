import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProjectTask from '@/lib/models/ProjectTask';
import Project from '@/lib/models/Project';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function getUserFromRequest(req: Request) {
    const authHeader = req.headers.get('Authorization');
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
}

// We need to verify that the task belongs to a project that belongs to the user.
// Optimization: We could just check if the task's project matches a project owned by user.

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, taskId: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id, taskId } = await params;

        // 1. Verify Project Ownership
        const project = await Project.findOne({ _id: id, userId });
        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        // 2. Update Task (Ensure it belongs to this project)
        const body = await req.json();
        const task = await ProjectTask.findOneAndUpdate(
            { _id: taskId, projectId: id },
            body,
            { new: true, runValidators: true }
        );

        if (!task) {
            return NextResponse.json({ message: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ task });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, taskId: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id, taskId } = await params;

        // 1. Verify Project Ownership
        const project = await Project.findOne({ _id: id, userId });
        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        const task = await ProjectTask.findOneAndDelete({ _id: taskId, projectId: id });

        if (!task) {
            return NextResponse.json({ message: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Task deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
