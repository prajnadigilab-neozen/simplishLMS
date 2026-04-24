const supabase = require('../config/supabase');
const userService = require('../services/userService').default;
const lessonService = require('../services/lessonService');
const logger = require('../utils/logger');
const { normalizePhone } = require('../utils/phone');

const isSubActive = (expiryDate) => !!expiryDate && new Date(expiryDate) > new Date();

/**
 * Handles new user registration.
 */
exports.register = async (req, res) => {
    const fullName = req.body.fullName || req.body.full_name;
    const { email, phone, password } = req.body;
    const role = 'user'; // Default role for security

    if (!password || (!email && !phone)) {
        return res.status(400).json({ message: 'Password and either email or phone are required' });
    }

    try {
        const signUpData = { password };
        const options = { data: { full_name: fullName || 'New User', role } };

        if (phone) {
            signUpData.phone = normalizePhone(phone);
            const existingUser = await userService.getUserByPhone(signUpData.phone);
            if (existingUser) {
                return res.status(422).json({
                    message: 'Register Failed: This mobile number is already registered.',
                    code: 'DUPLICATE_PHONE'
                });
            }
        } else {
            signUpData.email = email;
        }

        const { data, error } = await supabase.auth.signUp({ ...signUpData, options });
        if (error) return res.status(400).json({ message: error.message });

        await userService.upsertUser({
            id: data.user.id,
            full_name: fullName || 'New User',
            email: email || null,
            phone: normalizePhone(phone) || null,
            role,
            onboarding_completed: false
        });

        res.status(201).json({
            message: 'Registration successful.',
            user: { id: data.user.id, email: data.user.email, phone: data.user.phone, role }
        });
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
        const loginOptions = { password };
        if (phone) loginOptions.phone = normalizePhone(phone);
        else loginOptions.email = email;
        
        const { data, error } = await supabase.auth.signInWithPassword(loginOptions);
        if (error) return res.status(401).json({ message: error.message });

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
                    onboarding_completed: profile.onboarding_completed || false
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
        await lessonService.clearUserProgress(userId);
        await userService.deleteUser(userId);
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

            const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
            if (error) return res.status(400).json({ message: error.message });
            return res.json({ message: 'OTP sent to your mobile.' });
        } else if (email) {
            if (isMock) {
                logger.info({ email }, '[Auth] Mock Reset Link sent');
                return res.json({ message: 'Reset link sent to your email (Mock)', mock: true });
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
            const { data, error: vError } = await supabase.auth.verifyOtp({
                phone: normalized,
                token: otp,
                type: 'sms'
            });
            if (vError) return res.status(400).json({ message: vError.message });

            // User is now logged in via the session returned by verifyOtp
            const { error: pError } = await supabase.auth.updateUser({ password });
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
