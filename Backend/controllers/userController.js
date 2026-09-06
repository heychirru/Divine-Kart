import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import sendEmail from '../config/sendmail.js';
import User from "../models/userModel.js";
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js';
import generatedAccessToken from '../utils/generatedAccessToken.js';
import generatedOtp from '../utils/generatedOtp.js';
import loginOtpTemplate from '../utils/loginOtpTemplate.js';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRE = '48h';

const generateToken = (userId) =>
    jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRE })



// In-memory store for pending registrations and email updates
const pendingRegistrations = new Map();

// Helper to get redis key
const getRegKey = (email) => `reg_pending:${email}`;

// DEPRECATED: Standard registration is now handled via Unified Auth (SIOS) in sendLoginOtp
export async function sendRegisterOtp(req, res) {
    return res.status(410).json({ success: false, message: "This endpoint is deprecated. Use /send-login-otp for both sign-in and sign-up." });
}

export async function verifyRegisterOtp(req, res) {
    return res.status(410).json({ success: false, message: "This endpoint is deprecated. Use /verify-login-otp for both sign-in and sign-up." });
}

// Send login OTP to user email or phone (Unified Sign-In or Sign-Up)
export async function sendLoginOtp(req, res) {
    const { email, phone } = req.body;
    const identifier = email ? email.trim().toLowerCase() : String(phone).trim();
    const query = email ? { email: identifier } : { phone: identifier };

    try {
        const user = await User.findOne(query);
        const otp = String(generatedOtp()); // 6-digit OTP, consistent with forgotPasswordController
        const ttl = 10 * 60; // 10 minutes

        if (user) {
            // Existing User: Update record
            await User.findByIdAndUpdate(user._id, {
                loginOtp: otp,
                loginOtpExpiry: new Date(Date.now() + ttl * 1000),
            });
        } else {
            // New User: Store in memory until OTP is verified
            const key = getRegKey(identifier);
            pendingRegistrations.set(key, { otp, expiry: new Date(Date.now() + ttl * 1000) });
        }

        // Send OTP via email if identifier is email or user has email
        const targetEmail = email || (user?.email);
        if (targetEmail) {
            await sendEmail({
                sendTo: targetEmail,
                subject: "Your DivineKart OTP",
                html: loginOtpTemplate({ name: user?.name || "Customer", otp }),
            });
        }

        // LOG FOR TESTING (Temporary until SMS implementation)
        console.log('------------------------------------');
        console.log(`[AUTH] OTP for ${identifier}: ${otp}`);
        console.log('------------------------------------');

        return res.json({
            success: true,
            message: `OTP sent successfully to your registered ${targetEmail ? 'email' : 'contact'}`,
        });
    } catch (error) {
        console.error("[sendLoginOtp] Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

// Verify login OTP and issue JWT (Unified - handles Auto-Registration)
export async function verifyLoginOtp(req, res) {
    const { email, phone, otp } = req.body;
    const identifier = email ? email.trim().toLowerCase() : String(phone).trim();
    const query = email ? { email: identifier } : { phone: identifier };

    try {
        let user = await User.findOne(query);
        
        if (user) {
            // Case 1: Existing User
            if (!user.loginOtp || !user.loginOtpExpiry || new Date() > new Date(user.loginOtpExpiry)) {
                return res.status(400).json({ success: false, message: "OTP expired or not requested" });
            }
            if (otp !== user.loginOtp) {
                return res.status(400).json({ success: false, message: "Invalid OTP" });
            }
            // Clear OTP
            await User.findByIdAndUpdate(user._id, { loginOtp: null, loginOtpExpiry: null });
        } else {
            // Case 2: New User (Auto-Registration)
            let pending = null;
            const key = getRegKey(identifier);
            pending = pendingRegistrations.get(key);
            if (pending && new Date() > pending.expiry) {
                pendingRegistrations.delete(key);
                pending = null;
            }

            if (!pending || otp !== pending.otp) {
                return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
            }

            // Create User — omit email entirely for phone-only users (sparse index handles uniqueness)
            user = await User.create({
                name: "New User",
                ...(email ? { email: identifier } : {}),
                phone: phone ? identifier : undefined,
                password: 'OTP_AUTH_' + Date.now(),
                role: 'user'
            });

            // Cleanup
            pendingRegistrations.delete(getRegKey(identifier));
        }

        const token = generateToken(user._id);
        return res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
        });
    } catch (error) {
        console.error("[verifyLoginOtp] Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}


//update user details
export async function updateUserDetails(request, response) {
    try {
        const userId = request.userId //auth middleware
        const { name, email, phone, password } = request.body

        let hashPassword = ""

        if (password) {
            const salt = await bcryptjs.genSalt(10)
            hashPassword = await bcryptjs.hash(password, salt)
        }

        const updateUser = await User.updateOne({ _id: userId }, {
            ...(name && { name: name }),
            ...(email && { email: email }),
            ...(phone && { phone: phone }),
            ...(password && { password: hashPassword })
        })

        return response.json({
            message: "Updated successfully",
            error: false,
            success: true,
            data: updateUser
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//forgot password not login
export async function forgotPasswordController(request, response) {
    try {
        const { email } = request.body

        const user = await User.findOne({ email })

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        const rawOtp = String(generatedOtp());
        const expireTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

        // Store hashed OTP — never store OTPs in plaintext
        const salt = await bcryptjs.genSalt(10);
        const hashedOtp = await bcryptjs.hash(rawOtp, salt);

        await User.findByIdAndUpdate(user._id, {
            forgotPasswordOtp: hashedOtp,
            forgotPasswordExpiry: expireTime.toISOString()
        })

        await sendEmail({
            sendTo: email,
            subject: "Forgot password from DivineKart",
            html: forgotPasswordTemplate({
                name: user.name,
                otp: rawOtp // send original OTP to user, store hash in DB
            })
        })

        return response.json({
            message: "check your email",
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//verify forgot password otp
export async function verifyForgotPasswordOtp(request, response) {
    try {
        const { email, otp } = request.body

        if (!email || !otp) {
            return response.status(400).json({
                message: "Provide required field email, otp.",
                error: true,
                success: false
            })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        const currentTime = new Date().toISOString()

        if (user.forgotPasswordExpiry < currentTime) {
            return response.status(400).json({
                message: "Otp is expired",
                error: true,
                success: false
            })
        }

        const isOtpValid = await bcryptjs.compare(String(otp), user.forgotPasswordOtp);
        if (!isOtpValid) {
            return response.status(400).json({
                message: "Invalid otp",
                error: true,
                success: false
            })
        }

        //if otp is not expired
        //otp === user.forgotPasswordOtp

        await User.findByIdAndUpdate(user?._id, {
            forgotPasswordOtp: "",
            forgotPasswordExpiry: ""
        })

        return response.json({
            message: "Verify otp successfully",
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//reset the password
export async function resetpassword(request, response) {
    try {
        const { email, newPassword, confirmPassword } = request.body

        if (!email || !newPassword || !confirmPassword) {
            return response.status(400).json({
                message: "provide required fields email, newPassword, confirmPassword"
            })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return response.status(400).json({
                message: "Email is not available",
                error: true,
                success: false
            })
        }

        if (newPassword !== confirmPassword) {
            return response.status(400).json({
                message: "newPassword and confirmPassword must be same.",
                error: true,
                success: false,
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(newPassword, salt)

        await User.findByIdAndUpdate(user._id, {
            password: hashPassword
        })

        return response.json({
            message: "Password updated successfully.",
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//refresh token controler
export async function refreshToken(request, response) {
    try {
        const refreshTokenValue = request.cookies.refreshToken || request?.headers?.authorization?.split(" ")[1]  /// [ Bearer token]

        if (!refreshTokenValue) {
            return response.status(401).json({
                message: "Invalid token",
                error: true,
                success: false
            })
        }

        const verifyToken = await jwt.verify(refreshTokenValue, process.env.SECRET_KEY_REFRESH_TOKEN)

        if (!verifyToken) {
            return response.status(401).json({
                message: "token is expired",
                error: true,
                success: false
            })
        }

        const userId = verifyToken?.id

        const newAccessToken = await generatedAccessToken(userId)

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }

        response.cookie('accessToken', newAccessToken, cookiesOption)

        return response.json({
            message: "New Access token generated",
            error: false,
            success: true,
            data: {
                accessToken: newAccessToken
            }
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//get login user details
export async function userDetails(request, response) {
    try {
        const userId = request.userId

        console.log(userId)

        const user = await User.findById(userId).select('-password -refreshToken')

        return response.json({
            message: 'user details',
            data: user,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        })
    }
}

/**
 * Request email update - Step 1: Send OTP to new email
 */
export async function requestEmailUpdate(req, res) {
    const userId = req.userId;
    const sanitizedEmail = req.body.newEmail?.trim().toLowerCase() || '';

    if (!validator.isEmail(sanitizedEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    try {
        const existing = await User.findOne({ email: sanitizedEmail });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const otp = String(Math.floor(Math.random() * 900000) + 100000); 
        const ttl = 15 * 60; 

        const key = `email_update_pending:${userId}`;
        const updateData = { newEmail: sanitizedEmail, otp };

        pendingRegistrations.set(key, { ...updateData, expiry: new Date(Date.now() + ttl * 1000) });

        await sendEmail({
            sendTo: sanitizedEmail,
            subject: 'Verify your new email - DivineKart',
            html: `<h1>Email Verification</h1><p>Your OTP to update your email to <b>${sanitizedEmail}</b> is: <b>${otp}</b>. Valid for 15 mins.</p>`,
        });

        return res.json({ success: true, message: 'Verification OTP sent to your new email' });
    } catch (error) {
        console.error("[requestEmailUpdate] Error:", error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
}

/**
 * Verify OTP - Step 2: Update email in DB
 */
export async function verifyEmailUpdate(req, res) {
    const userId = req.userId;
    const { otp } = req.body;

    const key = `email_update_pending:${userId}`;
    let pending = null;

    try {
        pending = pendingRegistrations.get(key);
        if (pending && new Date() > pending.expiry) {
            pendingRegistrations.delete(key);
            pending = null;
        }

        if (!pending) {
            return res.status(400).json({ success: false, message: 'No pending email update or OTP expired.' });
        }

        if (otp !== pending.otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        const existing = await User.findOne({ email: pending.newEmail });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already taken' });
        }

        await User.findByIdAndUpdate(userId, { email: pending.newEmail });

        pendingRegistrations.delete(key);

        return res.json({ success: true, message: 'Email updated successfully' });
    } catch (error) {
        console.error("[verifyEmailUpdate] Error:", error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
}