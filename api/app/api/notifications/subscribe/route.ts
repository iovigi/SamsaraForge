import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Subscription from '@/lib/models/Subscription';
import jwt from 'jsonwebtoken';

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

export async function POST(req: NextRequest) {
    try {
        const userId = await authenticate(req);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { subscription } = body;

        await mongoose.connect(process.env.MONGODB_URI as string);

        await Subscription.findOneAndUpdate(
            { 'keys.auth': subscription.keys.auth },
            {
                userId: userId,
                endpoint: subscription.endpoint,
                keys: subscription.keys
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Subscription error', error);
        return NextResponse.json({ success: false, error: 'Failed to subscribe' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = await authenticate(req);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { subscription } = body;

        // If no subscription provided, maybe remove all for user? No, better be specific.
        if (!subscription || !subscription.keys || !subscription.keys.auth) {
            return NextResponse.json({ success: false, error: 'Subscription data required' }, { status: 400 });
        }

        await mongoose.connect(process.env.MONGODB_URI as string);

        await Subscription.findOneAndDelete({
            userId: userId,
            'keys.auth': subscription.keys.auth
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unsubscribe error', error);
        return NextResponse.json({ success: false, error: 'Failed to unsubscribe' }, { status: 500 });
    }
}
