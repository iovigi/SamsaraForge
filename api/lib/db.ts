import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const opts = {
    bufferCommands: false,
  };
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI!, opts);
    console.log('MongoDB Connected!');
  } catch (e) {
    console.error("MongoDB Connection Error:", e);
    throw e;
  }
}

export default dbConnect;
