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

        let project = await Project.findOne({ _id: id })
            .populate('members.userId', 'nickname email')
            .populate('teams.teamId', 'name members'); // Populate needed fields

        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        const isOwner = project.userId.toString() === userId;
        const isMember = project.members.some((m: any) => m.userId?._id?.toString() === userId || m.userId?.toString() === userId);

        let isTeamMember = false;
        if (!isOwner && !isMember && project.teams && project.teams.length > 0) {
            // Check if user is in any of the teams
            // We populated teams.teamId, so we can access members
            // But Team model members might not be fully transparent here depending on populate depth.
            // Team model members is array of objects { userId, role }.
            // We populated 'teams.teamId' which is the Team document.
            // So project.teams[i].teamId.members should exist.

            for (const pt of project.teams) {
                if (pt.teamId && pt.teamId.members) {
                    const found = pt.teamId.members.some((tm: any) => tm.userId.toString() === userId);
                    if (found) {
                        isTeamMember = true;
                        break;
                    }
                }
            }
        }

        if (!isOwner && !isMember && !isTeamMember) {
            return NextResponse.json({ message: 'Access denied' }, { status: 403 });
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

        // Retrieve project first to check access
        const project = await Project.findById(id).populate('teams.teamId');

        if (!project) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        const isOwner = project.userId.toString() === userId;
        const isMember = project.members.some((m: any) => m.userId.toString() === userId);

        let isTeamMember = false;
        if (!isOwner && !isMember && project.teams && project.teams.length > 0) {
            for (const pt of project.teams) {
                if (pt.teamId && pt.teamId.members) {
                    const found = pt.teamId.members.some((tm: any) => tm.userId.toString() === userId);
                    if (found) {
                        isTeamMember = true;
                        break;
                    }
                }
            }
        }

        if (!isOwner && !isMember && !isTeamMember) {
            return NextResponse.json({ message: 'Access denied' }, { status: 403 });
        }

        const updatedProject = await Project.findByIdAndUpdate(id, body, { new: true, runValidators: true })
            .populate('teams.teamId', 'name');

        return NextResponse.json({ project: updatedProject });
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

        // Owner ONLY for delete
        const project = await Project.findOneAndDelete({ _id: id, userId });

        if (!project) {
            return NextResponse.json({ message: 'Project not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Project deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
