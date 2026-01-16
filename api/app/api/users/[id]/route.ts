import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

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

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        if (!checkAdmin(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        const user = await User.findById(params.id, '-password');
        if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        return NextResponse.json(user);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        console.log(`[PUT] /api/users/${params.id} called`);

        if (!checkAdmin(req)) {
            console.log('[PUT] checkAdmin failed');
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        console.log('[PUT] Body:', body);

        const updateData: any = {};

        if (body.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(body.password, salt);
        }
        if (typeof body.isBlocked !== 'undefined') updateData.isBlocked = body.isBlocked;
        if (typeof body.isAdmin !== 'undefined') updateData.isAdmin = body.isAdmin;
        if (body.nickname) updateData.nickname = body.nickname;
        if (body.email) updateData.email = body.email;

        console.log(`[PUT] Updating user ${params.id} with data:`, updateData);

        const user = await User.findByIdAndUpdate(params.id, updateData, { new: true, runValidators: true }).select('-password');

        if (!user) {
            console.log(`[PUT] User ${params.id} not found in DB`);
            // Debug: check valid ID
            const isValidId = mongoose.isValidObjectId(params.id);
            console.log(`[PUT] Is valid ObjectId? ${isValidId}`);
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        console.log('[PUT] Update successful');
        return NextResponse.json(user);
    } catch (error: any) {
        console.error('[PUT] Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        console.log(`[DELETE] /api/users/${params.id} called`);

        if (!checkAdmin(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        const user = await User.findByIdAndDelete(params.id);
        if (!user) {
            console.log(`[DELETE] User ${params.id} not found`);
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        console.log('[DELETE] User deleted');
        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('[DELETE] Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
