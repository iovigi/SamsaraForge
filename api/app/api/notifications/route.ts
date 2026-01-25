import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Notification from '@/lib/models/Notification';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function authenticate(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.userId;
    } catch (error) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const userId = await authenticate(req);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const all = url.searchParams.get('all') === 'true';

        const query: any = { userId };
        if (!all) {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json({ success: true, notifications });
    } catch (error) {
        console.error('Fetch notifications error', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = await authenticate(req);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { notificationIds, all } = body;

        await dbConnect();

        if (all) {
            await Notification.updateMany(
                { userId, isRead: false },
                { isRead: true }
            );
        } else if (notificationIds && Array.isArray(notificationIds)) {
            await Notification.updateMany(
                { _id: { $in: notificationIds }, userId },
                { isRead: true }
            );
        } else {
            return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update notifications error', error);
        return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 });
    }
}
