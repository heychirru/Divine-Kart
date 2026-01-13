import dotenv from 'dotenv';
import { Resend } from 'resend';
dotenv.config()

let resend;

if(!process.env.RESEND_API){
    console.warn("⚠️ RESEND_API not found in .env file - Email functionality will be disabled")
} else {
    resend = new Resend(process.env.RESEND_API);
}

const sendEmail = async({sendTo, subject, html })=>{
    try {
        if (!resend) {
            console.error("❌ Resend is not configured. Add RESEND_API to your .env file");
            return null;
        }

        // Use configurable from address or fallback to Resend's default domain
        // For development, use onboarding@resend.dev (Resend's default)
        // For production, set RESEND_FROM_EMAIL in .env (e.g., "DivineKart <noreply@yourdomain.com>")
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'DivineKart <onboarding@resend.dev>';

        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: sendTo,
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("❌ Resend email error:", error);
            // If domain verification error, provide helpful message
            if (error.message && error.message.includes('domain is not verified')) {
                console.error("💡 Tip: Use 'onboarding@resend.dev' for testing, or verify your domain at https://resend.com/domains");
            }
            return null;
        }

        return data
    } catch (error) {
        console.error("❌ Email sending failed:", error);
        return null;
    }
}

export default sendEmail