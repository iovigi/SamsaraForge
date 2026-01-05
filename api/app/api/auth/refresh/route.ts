import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
    try {
        const { refreshToken } = await req.json();

        if (!refreshToken) {
            return NextResponse.json({ message: 'Refresh token required' }, { status: 401 });
        }

        try {
            // Verify Refresh Token
            const decoded: any = jwt.verify(refreshToken, JWT_SECRET);

            // Generate NEW Access Token
            const accessToken = jwt.sign({ userId: decoded.userId, email: decoded.email }, JWT_SECRET, {
                expiresIn: '15m',
            });

            return NextResponse.json({ accessToken });
        } catch (err) {
            return NextResponse.json({ message: 'Invalid refresh token' }, { status: 403 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
