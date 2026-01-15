import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, code, newPassword } = await req.json();

        if (!email || !code || !newPassword) {
            return NextResponse.json({ message: 'Email, code, and new password are required' }, { status: 400 });
        }

        const user = await User.findOne({
            email,
            resetCode: code,
            resetCodeExpires: { $gt: Date.now() } // Check if not expired
        });

        if (!user) {
            return NextResponse.json({ message: 'Invalid or expired reset code' }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;
        await user.save();

        return NextResponse.json({ message: 'Password reset successful' }, { status: 200 });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
