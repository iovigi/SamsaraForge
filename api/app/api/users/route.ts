import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const checkAdmin = (req: Request) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        return decoded.isAdmin === true;
    } catch (err) {
        return false;
    }
};

export async function GET(req: Request) {
    try {
        await dbConnect();

        if (!checkAdmin(req)) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        return NextResponse.json(users, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
