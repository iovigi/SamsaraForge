import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 30000,
});

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.GMAIL_EMAIL,
            to,
            subject,
            text,
            html,
        });
        console.log("Message sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email: ", error);
        return { success: false, error };
    }
};

export const sendTeamInvitationEmail = async (email: string, teamName: string, inviterName: string, acceptLink: string) => {
    const subject = `Invitation to join team ${teamName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>You've been invited!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the team <strong>${teamName}</strong> on Samsara Forge.</p>
            <p>Click the button below to accept the invitation:</p>
            <div style="margin: 25px 0;">
                <a href="${acceptLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${acceptLink}">${acceptLink}</a></p>
            <p style="font-size: 12px; color: #777; margin-top: 30px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    `;
    const text = `${inviterName} has invited you to join the team ${teamName}. Go to ${acceptLink} to accept.`;

    return sendEmail({ to: email, subject, text, html });
};
