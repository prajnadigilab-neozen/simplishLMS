const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');
const userService = require('../services/userService').default;
const mediaService = require('../services/mediaService');
const logger = require('../utils/logger');
const env = require('../config/env');
const { normalizePhone } = require('../utils/phone');
const { maskPhone, maskEmail } = require('../utils/pii');

/**
 * Filters out properties with an `undefined` value from an object. 
 * This prevents overriding existing database fields with explicit nulls 
 * when a client omits properties from a payload.
 * 
 * @param {Object} obj - The raw, potentially sparse object payload.
 * @returns {Object} A sanitized object containing only defined properties.
 */
const stripUndefined = obj => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

/**
 * Synchronizes user profile updates across both the Supabase Auth system and the local `users` table.
 * 
 * @async
 * @param {import('express').Request} req - The Express request object.
 * @param {Object} req.body - The payload.
 * @param {string} [req.body.fullName] - The user's new full name.
 * @param {string} [req.body.email] - The user's new email.
 * @param {string} [req.body.phone] - A 10-digit phone number. Automatically normalized.
 * @param {string} [req.body.bio] - User bio. Automatically truncated to 500 characters.
 * @param {string} [req.body.location] - User location string.
 * @param {import('express').Response} res - The Express response object.
 * @returns {Promise<void>} 200 OK with the mapped user object, or 500 on server failure.
 */
exports.updateProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { fullName, email, phone, bio, location, state } = req.body;
    let avatarUrl = req.file ? mediaService.getUrl(req.file.filename) : undefined;

    try {
        const userRes = await supabase.auth.admin.getUserById(userId);
        const { user: currentUser } = userRes.data || {};

        if (!currentUser) return res.status(404).json({ message: 'User not found in Auth system' });

        const authUpdates = {};
        if (email && email !== currentUser.email) authUpdates.email = email;
        if (phone && phone !== currentUser.phone) authUpdates.phone = phone;

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

        if (metaChanged) authUpdates.user_metadata = user_metadata;

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdates);
            if (authError) return res.status(400).json({ message: authError.message });
        }

        const profileUpdates = stripUndefined({
            full_name: fullName,
            email: email,
            phone: phone ? normalizePhone(phone) : undefined,
            bio: bio !== undefined ? (bio ? bio.substring(0, 500) : null) : undefined,
            location: location,
            state: state
        });
        
        if (avatarUrl) {
            const { data: profile } = await supabase.from('users').select('avatar_url').eq('id', userId).maybeSingle();
            if (profile?.avatar_url) await mediaService.deleteFile(profile.avatar_url);
            profileUpdates.avatar_url = avatarUrl;
        }

        if (Object.keys(profileUpdates).length > 0) {
            const updatedProfile = await userService.updateUser(userId, profileUpdates);
            return res.json({
                message: 'Profile updated',
                user: {
                    id: updatedProfile.id,
                    fullName: updatedProfile.full_name,
                    email: updatedProfile.email,
                    phone: updatedProfile.phone,
                    role: updatedProfile.role,
                    avatarUrl: updatedProfile.avatar_url,
                    bio: updatedProfile.bio,
                    location: updatedProfile.location,
                    state: updatedProfile.state
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const callerRole = req.user?.role?.toLowerCase();
    const isSuperAdminCaller = callerRole === 'super_admin';

    try {
        const adminClient = supabase;
        
        let countQuery = adminClient.from('users').select('*', { count: 'exact', head: true });
        if (!isSuperAdminCaller) countQuery = countQuery.neq('role', 'super_admin');
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        let dataQuery = adminClient.from('users').select('*').order('created_at', { ascending: false }).range(start, end);
        if (!isSuperAdminCaller) dataQuery = dataQuery.neq('role', 'super_admin');
        const { data, error } = await dataQuery;

        if (error) {
            logger.error({ error }, 'Supabase getAllUsers Error');
            return res.status(error.status || 400).json({ message: error.message });
        }

        const sanitizedUsers = data.map(u => {
            if (isSuperAdminCaller) return u;
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

    if (typeof role === 'string') role = role.toLowerCase().replace(' ', '_');
    if (!['super_admin', 'admin', 'moderator', 'user'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const adminClient = supabase;
        const userRes = await adminClient.auth.admin.getUserById(id);
        const { user } = userRes.data || {};
        
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
            user_metadata: { ...user.user_metadata, role }
        });
        if (authError) throw authError;

        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .update({ role })
            .eq('id', id)
            .select('id, full_name, role')
            .maybeSingle();

        if (profileError) throw profileError;

        res.json({ message: 'User role updated successfully', user: profile });
    } catch (err) {
        logger.error({ err }, 'updateRole error');
        res.status(500).json({ message: 'Error updating role' });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await supabase.from('user_progress').delete().eq('user_id', id);
        const { error: profileError } = await supabase.from('users').delete().eq('id', id);
        if (profileError) throw profileError;

        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) throw authError;

        res.json({ message: 'User permanently deleted' });
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

exports.getSystemLogs = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            logger.error({ error }, 'getSystemLogs error');
            return res.status(error.status || 500).json({ message: error.message });
        }
        res.json({ logs: data || [] });
    } catch (err) {
        logger.error({ err }, 'getSystemLogs error');
        res.status(500).json({ message: 'Error fetching system logs' });
    }
};
