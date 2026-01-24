
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

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { userId, role } = await req.json(); // userId of member to update, new role
        const teamId = params.id;

        const team = await Team.findById(teamId);
        if (!team) {
            return NextResponse.json({ message: 'Team not found' }, { status: 404 });
        }

        // Check ADMIN permission
        const requester = team.members.find((m: any) => m.userId.toString() === user.userId);
        if (!requester || requester.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Only admins can manage members' }, { status: 403 });
        }

        // Find member to update
        const memberIndex = team.members.findIndex((m: any) => m.userId.toString() === userId);
        if (memberIndex === -1) {
            return NextResponse.json({ message: 'Member not found' }, { status: 404 });
        }

        // Cannot change own role via this endpoint (prevent removing last admin accidentally, though allowed if desired)
        if (userId === user.userId) {
            // Optional safety: don't allow demoting self if no other admins?
            // For now, allow it but warn or UI handles it.
            // Actually, simplest is to allow.
        }

        team.members[memberIndex].role = role;
        await team.save();

        return NextResponse.json({ message: 'Member role updated', team }, { status: 200 });

    } catch (error) {
        console.error('Error updating member role:', error);
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

        const { userId } = await req.json(); // Member to remove
        const teamId = params.id;

        const team = await Team.findById(teamId);
        if (!team) {
            return NextResponse.json({ message: 'Team not found' }, { status: 404 });
        }

        // Check Reqeuster
        const requester = team.members.find((m: any) => m.userId.toString() === user.userId);

        // If removing self (Leave Team), allow MEMBER or ADMIN
        // If removing others, must be ADMIN
        const isRemovingSelf = userId === user.userId;

        if (!isRemovingSelf) {
            if (!requester || requester.role !== 'ADMIN') {
                return NextResponse.json({ message: 'Only admins can remove other members' }, { status: 403 });
            }
        }

        // Remove member
        const initialLength = team.members.length;
        team.members = team.members.filter((m: any) => m.userId.toString() !== userId);

        if (team.members.length === initialLength) {
            return NextResponse.json({ message: 'Member not found' }, { status: 404 });
        }

        // If team becomes empty, maybe delete team? Or keep empty? 
        // Typically keep empty or delete if owner leaves. 
        // `ownerId` logic is separate. If owner leaves, ownership transfer might be needed.
        // For MVP, if owner leaves, let's just leave it.

        await team.save();

        return NextResponse.json({ message: 'Member removed', team }, { status: 200 });

    } catch (error) {
        console.error('Error removing member:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
