import supabase from '../config/supabase';
import logger from '../utils/logger';
import { User, UserUpdateData } from '../types';

/**
 * Service to handle all User-related database operations.
 */
const userService = {
    /**
     * Fetch a user by their ID.
     */
    getUserById: async (id: string): Promise<User | null> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return data as User | null;
    },

    /**
     * Fetch a user by their phone number.
     */
    getUserByPhone: async (phone: string): Promise<User | null> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();
        if (error) throw error;
        return data as User | null;
    },

    /**
     * Upsert a user profile.
     */
    upsertUser: async (userData: Partial<User>): Promise<User> => {
        const { data, error } = await supabase
            .from('users')
            .upsert(userData)
            .select()
            .single();
        if (error) throw error;
        return data as User;
    },

    /**
     * Update a user profile.
     */
    updateUser: async (id: string, updateData: UserUpdateData): Promise<User> => {
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as User;
    },

    /**
     * Delete a user's data (soft delete by status or hard delete).
     */
    deleteUser: async (id: string): Promise<boolean> => {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    /**
     * Increment user's streak using RPC or manual update.
     */
    incrementStreak: async (userId: string): Promise<boolean> => {
        const { error } = await supabase.rpc('increment_streak', { user_id: userId });
        if (error) {
            logger.error({ error, user_id: userId }, 'Streak Increment RPC Failed');
            throw error;
        }
        return true;
    },

    /**
     * Increment user's wallet balance atomically.
     */
    incrementWallet: async (userId: string, amount: number): Promise<boolean> => {
        const { error } = await supabase.rpc('increment_wallet', { 
            row_id: userId, 
            amount: Number(amount) 
        });
        if (error) {
            logger.error({ error, userId, amount }, 'Wallet Increment RPC Failed');
            throw error;
        }
        return true;
    },

    /**
     * Record XP action and points for a user.
     */
    addXP: async (userId: string, points: number, action: string): Promise<boolean> => {
        const { error } = await supabase
            .from('user_xp_log')
            .insert({
                user_id: userId,
                points,
                action
            });
        if (error) {
            logger.error({ error, userId, points, action }, 'Failed to record XP');
            throw error;
        }
        return true;
    }
};

export default userService;
