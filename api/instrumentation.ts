export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startTaskRunner } = await import('./lib/cron/taskRunner');
        await import('./lib/db'); // Ensure DB connection if needed, or runner handles it
        // Actually TaskRunner uses Task model which uses mongoose. 
        // We might need to ensure connection. 
        // Let's assume standard mongoose connection is handled via lib/db or similar.

        // Connect DB if not connected
        const mongoose = await import('mongoose');
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI as string);
        }

        startTaskRunner();
    }
}
