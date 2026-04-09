const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');
const mediaService = require('../services/mediaService');
const userService = require('../services/userService').default;
const lessonService = require('../services/lessonService');
const logger = require('../utils/logger');
const env = require('../config/env');

// Helper to normalize Indian phone numbers to exactly 10 digits
const normalizePhone = (phone) => {
    if (!phone) return null;
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    // Return only the last 10 digits if longer (e.g., 919876543210 -> 9876543210)
    if (cleaned.length >= 10) {
        return cleaned.slice(-10);
    }
    return cleaned;
};

exports.register = async (req, res) => {
    logger.info('--- Supabase Registration Attempt ---');
    logger.info({ body: req.body }, 'Request Body');
    const fullName = req.body.fullName || req.body.full_name;
    const { email, phone, password } = req.body;
    // 🛡️ Security Fix: Explicitly ignore any role provided in the request
    const role = 'user'; 

    // Validation: At least one of (Email OR Phone) and password are required
    if (!password || (!email && !phone)) {
        logger.warn({ password: !!password, email: !!email, phone: !!phone }, 'Registration Validation Failed');
        return res.status(400).json({
            message: 'Password and either email or phone are required'
        });
    }

    try {
        const signUpData = { password };
        const options = {
            data: {
                full_name: fullName || 'New User',
                role: role, // Hardcoded to 'user'
                onboarding_completed: !!fullName
            }
        };

        if (phone) {
            signUpData.phone = normalizePhone(phone);

            // Check if phone already exists via Service Layer
            const existingUser = await userService.getUserByPhone(signUpData.phone);

            if (existingUser) {
                logger.warn({ phone: signUpData.phone }, 'Registration Blocked: Phone number already in use');
                return res.status(422).json({
                    message: 'Register Failed: This mobile number is already registered. Please Sign In instead or use a different number.',
                    code: 'DUPLICATE_PHONE'
                });
            }
        } else {
            signUpData.email = email;
        }

        logger.info({ identifier: phone || email }, 'Attempting Registration');

        const { data, error } = await supabase.auth.signUp({
            ...signUpData,
            options
        });

        if (error) {
            logger.error({ error: error.message }, 'Supabase Register Error');
            return res.status(error.status || 400).json({
                message: error.message,
                details: error
            });
        }

        // --- PUBLIC SYNC via Service Layer ---
        try {
            await userService.upsertUser({
                id: data.user.id,
                full_name: fullName || 'New User',
                email: email || null,
                phone: normalizePhone(phone) || null,
                role: role, // Hardcoded to 'user'
                onboarding_completed: !!fullName
            });
            logger.info({ userId: data.user.id }, 'User synced to public.users via userService');
        } catch (syncErr) {
            logger.warn({ err: syncErr.message }, 'Non-fatal sync error');
        }

        res.status(201).json({
            message: 'Registration successful.',
            user: {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone,
                fullName: fullName || 'New User',
                role: role,
                onboarding_completed: false,
                current_level: 1,
                wallet_balance: 0,
                is_paid: false,
                subscription_expires_at: null
            }
        });
    } catch (error) {
        logger.error({ error }, 'Registration error');
        res.status(500).json({ message: 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    const { email, phone, password } = req.body;
    
    try {
        // --- 1. Supabase Auth Sign In ---
        logger.info({ email, phone, hasPassword: !!password }, 'Login Attempt');
        
        const loginOptions = { password };

        if (phone) {
            loginOptions.phone = normalizePhone(phone);
        } else {
            loginOptions.email = email;
        }

        logger.info({ loginOptions }, 'Login Options');
        
        const { data, error } = await supabase.auth.signInWithPassword(loginOptions);

        if (error) {
            logger.error({ error }, 'Supabase Login Error');
            return res.status(401).json({ message: error.message });
        }

        if (!data || !data.user || !data.session) {
            logger.error({ data }, 'Login succeeded but session/user is missing');
            return res.status(500).json({ 
                message: 'Internal error: Authentication succeeded but session data is incomplete.',
                details: !data ? 'data is null' : !data.user ? 'user is null' : 'session is null'
            });
        }

        logger.info({ session: !!data.session }, '[DEBUG] Login Succeeded');

        // --- 2. Profile Check ---
        logger.info({ userId: data.user.id }, 'Fetching profile for user');
        const profile = await userService.getUserById(data.user.id);

        if (!profile) {
            logger.warn({ userId: data.user.id }, '[DEBUG] Non-fatal: Profile not found for user');
        } else {
            logger.info({ role: profile?.role }, '[DEBUG] Profile fetched');
        }

        if (profile?.status === 'inactive') {
            return res.status(403).json({ message: 'Your account has been restricted. Please contact support.' });
        }
        if (profile?.status === 'deleted') {
            return res.status(403).json({ message: 'This account has been deleted.' });
        }

        // --- TRACK ACTIVITY ---
        try {
            await userService.updateUser(data.user.id, { last_login_at: new Date().toISOString() });
        } catch (activityErr) {
            logger.warn({ err: activityErr.message }, 'Non-fatal: Failed to update last_login_at');
        }

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('simplish_session', data.session.access_token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'strict' : 'lax', // Enforced strict in prod (CSRF mitigation)
            maxAge: 3600 * 1000 * 24 // 24 hours (Inactivity/Session hardening requirement)
        });

        const userData = {
            id: data.user.id,
            fullName: profile?.full_name || data.user.user_metadata?.full_name || 'User',
            email: data.user.email,
            phone: data.user.phone,
            role: profile?.role || data.user.user_metadata?.role || 'user',
            is_paid: profile?.is_paid || false,
            subscription_expires_at: profile?.subscription_expires_at || null,
            isSubscriptionActive: profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) > new Date() : false,
            avatarUrl: profile?.avatar_url || null,
            bio: profile?.bio || null,
            location: profile?.location || null,
            onboarding_completed: profile?.onboarding_completed || false,
            current_level: profile?.current_level || 1,
            wallet_balance: profile?.wallet_balance || 0
        };

        logger.info('Login successful, returning user data');
        res.json({
            token: data.session.access_token,
            user: userData
        });
    } catch (error) {
        logger.error({ error }, 'CRITICAL LOGIN ERROR');
        res.status(500).json({
            message: 'Server error during login',
            error: error.message
        });
    }
};

exports.logout = async (req, res) => {
    res.clearCookie('simplish_session');
    res.json({ message: 'Logged out successfully' });
};

exports.updateProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { fullName, email, phone, password, bio, location } = req.body;
    let avatarUrl = req.file ? mediaService.getUrl(req.file.filename) : undefined;

    try {
        // 0. Get current user data to avoid redundant Auth updates
        const userRes = await supabase.auth.admin.getUserById(userId);
        const fetchError = userRes.error;
        const currentUserData = userRes.data;
        const currentUser = currentUserData?.user;

        if (fetchError || !currentUser) return res.status(404).json({ message: 'User not found in Auth system' });


        // 1. Update Supabase Auth only if fields actually changed
        const authUpdates = {};
        if (email && email !== currentUser.email) authUpdates.email = email;
        if (phone && phone !== currentUser.phone) authUpdates.phone = phone;
        if (password) authUpdates.password = password;

        // Use user_metadata for custom fields, PRESERVE existing metadata (like role)
        const user_metadata = { ...(currentUser.user_metadata || {}) };
        let metaChanged = false;

        if (fullName && fullName !== user_metadata.full_name) {
            user_metadata.full_name = fullName;
            metaChanged = true;
        }
        if (avatarUrl && avatarUrl !== user_metadata.avatar_url) {
            user_metadata.avatar_url = avatarUrl;
            metaChanged = true;
        }

        if (metaChanged) {
            authUpdates.user_metadata = user_metadata;
        }

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdates);
            if (authError) return res.status(400).json({ message: authError.message });
        }

        // 2. Update public.users profile
        const profileUpdates = {};
        if (fullName) profileUpdates.full_name = fullName;
        if (email) profileUpdates.email = email;
        if (phone) profileUpdates.phone = normalizePhone(phone);
        if (bio !== undefined) profileUpdates.bio = bio;
        if (location !== undefined) profileUpdates.location = location;
        if (avatarUrl) {
            // Get current profile to find old avatar for deletion
            const { data: profile } = await supabase.from('users').select('avatar_url').eq('id', userId).maybeSingle();
            if (profile?.avatar_url) {
                await mediaService.deleteFile(profile.avatar_url);
            }
            profileUpdates.avatar_url = avatarUrl;
        }

        if (Object.keys(profileUpdates).length > 0) {
            let updatedProfile;
            try {
                updatedProfile = await userService.updateUser(userId, profileUpdates);
            } catch (profileError) {
                // If columns like bio/location/avatar_url don't exist yet, retry with core fields only
                if (profileError.code === '42703' || profileError.message?.includes('schema cache')) {
                    logger.warn('Profile columns not found in schema, retrying with core fields only');
                    const coreUpdates = {};
                    if (fullName) coreUpdates.full_name = fullName;
                    if (email) coreUpdates.email = email;
                    if (phone) coreUpdates.phone = phone;

                    if (Object.keys(coreUpdates).length > 0) {
                        updatedProfile = await userService.updateUser(userId, coreUpdates);
                    }
                } else {
                    return res.status(400).json({ message: profileError.message });
                }
            }

            return res.json({
                message: 'Profile updated',
                user: {
                    id: updatedProfile?.id || userId,
                    fullName: updatedProfile?.full_name || fullName,
                    email: updatedProfile?.email || email,
                    phone: updatedProfile?.phone || phone,
                    role: updatedProfile?.role || user_metadata.role || 'user',
                    avatarUrl: updatedProfile?.avatar_url || null,
                    bio: updatedProfile?.bio || null,
                    location: updatedProfile?.location || null,
                    onboarding_completed: updatedProfile?.onboarding_completed || false,
                    current_level: updatedProfile?.current_level,
                    wallet_balance: updatedProfile?.wallet_balance || 0,
                    is_paid: updatedProfile?.is_paid || false,
                    subscription_expires_at: updatedProfile?.subscription_expires_at || null,
                    isSubscriptionActive: updatedProfile?.subscription_expires_at ? new Date(updatedProfile.subscription_expires_at) > new Date() : false
                }
            });
        }

        res.json({ message: 'No changes made' });
    } catch (err) {
        logger.error({ err }, 'updateProfile error');
        res.status(500).json({ message: 'Server error during profile update' });
    }
};

