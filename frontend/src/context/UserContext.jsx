import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authApi } from '../utils/api';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/storageUtils';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(() => safeGetItem('simplish_user', true));
    const [language, setLanguage] = useState(() => safeGetItem('simplish_language') || 'kn');
    const [loading, setLoading] = useState(true);

    const handleAuthSuccess = (userData, token) => {
        const roleStr = typeof userData?.role === 'string' ? userData.role.toLowerCase().replace(/\s+|_/g, '_') : 'user';
        const normalized = { 
            ...userData, 
            role: roleStr 
        };
        const userWithAuth = { ...normalized, isLoggedIn: true, token };
        safeSetItem('simplish_user', userWithAuth);
        safeSetItem('simplish_token', token);
        setUser(userWithAuth);
        return userWithAuth;
    };

    const handleLogout = () => {
        safeRemoveItem('simplish_user');
        safeRemoveItem('simplish_token');
        safeRemoveItem('simplish_active_lesson');
        setUser(null);
    };

    const refreshUserContext = async () => {
        try {
            const token = safeGetItem('simplish_token');
            if (!token) return;

            const res = await authApi.getProfile(token);
            if (res.data && res.data.user) {
                const roleStr = typeof res.data.user.role === 'string' ? res.data.user.role.toLowerCase().replace(/\s+|_/g, '_') : 'user';
                const normalized = {
                    ...res.data.user,
                    role: roleStr,
                    isLoggedIn: true,
                    token
                };
                safeSetItem('simplish_user', normalized);
                setUser(normalized);
            }
        } catch (err) {
            console.error('Failed to refresh user context:', err);
        }
    };

    const updateLanguage = (newLang) => {
        setLanguage(newLang);
        safeSetItem('simplish_language', newLang);
    };

    useEffect(() => {
        const syncProfile = async () => {
            const storedToken = safeGetItem('simplish_token');
            const storedUser = safeGetItem('simplish_user');

            if (!storedToken && !storedUser) {
                setLoading(false);
                return;
            }

            try {
                const [profileRes] = await Promise.allSettled([
                    api.get('/auth/profile')
                ]);

                if (profileRes.status === 'fulfilled' && profileRes.value.data?.user) {
                    const roleStr = typeof profileRes.value.data.user.role === 'string' ? profileRes.value.data.user.role.toLowerCase().replace(/\s+|_/g, '_') : 'user';
                    const updatedUser = { 
                        ...profileRes.value.data.user, 
                        role: roleStr,
                        isLoggedIn: true,
                        token: storedToken
                    };
                    safeSetItem('simplish_user', updatedUser);
                    setUser(updatedUser);
                }
            } catch (err) {
                console.log('Session sync issues:', err);
            } finally {
                setLoading(false);
            }
        };

        syncProfile();
    }, []);

    const value = {
        user,
        setUser,
        language,
        setLanguage: updateLanguage,
        loading,
        handleAuthSuccess,
        handleLogout,
        refreshUserContext,
        isPrivileged: ['moderator', 'admin', 'super_admin'].includes(user?.role)
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
