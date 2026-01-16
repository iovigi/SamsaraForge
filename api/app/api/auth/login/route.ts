import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (user.isBlocked) {
            return NextResponse.json(
                { message: 'Your account has been blocked. Please contact support.' },
                { status: 403 }
            );
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const accessToken = jwt.sign({ userId: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, {
            expiresIn: '15m',
        });

        const refreshToken = jwt.sign({ userId: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, {
            expiresIn: '7d',
        });

        return NextResponse.json({ accessToken, refreshToken, message: 'Login successful' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
