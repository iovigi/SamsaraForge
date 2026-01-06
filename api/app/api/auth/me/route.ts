import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: Request) {
    try {
        await dbConnect();

        const authHeader = req.headers.get('Authorization');
        console.log('/api/auth/me called. Header:', authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let decoded: any;

        try {
            decoded = jwt.verify(token, JWT_SECRET);
            console.log('Token decoded:', decoded);
        } catch (err) {
            console.error('Token verification failed:', err);
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            console.log('User not found for ID:', decoded.userId);
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        console.log('User found:', user.email);
        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
