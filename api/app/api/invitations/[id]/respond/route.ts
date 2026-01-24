
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TeamInvitation from '@/lib/models/TeamInvitation';
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

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { accept } = await req.json(); // true = accept, false = reject
        const inviteId = params.id; // This is the id or token? Path matches [id], so likely _id of invitation. 
        // Could also lookup by token if passed. Assuming ID for secured API call.

        const invitation = await TeamInvitation.findById(inviteId);
        if (!invitation) {
            return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
        }

        if (invitation.status !== 'PENDING') {
            return NextResponse.json({ message: 'Invitation already responded to' }, { status: 400 });
        }

        if (invitation.expiresAt < new Date()) {
            return NextResponse.json({ message: 'Invitation expired' }, { status: 400 });
        }

        // Verify the user responding matches the email
        // Fetch current user email
        const User = (await import('@/lib/models/User')).default;
        const currentUser = await User.findById(user.userId);

        if (!currentUser || currentUser.email !== invitation.email) {
            return NextResponse.json({ message: 'This invitation is not for you' }, { status: 403 });
        }

        if (accept) {
            // Add to team
            const team = await Team.findById(invitation.teamId);
            if (!team) {
                return NextResponse.json({ message: 'Team no longer exists' }, { status: 404 });
            }

            // Check if already in
            const isMember = team.members.some((m: any) => m.userId.toString() === user.userId);
            if (!isMember) {
                team.members.push({
                    userId: user.userId,
                    role: invitation.role,
                    joinedAt: new Date()
                });
                await team.save();
            }

            invitation.status = 'ACCEPTED';
        } else {
            invitation.status = 'REJECTED';
        }

        await invitation.save();

        return NextResponse.json({ message: accept ? 'Invitation accepted' : 'Invitation rejected' }, { status: 200 });

    } catch (error) {
        console.error('Error responding to invitation:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
