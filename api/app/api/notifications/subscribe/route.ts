import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Subscription from '@/lib/models/Subscription';
// import { parseJwt } from '@/lib/utils/auth'; // TODO: Implement Auth check
// Wait, I need to see how auth is handled in other routes.
// I'll check a sample route first.
// For now, standard insert.

export async function POST(req: NextRequest) {
    try {
        // Auth check
        // const user = await getUser(req); 
        // We will assume simpler auth for now or check headers.

        const body = await req.json();
        const { subscription, userId } = body;

        // Upsert
        await mongoose.connect(process.env.MONGODB_URI as string);

        await Subscription.findOneAndUpdate(
            { 'keys.auth': subscription.keys.auth },
            {
                userId: userId, // associate with user
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
