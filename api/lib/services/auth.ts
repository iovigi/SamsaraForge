import jwt from 'jsonwebtoken';
import dbConnect from '../db';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function verifyToken(req: Request) {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        await dbConnect();
        const user = await User.findById(decoded.userId).select('-password');
        return user;
    } catch (err) {
        console.error('Token verification error:', err);
        return null;
    }
}
