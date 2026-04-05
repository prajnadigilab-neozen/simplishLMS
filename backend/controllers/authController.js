const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');
const mediaService = require('../services/mediaService');

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
    console.log('--- Supabase Registration Attempt ---');
    console.log('Request Body:', req.body);
    const fullName = req.body.fullName || req.body.full_name;
    const { email, phone, password } = req.body;

    // Validation: At least one of (Email OR Phone) and password are required
    // (fullName is now optional to support partial onboarding from external triggers)
    if (!password || (!email && !phone)) {
        console.warn('Registration Validation Failed:', { password: !!password, email: !!email, phone: !!phone });
        return res.status(400).json({
            message: 'Password and either email or phone are required'
        });
    }

    try {
        const signUpData = { password };
        const options = {
            data: {
                full_name: fullName || 'New User',
                role: req.body.role || 'user',
                onboarding_completed: !!fullName // If name is provided, consider initial onboarding step done
            }
        };

        if (phone) {
            signUpData.phone = normalizePhone(phone);

            // Check if phone already exists in public.users to prevent duplicate registrations
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id, email')
                .eq('phone', signUpData.phone)
                .limit(1)
                .maybeSingle();

            if (existingUser) {
                console.warn('Registration Blocked: Phone number already in use', signUpData.phone);
                return res.status(422).json({
                    message: 'Register Failed: This mobile number is already registered. Please Sign In instead or use a different number.',
                    code: 'DUPLICATE_PHONE'
                });
            }
        } else {
            signUpData.email = email;
        }

        console.log('Attempting Registration for:', phone || email);

        const { data, error } = await supabase.auth.signUp({
            ...signUpData,
            options
        });

        if (error) {
            console.error('Supabase Register Error:', error.message);
            return res.status(error.status || 400).json({
                message: error.message,
                details: error
            });
        }

        // --- PUBLIC SYNC (Mandatory for feature reliability) ---
        try {
            await supabase
                .from('users')
                .upsert({
                    id: data.user.id,
                    full_name: fullName || 'New User',
                    email: email || null,
                    phone: normalizePhone(phone) || null,
                    role: req.body.role || 'user',
                    onboarding_completed: !!fullName
                }, { onConflict: 'id' });
            console.log('User synced to public.users:', data.user.id);
        } catch (syncErr) {
            console.warn('Non-fatal sync error:', syncErr.message);
        }

        res.status(201).json({
            message: 'Registration successful.',
            user: {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone,
                fullName: fullName || 'New User',
                role: 'user',
                onboarding_completed: false,
                current_level: 1,
                wallet_balance: 0,
                is_paid: false,
                subscription_expires_at: null
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    const { email, phone, password } = req.body;
    
    try {
        // --- 1. Supabase Auth Sign In ---
        console.log('[DEBUG] Login Attempt:', { email, phone, hasPassword: !!password });
        
        const loginOptions = { password };

        if (phone) {
            loginOptions.phone = normalizePhone(phone);
        } else {
            loginOptions.email = email;
        }

        console.log('[DEBUG] Login Options:', JSON.stringify(loginOptions));
        
        const { data, error } = await supabase.auth.signInWithPassword(loginOptions);

        if (error) {
            console.error('[DEBUG] Supabase Login Error:', error);
            return res.status(401).json({ message: error.message });
        }

        if (!data || !data.user || !data.session) {
            console.error('Login succeeded but session/user is missing:', data);
            return res.status(500).json({ 
                message: 'Internal error: Authentication succeeded but session data is incomplete.',
                details: !data ? 'data is null' : !data.user ? 'user is null' : 'session is null'
            });
        }

        console.log('[DEBUG] Login Succeeded, Session:', !!data.session);

        // --- 2. Profile Check ---
        console.log('Fetching profile for user:', data.user.id);
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn('[DEBUG] Non-fatal: Profile fetch error (user might not be in public.users yet):', profileError.message);
        } else {
            console.log('[DEBUG] Profile fetched, role:', profile?.role);
        }


        if (profile?.status === 'inactive') {
            return res.status(403).json({ message: 'Your account has been restricted. Please contact support.' });
        }
        if (profile?.status === 'deleted') {
            return res.status(403).json({ message: 'This account has been deleted.' });
        }

        // --- TRACK ACTIVITY ---
        try {
            await supabase
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', data.user.id);
        } catch (activityErr) {
            console.warn('Non-fatal: Failed to update last_login_at:', activityErr.message);
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

        console.log('Login successful, returning user data');
        res.json({
            token: data.session.access_token,
            user: userData
        });
    } catch (error) {
        console.error('CRITICAL LOGIN ERROR:', error);
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
            let updatedProfile, profileError;

            ({ data: updatedProfile, error: profileError } = await supabase
                .from('users')
                .update(profileUpdates)
                .eq('id', userId)
                .select()
                .maybeSingle());

            // If columns like bio/location/avatar_url don't exist yet, retry with core fields only
            if (profileError && (profileError.code === '42703' || profileError.message?.includes('schema cache'))) {
                console.warn('Profile columns not found in schema, retrying with core fields only');
                const coreUpdates = {};
                if (fullName) coreUpdates.full_name = fullName;
                if (email) coreUpdates.email = email;
                if (phone) coreUpdates.phone = phone;

                if (Object.keys(coreUpdates).length > 0) {
                    ({ data: updatedProfile, error: profileError } = await supabase
                        .from('users')
                        .update(coreUpdates)
                        .eq('id', userId)
                        .select()
                        .maybeSingle());
                } else {
                    profileError = null;
                }
            }

            if (profileError) return res.status(400).json({ message: profileError.message });

            // If no row was updated (user not in public.users), fetch current data
            if (!updatedProfile) {
                const { data: currentProfile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();
                updatedProfile = currentProfile;
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
        console.error('updateProfile error:', err);
        res.status(500).json({ message: 'Server error during profile update' });
    }
};

exports.getAllUsers = async (req, res) => {
    console.log('--- getAllUsers Attempt (Paginated) ---');
    console.log('Request User:', req.user?.id, 'Role:', req.user?.role);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const callerRole = req.user?.role?.toLowerCase();
    const isSuperAdminCaller = callerRole === 'super_admin';

    try {
        // Create a fresh client to ensure service role bypasses any stateful RLS
        const adminClient = createClient(process.env.SUPABASE_URL?.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

        // 1. Get total count - filter out super_admins if caller is not one
        let countQuery = adminClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (!isSuperAdminCaller) {
            countQuery = countQuery.neq('role', 'super_admin');
        }

        const { count, error: countError } = await countQuery;

        console.log('Total users count from DB (filtered):', count);
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
            console.error('Supabase getAllUsers Error:', error);
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
        console.error('getAllUsers error:', err);
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
        const adminClient = createClient(process.env.SUPABASE_URL?.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

        // 1. Fetch current Auth metadata to preserve fields like full_name or avatar_url
        const userRes = await adminClient.auth.admin.getUserById(id);
        const fetchError = userRes.error;
        const userData = userRes.data;
        const user = userData?.user;
        
        if (fetchError || !user) {

            console.warn('updateRole: User not found in Auth system', id);
            return res.status(404).json({ message: 'User not found in authentication system' });
        }

        // 2. Update Supabase Auth User Metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
            user_metadata: { ...user.user_metadata, role }
        });
        
        if (authError) {
            console.error('updateRole: Auth update failed', authError.message);
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
            console.error('updateRole: Profile update failed', profileError.message);
            throw profileError;
        }

        if (!profile) {
            console.warn('updateRole: Auth updated, but profile not found in public.users table', id);
            return res.json({ 
                message: 'User role updated in Auth, but user profile was missing from the database.',
                user: { id, role } 
            });
        }

        console.log('updateRole: Success', { id, role });
        res.json({ message: 'User role updated successfully', user: profile });
    } catch (err) {
        console.error('updateRole CRITICAL ERROR:', err);
        res.status(500).json({ 
            message: 'Error updating role', 
            details: process.env.NODE_ENV !== 'production' ? err.message : undefined 
        });
    }
};
exports.getProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        // Try to get profile from public.users table
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.warn('Profile fetch error in getProfile (likely missing is_paid):', profileError.message);
        }

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
        console.error('getProfile error:', err);
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
        console.error('deleteUser error:', err);
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
        const { data, error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: `User status updated to ${status}`, user: data });
    } catch (err) {
        console.error('updateStatus error:', err);
        res.status(500).json({ message: 'Error updating status' });
    }
};

exports.deleteMe = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        console.log(`--- GDPR Hard Delete Requested for user: ${userId} ---`);

        // Rule 21: GDPR Compliance — Hard delete, not soft delete
        
        // 1. Delete progress
        const { error: progressError } = await supabase.from('user_progress').delete().eq('user_id', userId);
        if (progressError) {
            console.error('GDPR Delete: Failed to clear user_progress', progressError);
            throw new Error(`Failed to clear user progress: ${progressError.message}`);
        }
        
        // 2. Delete Profile
        const { error: profileError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('GDPR Delete: Failed to clear public.users profile', profileError);
            throw new Error(`Failed to delete profile: ${profileError.message}`);
        }

        // 3. Delete Auth Account
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) {
            console.error('GDPR Delete: Failed to purge auth system record', authError);
            throw new Error(`Failed to purge authentication record: ${authError.message}`);
        }

        console.log(`GDPR Hard Delete SUCCESS for user: ${userId}`);
        res.clearCookie('simplish_session');
        res.json({ message: 'Your account has been permanently deleted.' });
    } catch (err) {
        console.error('GDPR DELETE ERROR:', err);
        res.status(500).json({ message: 'Error deleting account', details: err.message });
    }
};

exports.getSystemLogs = async (req, res) => {
    // Verified by isSuperAdmin middleware, but double check
    if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only Super Admins can view system logs' });
    }

    try {
        const adminClient = createClient(process.env.SUPABASE_URL?.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
        const { data, error } = await adminClient
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Supabase getSystemLogs Error:', error);
            if (error.code === '42P01') return res.json({ logs: [] }); // Table missing gracefully handled
            return res.status(400).json({ message: error.message });
        }

        res.json({ logs: data || [] });
    } catch (err) {
        console.error('getSystemLogs error:', err);
        res.status(500).json({ message: 'Error fetching system logs' });
    }
};
