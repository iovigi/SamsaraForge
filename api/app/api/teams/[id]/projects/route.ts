import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/lib/models/Project';
import Team from '@/lib/models/Team';
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

        const { id } = await params; // Team ID

        // Check if user is member of team
        const team = await Team.findOne({
            _id: id,
            'members.userId': userId
        });

        if (!team) {
            return NextResponse.json({ message: 'Team not found or access denied' }, { status: 404 });
        }

        // Find projects linked to this team
        const projects = await Project.find({
            'teams.teamId': id
        }).sort({ createdAt: -1 });

        return NextResponse.json({ projects });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
