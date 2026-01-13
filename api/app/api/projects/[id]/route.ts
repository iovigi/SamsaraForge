import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
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

        const project = await Project.findOne({ _id: id, userId });
        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ project });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const project = await Project.findOneAndUpdate(
            { _id: id, userId },
            body,
            { new: true, runValidators: true }
        );

        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ project });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const project = await Project.findOneAndDelete({ _id: id, userId });

        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Project deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
