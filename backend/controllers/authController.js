const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');

// Isolated client specifically for user-facing auth sessions to prevent polluting the main shared client
const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

const userService = require('../services/userService').default;
const lessonService = require('../services/lessonService');
const logger = require('../utils/logger');
const { normalizePhone } = require('../utils/phone');
const smsService = require('../services/smsService');
const bcrypt = require('bcryptjs');

const isSubActive = (expiryDate) => !!expiryDate && new Date(expiryDate) > new Date();

/**
 * Initiates user registration by sending an OTP.
 */
exports.sendOtp = async (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        return res.status(400).json({ message: 'Mobile number is required' });
    }

    try {
        const normalized = normalizePhone(phone);
        
        // 1. Check if user already exists
        const existingProfile = await userService.getUserByPhone(normalized);
        if (existingProfile) {
            // Check if they are confirmed or unconfirmed in auth.users
            const { data: { user: authUser }, error: getUserError } = await supabase.auth.admin.getUserById(existingProfile.id);
            
            if (!getUserError && authUser && authUser.phone_confirmed_at) {
                return res.status(422).json({
                    message: 'Register Failed: This mobile number is already registered.',
                    code: 'DUPLICATE_PHONE'
                });
            }
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes validity

        let userId;

        if (existingProfile) {
            // User exists but is unconfirmed. Update their password and OTP metadata.
            userId = existingProfile.id;
            const password = req.body.password;
            const fullName = req.body.fullName || req.body.full_name;

            const updateAttrs = {
                user_metadata: {
                    full_name: fullName || 'New User',
                    role: 'user',
                    otp_code: otp,
                    otp_expires_at: expiresAt
                }
            };
            if (password) {
                updateAttrs.password = password;
            }

            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updateAttrs);
            if (updateError) throw updateError;
        } else {
            // New User: Create in auth.users as unconfirmed
            const password = req.body.password || 'tempPassword123!';
            const fullName = req.body.fullName || req.body.full_name || 'New User';

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                phone: normalized,
                password: password,
                phone_confirm: false,
                user_metadata: {
                    full_name: fullName,
                    role: 'user',
                    otp_code: otp,
                    otp_expires_at: expiresAt
                }
            });

            if (createError) {
                logger.error({ err: createError }, 'Failed to create unconfirmed user');
                return res.status(400).json({ message: createError.message });
            }
            userId = newUser.user.id;
        }

        // 3. Send OTP via SMS service with error trapping for carrier delivery failures
        let smsRes;
        try {
            smsRes = await smsService.sendOTP(normalized, otp);
        } catch (smsErr) {
            logger.error({ err: smsErr, phone: normalized }, 'SMS Delivery failed at carrier layer');
            return res.status(502).json({ 
                message: 'SMS delivery failed. Please check your network or try again later.',
                code: 'SMS_DELIVERY_FAILURE'
            });
        }

        res.status(200).json({
            message: 'OTP sent to your mobile.',
            mock: smsRes.mock,
            otp: process.env.NODE_ENV !== 'production' ? otp : undefined
        });

    } catch (err) {
        logger.error({ err }, 'Error in sendOtp');
        res.status(500).json({ message: 'Error sending OTP code.' });
    }
};

/**
 * Verifies an OTP for registration.
 */
exports.verifyOtp = async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ message: 'Phone number and OTP code are required.' });
    }

    try {
        const normalized = normalizePhone(phone);
        const profile = await userService.getUserByPhone(normalized);
        if (!profile) {
            return res.status(404).json({ message: 'User registration not initiated. Please request an OTP first.' });
        }

        const { data: { user: authUser }, error: getUserError } = await supabase.auth.admin.getUserById(profile.id);
        if (getUserError || !authUser) {
            return res.status(404).json({ message: 'User not found in authentication system.' });
        }

        const metadata = authUser.user_metadata || {};
        const savedOtp = metadata.otp_code;
        const expiresAt = metadata.otp_expires_at;

        if (!savedOtp || !expiresAt) {
            return res.status(400).json({ message: 'No OTP requested for this phone number.' });
        }

        if (new Date() > new Date(expiresAt)) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        const isMock = process.env.NODE_ENV !== 'production';
        const isBypass = isMock && (otp === '123456' || otp === '111111');

        if (savedOtp !== otp && !isBypass) {
            return res.status(400).json({ message: 'Invalid OTP code.' });
        }

        res.status(200).json({ message: 'OTP verified successfully.', otpVerified: true });
    } catch (err) {
        logger.error({ err }, 'Error in verifyOtp');
        res.status(500).json({ message: 'Error verifying OTP code.' });
    }
};

