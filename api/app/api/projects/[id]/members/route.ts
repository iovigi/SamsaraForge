import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/lib/models/Project';
import User from '@/lib/models/User';
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

// GET members
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check access (Owner or Member) to view members
        const project = await Project.findOne({
            _id: id,
            $or: [
                { userId },
                { 'members.userId': userId }
            ]
        }).populate('members.userId', 'email nickname');

        if (!project) {
            return NextResponse.json({ message: 'Project not found or access denied' }, { status: 404 });
        }

        // Return Owner + Members
        // We might want to fetch owner details too
        const owner = await User.findById(project.userId).select('email nickname');

        return NextResponse.json({
            owner,
            members: project.members
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// POST add member
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ message: 'Email is required' }, { status: 400 });
        }

        // Only Owner can add members
        const project = await Project.findOne({ _id: id, userId });
        if (!project) {
            return NextResponse.json({ message: 'Project not found or unauthorized' }, { status: 404 });
        }

        // Find user by email
        const userToAdd = await User.findOne({ email });
        if (!userToAdd) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (userToAdd._id.toString() === userId) {
            return NextResponse.json({ message: 'Cannot add yourself as a member' }, { status: 400 });
        }

        // Check if already member
        const isMember = project.members.some((m: any) => m.userId.toString() === userToAdd._id.toString());
        if (isMember) {
            return NextResponse.json({ message: 'User is already a member' }, { status: 400 });
        }

        // Add member
        project.members.push({ userId: userToAdd._id, role: 'MEMBER' });
        await project.save();

        const populatedProject = await Project.findById(id).populate('members.userId', 'email nickname');

        return NextResponse.json({
            message: 'Member added',
            members: populatedProject.members
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// DELETE remove member
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const memberIdToRemove = searchParams.get('userId');

        if (!memberIdToRemove) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        // Check permissions:
        // 1. Owner can remove anyone (except maybe themselves via this route? usually delete project for that)
        // 2. Member can remove themselves (Leave project)

        const project = await Project.findOne({
            _id: id,
            $or: [
                { userId },
                { 'members.userId': userId }
            ]
        });

        if (!project) {
            return NextResponse.json({ message: 'Project not found or unauthorized' }, { status: 404 });
        }

        // Logic check
        const isOwner = project.userId.toString() === userId;
        const isSelf = userId === memberIdToRemove;

        if (!isOwner && !isSelf) {
            return NextResponse.json({ message: 'Unauthorized to remove this member' }, { status: 403 });
        }

        // Remove member
        project.members = project.members.filter((m: any) => m.userId.toString() !== memberIdToRemove);
        await project.save();

        return NextResponse.json({ message: 'Member removed', members: project.members });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
