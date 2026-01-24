
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TeamInvitation from '@/lib/models/TeamInvitation';
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

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // We accept userEmail as query param or extract from token if we stored it?
        // Token usually has userId. User model has email.
        // But invitation is sent to email. 
        // Ideally we should find user by ID then get email, or simple trust the client sends email? 
        // Use user email from DB.

        // This requires getting user email first.
        const User = (await import('@/lib/models/User')).default;
        const currentUser = await User.findById(user.userId);

        if (!currentUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const invitations = await TeamInvitation.find({
            email: currentUser.email,
            status: 'PENDING',
            expiresAt: { $gt: new Date() }
        })
            .populate('teamId', 'name')
            .populate('invitedBy', 'nickname email');

        return NextResponse.json({ invitations }, { status: 200 });
    } catch (error) {
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