exports.getAllUsers = async (req, res) => {
    logger.info('--- getAllUsers Attempt (Paginated) ---');
    logger.info({ userId: req.user?.id, role: req.user?.role }, 'Request User');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const callerRole = req.user?.role?.toLowerCase();
    const isSuperAdminCaller = callerRole === 'super_admin';

    try {
        // Create a fresh client to ensure service role bypasses any stateful RLS
        const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        // 1. Get total count - filter out super_admins if caller is not one
        let countQuery = adminClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (!isSuperAdminCaller) {
            countQuery = countQuery.neq('role', 'super_admin');
        }

        const { count, error: countError } = await countQuery;

        logger.info({ count }, 'Total users count from DB (filtered)');
        if (countError) throw countError;

        // 2. Fetch data with same filter
        let dataQuery = adminClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .range(start, end);

        if (!isSuperAdminCaller) {
            dataQuery = dataQuery.neq('role', 'super_admin');
        }

        const { data, error } = await dataQuery;

        if (error) {
            logger.error({ error }, 'Supabase getAllUsers Error');
            return res.status(error.status || 400).json({ message: error.message });
        }

        // 🛡️ Security Fix: Apply Least Privilege PII Masking (PCI DSS 4.0)
        const { maskPhone, maskEmail } = require('../utils/pii');
        const sanitizedUsers = (data || []).map(u => {
            if (isSuperAdminCaller) return u; // Super Admin sees full PII

            return {
                ...u,
                phone: maskPhone(u.phone),
                email: maskEmail(u.email)
            };
        });

        res.json({
            users: sanitizedUsers,
            pagination: {
                totalUsers: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        logger.error({ err }, 'getAllUsers error');
        res.status(500).json({ message: 'Error fetching users' });
    }
};

exports.updateRole = async (req, res) => {
    const { id } = req.params;
    let { role } = req.body;

    // Normalize role to lowercase for consistency
    if (typeof role === 'string') {
        role = role.toLowerCase().replace(' ', '_');
    }

    if (!['super_admin', 'admin', 'moderator', 'user'].includes(role)) {
        return res.status(400).json({ message: `Invalid role: ${role}. Supported: admin, moderator, user.` });
    }

    try {
        // Create a fresh admin client to ensure full Auth + DB access bypasses any RLS/cache issues
        const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        // 1. Fetch current Auth metadata to preserve fields like full_name or avatar_url
        const userRes = await adminClient.auth.admin.getUserById(id);
        const fetchError = userRes.error;
        const userData = userRes.data;
        const user = userData?.user;
        
        if (fetchError || !user) {

            logger.warn({ userId: id }, 'updateRole: User not found in Auth system');
            return res.status(404).json({ message: 'User not found in authentication system' });
        }

        // 2. Update Supabase Auth User Metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
            user_metadata: { ...user.user_metadata, role }
        });
        
        if (authError) {
            logger.error({ err: authError.message }, 'updateRole: Auth update failed');
            throw authError;
        }

        // 3. Update public.users profile table
        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .update({ role })
            .eq('id', id)
            .select('id, full_name, role')
            .maybeSingle(); // maybeSingle returns null without error if no row matches

        if (profileError) {
            logger.error({ err: profileError.message }, 'updateRole: Profile update failed');
            throw profileError;
        }

        if (!profile) {
            logger.warn({ userId: id }, 'updateRole: Auth updated, but profile not found in public.users table');
            return res.json({ 
                message: 'User role updated in Auth, but user profile was missing from the database.',
                user: { id, role } 
            });
        }

        logger.info({ id, role }, 'updateRole: Success');
        res.json({ message: 'User role updated successfully', user: profile });
    } catch (err) {
        logger.error({ err }, 'updateRole CRITICAL ERROR');
        res.status(500).json({ 
            message: 'Error updating role', 
            details: env.NODE_ENV !== 'production' ? err.message : undefined 
        });
    }
};
exports.getProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        // Try to get profile from Service Layer
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
                    subscription_expires_at: profile.subscription_expires_at || null,
                    wallet_balance: profile.wallet_balance || 0,
                    isSubscriptionActive: profile.subscription_expires_at ? new Date(profile.subscription_expires_at) > new Date() : false,
                    avatarUrl: profile.avatar_url || null,
                    bio: profile.bio || null,
                    location: profile.location || null,
                    onboarding_completed: profile.onboarding_completed || false,
                    current_level: profile.current_level
                }
            });
        }

        // Fallback: If not found in public.users, return what we have from the token
        // Use req.user which was populated by authMiddleware
        res.json({
            user: {
                id: userId,
                fullName: req.user.fullName || req.user.full_name || 'User',
                email: req.user.email,
                phone: req.user.phone,
                role: req.user.role || 'user',
                onboarding_completed: req.user.user_metadata?.onboarding_completed || false,
                is_paid: false,
                subscription_expires_at: null
            }
        });
    } catch (err) {
        logger.error({ err }, 'getProfile error');
        // Even on error, try to return basic info if we have req.user
        if (req.user) {
            return res.json({
                user: {
                    id: userId,
                    role: req.user.role || 'user',
                    email: req.user.email
                }
            });
        }
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    const actorId = req.user?.id;

    try {
        // Rule 21: GDPR Compliance — Hard delete, not soft delete
        // 1. Delete progress
        await supabase.from('user_progress').delete().eq('user_id', id);
        
        // 2. Delete Profile
        const { error: profileError } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (profileError) throw profileError;

        // 3. Delete Auth User (Supabase Admin)
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) throw authError;

        res.json({ message: 'User permanently deleted (GDPR compliant)' });
    } catch (err) {
        logger.error({ err }, 'deleteUser error');
        res.status(500).json({ message: 'Error deleting user' });
    }
};

exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const data = await userService.updateUser(id, { status });
        res.json({ message: `User status updated to ${status}`, user: data });
    } catch (err) {
        logger.error({ err }, 'updateStatus error');
        res.status(500).json({ message: 'Error updating status' });
    }
};

exports.deleteMe = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        logger.info({ userId }, '--- GDPR Hard Delete Requested ---');

        // Rule 21: GDPR Compliance — Hard delete, not soft delete
        
        // 1. Delete progress
        await lessonService.clearUserProgress(userId);
        
        // 2. Delete Profile
        await userService.deleteUser(userId);

        // 3. Delete Auth Account
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) {
            logger.error({ err: authError.message }, 'GDPR Delete: Failed to purge auth system record');
            throw new Error(`Failed to purge authentication record: ${authError.message}`);
        }

        logger.info({ userId }, 'GDPR Hard Delete SUCCESS');
        res.clearCookie('simplish_session');
        res.json({ message: 'Your account has been permanently deleted.' });
    } catch (err) {
        logger.error({ err }, 'GDPR DELETE ERROR');
        res.status(500).json({ message: 'Error deleting account', details: err.message });
    }
};

exports.getSystemLogs = async (req, res) => {
    // Verified by isSuperAdmin middleware, but double check
    if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only Super Admins can view system logs' });
    }

    try {
        const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await adminClient
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            logger.error({ error }, 'Supabase getSystemLogs Error');
            if (error.code === '42P01') return res.json({ logs: [] }); // Table missing gracefully handled
            return res.status(400).json({ message: error.message });
        }

        res.json({ logs: data || [] });
    } catch (err) {
        logger.error({ err }, 'getSystemLogs error');
        res.status(500).json({ message: 'Error fetching system logs' });
    }
};
