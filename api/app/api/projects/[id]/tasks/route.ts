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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify project existence and ownership
        const project = await Project.findOne({ _id: id, userId });
        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        const tasks = await ProjectTask.find({ projectId: id }).sort({ order: 1, createdAt: -1 });
        return NextResponse.json({ tasks });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify project existence and ownership
        const project = await Project.findOne({ _id: id, userId });
        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        const body = await req.json();
        const task = await ProjectTask.create({
            ...body,
            projectId: id,
        });

        return NextResponse.json({ task }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