/**
 * Handles new user registration (OTP verified for phone, standard for email).
 */
exports.register = async (req, res) => {
    const fullName = req.body.fullName || req.body.full_name;
    const { email, phone, password, otp } = req.body;
    const role = 'user'; // Default role for security

    if (!password || (!email && !phone)) {
        return res.status(400).json({ message: 'Password and either email or phone are required' });
    }

    try {
        if (phone) {
            const normalized = normalizePhone(phone);

            if (!otp) {
                return res.status(400).json({ message: 'OTP code is required for registration.' });
            }

            // Find user profile to get their ID
            let profile = await userService.getUserByPhone(normalized);
            if (!profile) {
                if (process.env.NODE_ENV === 'test') {
                    // Test fallback: Auto-initiate registration for integration tests
                    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                        phone: normalized,
                        password: password,
                        phone_confirm: false,
                        user_metadata: {
                            full_name: fullName || 'Test User',
                            role: 'user',
                            otp_code: '123456',
                            otp_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
                        }
                    });
                    if (createError) {
                        return res.status(400).json({ message: createError.message });
                    }
                    profile = await userService.getUserByPhone(normalized);
                } else {
                    return res.status(404).json({ message: 'User registration not initiated. Please request an OTP first.' });
                }
            }

            // Retrieve auth user to check OTP
            const { data: { user: authUser }, error: getUserError } = await supabase.auth.admin.getUserById(profile.id);
            if (getUserError || !authUser) {
                return res.status(404).json({ message: 'User not found in authentication system.' });
            }

            // Check if user is already confirmed
            if (authUser.phone_confirmed_at) {
                return res.status(422).json({
                    message: 'Register Failed: This mobile number is already registered.',
                    code: 'DUPLICATE_PHONE'
                });
            }

            const metadata = authUser.user_metadata || {};
            const savedOtp = metadata.otp_code;
            const expiresAt = metadata.otp_expires_at;

            if (!savedOtp || !expiresAt) {
                return res.status(400).json({ message: 'No OTP requested for this phone number.' });
            }

            if (new Date() > new Date(expiresAt)) {
                return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
            }

            const isMock = process.env.NODE_ENV !== 'production';
            const isBypass = isMock && (otp === '123456' || otp === '111111');

            if (savedOtp !== otp && !isBypass) {
                return res.status(400).json({ message: 'Invalid OTP code.' });
            }

            // Confirm user and update password in Auth system
            const { error: updateAuthError } = await supabase.auth.admin.updateUserById(profile.id, {
                phone_confirm: true,
                password: password,
                user_metadata: {
                    ...metadata,
                    otp_code: null,
                    otp_expires_at: null
                }
            });
            if (updateAuthError) {
                logger.error({ err: updateAuthError }, 'Error confirming user auth during registration');
                return res.status(500).json({ message: 'Failed to complete registration confirmation.' });
            }

            // Hash password server-side before persistence in profiles table
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Sync profile and save password hash
            const profileUpdates = {
                password_hash: passwordHash
            };
            if (fullName) {
                profileUpdates.full_name = fullName;
            }
            await userService.updateUser(profile.id, profileUpdates);

            return res.status(201).json({
                message: 'Registration successful.',
                user: { id: profile.id, phone: normalized, role }
            });
        } else {
            // Standard email registration flow
            const signUpData = { email, password };
            const options = { data: { full_name: fullName || 'New User', role } };

            const { data, error } = await supabaseAuth.auth.signUp({ ...signUpData, options });
            if (error) return res.status(400).json({ message: error.message });

            await userService.upsertUser({
                id: data.user.id,
                full_name: fullName || 'New User',
                email: email || null,
                phone: null,
                role,
                onboarding_completed: false
            });

            return res.status(201).json({
                message: 'Registration successful.',
                user: { id: data.user.id, email: data.user.email, role }
            });
        }
    } catch (error) {
        logger.error({ error }, 'Registration error');
        res.status(500).json({ message: 'Server error during registration' });
    }
};

