
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Team from '@/lib/models/Team';
import TeamInvitation from '@/lib/models/TeamInvitation';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendTeamInvitationEmail } from '@/lib/services/emailService';
import { sendNotification } from '@/lib/services/notificationService';
import Subscription from '@/lib/models/Subscription';

const verifyToken = (req: NextRequest) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
        return null;
    }
};

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { email } = await req.json();
        const teamId = params.id;

        const team = await Team.findById(teamId).populate('members.userId', 'email');
        if (!team) {
            return NextResponse.json({ message: 'Team not found' }, { status: 404 });
        }

        // Check if inviter is member
        const inviterMember = team.members.find((m: any) => m.userId._id.toString() === user.userId);
        if (!inviterMember) {
            return NextResponse.json({ message: 'You are not a member of this team' }, { status: 403 });
        }

        // Check if inviter is admin (optional based on requirements, assuming admins invite)
        // Adjusting to requirement "The creator of the team can invite user in team" -> Admin/Owner
        if (inviterMember.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Only admins can invite members' }, { status: 403 });
        }

        // Retrieve inviter details to get the nickname/name
        const inviterUser = await User.findById(user.userId);
        const inviterName = inviterUser?.nickname || inviterUser?.email || 'A user';


        // Check if already member
        const existingMember = team.members.find((m: any) => m.userId.email === email);
        if (existingMember) {
            return NextResponse.json({ message: 'User is already a member' }, { status: 400 });
        }

        // Check for existing pending invite
        const existingInvite = await TeamInvitation.findOne({
            teamId,
            email,
            status: 'PENDING'
        });

        if (existingInvite) {
            return NextResponse.json({ message: 'User already has a pending invitation' }, { status: 400 });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const newInvite = new TeamInvitation({
            teamId,
            email,
            invitedBy: user.userId,
            token,
            expiresAt
        });

        await newInvite.save();

        // Create Database Notification if user exists
        const invitedUser = await User.findOne({ email });
        const userLang = invitedUser?.language || 'en';
        const notificationTitle = userLang === 'bg' ? 'Покана за екип' : 'Team Invitation';
        const notificationMessage = userLang === 'bg'
            ? `${inviterName} ви покани да се присъедините към ${team.name}`
            : `${inviterName} invited you to join ${team.name}`;

        if (invitedUser) {
            const Notification = (await import('@/lib/models/Notification')).default;
            await Notification.create({
                userId: invitedUser._id,
                title: notificationTitle,
                message: notificationMessage,
                type: 'team_invitation',
                link: `/teams?invite=${token}`,
                metadata: {
                    invitationId: newInvite._id,
                    teamId: team._id,
                    teamName: team.name,
                    inviterName: inviterName,
                    token: token
                }
            });
        }

        // Send Email
        // Construct accept link (pointing to frontend)
        // Assuming frontend is running on same domain or we can use generic URL
        // In local logic, usually referer or env var. For now assuming standard path.
        const origin = req.headers.get('origin') || 'http://localhost:3000';
        const acceptLink = `${origin}/teams?invite=${token}`;

        await sendTeamInvitationEmail(email, team.name, inviterName, acceptLink, userLang);

        // Send Push Notification if user exists and has subscription
        const userToNotify = await User.findOne({ email });
        if (userToNotify) {
            const subscriptions = await Subscription.find({ userId: userToNotify._id });
            const payload = {
                title: notificationTitle,
                body: notificationMessage,
                url: `/teams?invite=${token}` // Action URL
            };

            for (const sub of subscriptions) {
                await sendNotification(sub, payload);
            }
        }

        return NextResponse.json({ message: 'Invitation sent' }, { status: 200 });

    } catch (error) {
        console.error('Error sending invitation:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
