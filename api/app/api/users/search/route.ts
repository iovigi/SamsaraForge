import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
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

export async function GET(req: Request) {
    try {
        await dbConnect();
        const userId = await getUserFromRequest(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query || query.length < 3) {
            return NextResponse.json({ users: [] });
        }

        // Search by email or nickname
        const users = await User.find({
            $or: [
                { email: { $regex: query, $options: 'i' } },
                // { nickname: { $regex: query, $options: 'i' } } // Optional: strict email search might be better for privacy
            ]
        }).select('email nickname _id').limit(10);

        return NextResponse.json({ users });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
