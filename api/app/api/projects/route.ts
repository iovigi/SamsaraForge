import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/lib/models/Project';
import Team from '@/lib/models/Team';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to get user from token
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

export async function GET(req: Request) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Find projects where:
        // 1. User is owner (userId)
        // 2. User is a direct member (members.userId)
        // 3. User is a member of an assigned team (teams.teamId -> Team.members.userId)

        // This is complex to do in a single simple query without aggregation or separate lookups if Team members aren't denormalized.
        // We can do an aggregation or find user's teams first.

        // Step 1: Find all teams user belongs to
        const Team = mongoose.models.Team || mongoose.model('Team');
        // We need to import Team model properly potentially if not already loaded, but dbConnect should handle models usually if registered.
        // Best practice: Import it or rely on existing registration. 
        // Let's assume Team model is registered because we use it elsewhere or do a dynamic import if needed.
        // Actually best to query Project directly if possible, but 'teams.teamId' refers to a Team doc.
        // We can find all projects where 'teams.teamId' is IN [list of user's team IDs].

        const userTeams = await Team.find({ 'members.userId': userId }).select('_id');
        const userTeamIds = userTeams.map((t: any) => t._id);

        const projects = await Project.find({
            $or: [
                { userId },
                { 'members.userId': userId },
                { 'teams.teamId': { $in: userTeamIds } }
            ]
        }).sort({ createdAt: -1 })
            .populate('teams.teamId', 'name'); // Useful to show team info

        return NextResponse.json({ projects });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const project = await Project.create({
            ...body,
            userId,
        });

        return NextResponse.json({ project }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
