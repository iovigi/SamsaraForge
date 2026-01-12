
import { NextResponse } from 'next/server';
import { checkTasks } from '@/lib/cron/taskRunner';

// Prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[API/Cron] Manual trigger received');
        await checkTasks();
        return NextResponse.json({ success: true, message: 'Tasks checked successfully' });
    } catch (error) {
        console.error('[API/Cron] Error triggering tasks:', error);
        return NextResponse.json({ success: false, error: 'Failed to check tasks' }, { status: 500 });
    }
}