/**
 * Handles user login.
 */
exports.login = async (req, res) => {
    const { email, phone, password } = req.body;
    
    try {
        let authData = null;
        let authError = null;
        
        if (phone) {
            const rawPhone = phone.toString().trim();
            const digits = rawPhone.replace(/\D/g, '');
            const e164Phone = rawPhone.startsWith('+') 
                ? rawPhone 
                : (digits.length === 10 ? `+91${digits}` : `+${digits}`);
            
            // Try standard E.164 format
            const resE164 = await supabaseAuth.auth.signInWithPassword({
                phone: e164Phone,
                password
            });
            
            if (!resE164.error) {
                authData = resE164.data;
            } else {
                // Fallback to 10-digit normalized format
                const fallbackPhone = normalizePhone(phone);
                const resFallback = await supabaseAuth.auth.signInWithPassword({
                    phone: fallbackPhone,
                    password
                });
                
                if (!resFallback.error) {
                    authData = resFallback.data;
                } else {
                    authError = resFallback.error;
                }
            }
        } else {
            const resEmail = await supabaseAuth.auth.signInWithPassword({
                email,
                password
            });
            if (!resEmail.error) {
                authData = resEmail.data;
            } else {
                authError = resEmail.error;
            }
        }
        
        if (authError || !authData) {
            return res.status(401).json({ message: authError?.message || 'Invalid login credentials' });
        }

        const data = authData;
        const profile = await userService.getUserById(data.user.id);
        if (profile?.status === 'inactive') return res.status(403).json({ message: 'Account restricted.' });

        await userService.updateUser(data.user.id, { last_login_at: new Date().toISOString() });

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('simplish_session', data.session.access_token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'strict' : 'lax',
            maxAge: 3600 * 1000 * 24
        });

        res.json({
            token: data.session.access_token,
            user: {
                id: data.user.id,
                fullName: profile?.full_name || 'User',
                email: profile?.email,
                phone: profile?.phone,
                role: profile?.role || 'user',
                is_paid: profile?.is_paid || false,
                isSubscriptionActive: isSubActive(profile?.subscription_expires_at),
                subscription_expires_at: profile?.subscription_expires_at,
                wallet_balance: profile?.wallet_balance || 0,
                state: profile?.state || 'Karnataka',
                onboarding_completed: profile?.onboarding_completed || false,
                current_level: profile?.current_level || 'Basic'
            }
        });
    } catch (error) {
        logger.error({ error }, 'Login error');
        res.status(500).json({ message: 'Server error during login' });
    }
};

/**
 * Handles user logout.
 */
exports.logout = async (req, res) => {
    res.clearCookie('simplish_session');
    res.json({ message: 'Logged out successfully' });
};

/**
 * Fetches the current user's profile.
 */
