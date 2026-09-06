const loginOtpTemplate = ({ name, otp }) => {
    return `
<div>
    <p>Dear, ${name}</p>
    <p>You requested to sign in to DivineKart. Use the following OTP to complete your login.</p>
    <div style="background:#f0f4ff; font-size:28px; padding:20px; text-align:center; font-weight:800; letter-spacing:10px; border-radius:8px;">
        ${otp}
    </div>
    <p>This OTP is valid for <strong>10 minutes</strong> only. Do not share it with anyone.</p>
    <br/>
    <p>If you did not request this, please ignore this email.</p>
    <br/>
    <p>Thanks,</p>
    <p>DivineKart Team</p>
</div>
    `
}

export default loginOtpTemplate
