
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Team from '@/lib/models/Team';
import jwt from 'jsonwebtoken';

const verifyToken = (req: NextRequest) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
        return null;
    }
};

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const team = await Team.findById(params.id)
            .populate('members.userId', 'email nickname _id')
            .populate('ownerId', 'email nickname');

        if (!team) {
            return NextResponse.json({ message: 'Team not found' }, { status: 404 });
        }

        // Check if user is member
        const isMember = team.members.some((m: any) => m.userId._id.toString() === user.userId);
        if (!isMember) {
            return NextResponse.json({ message: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ team }, { status: 200 });
    } catch (error) {
        console.error('Error fetching team:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }


        const { name, logoUrl } = await req.json();
        const team = await Team.findById(params.id);

        if (!team) {
            return NextResponse.json({ message: 'Team not found' }, { status: 404 });
        }

        // Check ADMIN permission
        const member = team.members.find((m: any) => m.userId.toString() === user.userId);
        if (!member || member.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Only admins can edit team' }, { status: 403 });
        }

        team.name = name || team.name;
        if (logoUrl !== undefined) team.logoUrl = logoUrl;
        await team.save();

        return NextResponse.json({ team }, { status: 200 });

    } catch (error) {
        console.error('Error updating team:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const team = await Team.findById(params.id);

        if (!team) {
            return NextResponse.json({ message: 'Team not found' }, { status: 404 });
        }

        // Check ADMIN permission
        const member = team.members.find((m: any) => m.userId.toString() === user.userId);
        if (!member || member.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Only admins can delete team' }, { status: 403 });
        }

        await Team.findByIdAndDelete(params.id);

        // Ensure to remove related data if necessary (invitations, etc.) - skipping for now as not critical path for MVP

        return NextResponse.json({ message: 'Team deleted' }, { status: 200 });

    } catch (error) {
        console.error('Error deleting team:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