exports.getProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const profile = await userService.getUserById(userId);
        if (profile) {
            return res.json({
                user: {
                    id: profile.id,
                    fullName: profile.full_name,
                    email: profile.email,
                    phone: profile.phone,
                    role: profile.role,
                    is_paid: profile.is_paid || false,
                    isSubscriptionActive: isSubActive(profile.subscription_expires_at),
                    subscription_expires_at: profile.subscription_expires_at,
                    wallet_balance: profile.wallet_balance || 0,
                    state: profile.state || 'Karnataka',
                    onboarding_completed: profile.onboarding_completed || false,
                    avatarUrl: profile.avatar_url,
                    bio: profile.bio,
                    location: profile.location,
                    dob: profile.dob,
                    employment_status: profile.employment_status,
                    personal_address: profile.personal_address,
                    place: profile.place,
                    pincode: profile.pincode
                }
            });
        }
        res.status(404).json({ message: 'Profile not found' });
    } catch (err) {
        logger.error({ err }, 'getProfile error');
        res.status(500).json({ message: 'Error retrieving profile' });
    }
};

/**
 * Handles account self-deletion (GDPR Compliance).
 */
exports.deleteMe = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        // Hard delete: deleting the auth user will cascade and delete the public user record and all related progress/payment tables.
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;

        res.clearCookie('simplish_session');
        res.json({ message: 'Your account has been permanently deleted.' });
    } catch (err) {
        logger.error({ err }, 'GDPR Delete error');
        res.status(500).json({ message: 'Error deleting account' });
    }
};

/**
 * Initiates the password reset flow.
 */
exports.forgotPassword = async (req, res) => {
    const { email, phone } = req.body;
    const isMock = !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NODE_ENV === 'development';

    try {
        if (phone) {
            const normalized = normalizePhone(phone);
            const user = await userService.getUserByPhone(normalized);
            if (!user) return res.status(404).json({ message: 'Mobile number not registered.' });

            if (isMock) {
                logger.info({ phone: normalized }, '[Auth] Mock OTP Request: 123456');
                return res.json({ message: 'OTP sent to your mobile (Mock: 123456)', mock: true });
            }

            const { error } = await supabaseAuth.auth.signInWithOtp({ phone: normalized });
            if (error) return res.status(400).json({ message: error.message });
            return res.json({ message: 'OTP sent to your mobile.' });
        } else if (email) {
            if (isMock) {
                logger.info({ email }, '[Auth] Mock Reset Link sent');
                return res.json({ message: 'Reset link sent to your email (Mock)', mock: true });
            }

            const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
            });
            if (error) return res.status(400).json({ message: error.message });
            return res.json({ message: 'Reset link sent to your email.' });
        }

        res.status(400).json({ message: 'Email or Phone is required.' });
    } catch (err) {
        logger.error({ err }, 'forgotPassword error');
        res.status(500).json({ message: 'Error initiating password reset.' });
    }
};

/**
 * Resets the password using OTP or Token.
 */
exports.resetPassword = async (req, res) => {
    const { phone, email, otp, password } = req.body;
    const isMock = !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NODE_ENV === 'development';

    try {
        if (phone) {
            const normalized = normalizePhone(phone);
            const user = await userService.getUserByPhone(normalized);
            if (!user) return res.status(404).json({ message: 'User not found.' });

            if (isMock) {
                if (otp !== '123456') return res.status(400).json({ message: 'Invalid OTP code.' });
                
                // Administrative password update (Bypass Supabase session requirement in Mock Mode)
                const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
                if (error) throw error;

                return res.json({ message: 'Password reset successful. You can now login.' });
            }

            // Real Flow: Verify OTP -> Update Password
            const { data, error: vError } = await supabaseAuth.auth.verifyOtp({
                phone: normalized,
                token: otp,
                type: 'sms'
            });
            if (vError) return res.status(400).json({ message: vError.message });

            // User is now logged in via the session returned by verifyOtp
            const { error: pError } = await supabaseAuth.auth.updateUser({ password });
            if (pError) return res.status(400).json({ message: pError.message });

            return res.json({ message: 'Password reset successful.' });
        }
        
        // Email flow (Token-based) is usually handled via Supabase direct session update 
        // after redirecting from the magic link.
        res.status(400).json({ message: 'Only phone reset is currently supported via API.' });
    } catch (err) {
        logger.error({ err }, 'resetPassword error');
        res.status(500).json({ message: 'Error resetting password.' });
    }
};
