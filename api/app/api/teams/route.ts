
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

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const teams = await Team.find({
            'members.userId': user.userId
        }).populate('members.userId', 'name email nickname');

        return NextResponse.json({ teams }, { status: 200 });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { name, logoUrl } = await req.json();

        if (!name) {
            return NextResponse.json({ message: 'Team name is required' }, { status: 400 });
        }

        const newTeam = new Team({
            name,
            ownerId: user.userId,
            logoUrl: logoUrl || '',
            members: [{
                userId: user.userId,
                role: 'ADMIN',
                joinedAt: new Date()
            }]
        });

        await newTeam.save();

        return NextResponse.json({ team: newTeam }, { status: 201 });
    } catch (error) {
        console.error('Error creating team:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
