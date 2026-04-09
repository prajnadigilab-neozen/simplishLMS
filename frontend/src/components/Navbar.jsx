import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Sparkles, 
    Sun, 
    Moon, 
    Zap, 
    Wallet, 
    LayoutDashboard, 
    Library, 
    ShieldCheck, 
    User as UserIcon,
    LogOut,
    ChevronDown,
    Settings,
    CreditCard
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProvider, useUser } from '../context/UserContext';
import logoImg from '../assets/logo_final.jpg';

const Navbar = ({ onNavigate }) => {
    const { user, handleLogout, language, setLanguage } = useUser();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleLanguage = () => {
        const newLang = language === 'kn' ? 'en' : 'kn';
        setLanguage(newLang);
    };

    const role = user?.role?.toLowerCase();
    const isAdmin = ['admin', 'moderator', 'super_admin'].includes(role);
    const currentPath = location.pathname.replace('/', '') || 'dashboard';

    const navItems = [
        { id: 'dashboard', label: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', en: 'Dashboard', icon: LayoutDashboard },
        { id: 'study_area', label: 'ಅಭ್ಯಾಸ ವಿಭಾಗ', en: 'Study Area', icon: Sparkles },
        { id: 'library', label: 'ನನ್ನ ಲೈಬ್ರರಿ', en: 'My Library', icon: Library },
        { id: 'payment', label: 'ಪ್ರೀಮಿಯಂ ಪಡೆಯಿರಿ', en: 'Go Premium', icon: CreditCard },
        ...(isAdmin ? [{ id: 'admin', label: 'ಅಡ್ಮಿನ್', en: 'Admin', icon: ShieldCheck }] : []),
    ];

    const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

    return (
        <div className="top-navbar" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 1rem', // Reduced padding for mobile
            background: 'var(--nav-bg)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 1001,
            height: 'var(--nav-height)',
        }}>
            {/* ── Left Section: Logo & Branding ── */}
        <div 
            style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
            <div 
                onClick={() => onNavigate('dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
                <div style={{ 
                    background: 'white', // High contrast background for the logo
                    padding: '2px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img src={logoImg} alt="Simplish" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                </div>
            </div>
        </div>

        {/* ── Center Section: Navigation Links ── */}
            <nav className="desktop-only" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {navItems.map(item => {
                    const isActive = currentPath === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            style={{
                                background: isActive ? 'var(--primary-light)' : 'transparent',
                                border: 'none',
                                padding: '0.6rem 1.25rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative'
                            }}
                        >
                            {item.id === 'study_area' ? (
                                <img 
                                    src={logoImg} 
                                    alt="Icon" 
                                    style={{ 
                                        width: '18px', 
                                        height: '18px', 
                                        borderRadius: '4px', 
                                        filter: isActive ? 'none' : 'grayscale(100%) opacity(0.6)' 
                                    }} 
                                />
                            ) : (
                                <item.icon size={18} />
                            )}
                            <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 800 : 500 }}>
                                {language === 'kn' ? item.label : item.en}
                            </span>
                            {isActive && (
                                <motion.div 
                                    layoutId="activeNav"
                                    style={{
                                        position: 'absolute',
                                        bottom: '-4px',
                                        left: '20%',
                                        right: '20%',
                                        height: '2px',
                                        background: 'var(--primary)',
                                        borderRadius: '2px'
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* ── Right Section: Status Pills & Profile ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                {/* Wallet Balance Pill */}
                {user && (
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/payment')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 1.25rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRight: '1px solid var(--border)', paddingRight: '0.75rem' }}>
                            <Wallet size={16} color="var(--primary)" />
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                ₹{typeof user.wallet_balance === 'number' ? user.wallet_balance.toFixed(2) : Number(user.wallet_balance || 0).toFixed(2)}
                            </span>
                        </div>
                        
                        {(() => {
                            const expiry = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
                            const now = new Date();
                            const diff = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : 0;
                            const isActive = diff > 0;
                            const isLifetime = diff > 3650;

                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Zap size={16} color={isActive ? "#fbbf24" : "var(--text-muted)"} fill={isActive ? "#fbbf24" : "none"} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                        {isLifetime ? 'Lifetime' : isActive ? `${diff}d` : 'InActive'}
                                    </span>
                                </div>
                            );
                        })()}
                    </motion.div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Language Toggle */}
                    <button
                        onClick={toggleLanguage}
                        style={{
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            border: '1px solid var(--primary)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--primary)',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ opacity: language === 'kn' ? 1 : 0.4 }}>KN</span>
                        <div style={{ width: '1px', height: '12px', background: 'var(--primary)', opacity: 0.3 }} />
                        <span style={{ opacity: language === 'en' ? 1 : 0.4 }}>EN</span>
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            padding: '0.6rem',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex'
                        }}
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>

                    {/* Profile Dropdown Trigger */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={toggleProfile}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.4rem 0.75rem',
                                background: 'rgba(var(--primary-rgb), 0.1)',
                                border: '1px solid var(--primary)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: 'var(--primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                overflow: 'hidden'
                            }}>
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    user?.fullName?.charAt(0) || 'U'
                                )}
                            </div>
                            <ChevronDown size={16} color="var(--primary)" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
                        </button>

                        <AnimatePresence>
                            {isProfileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 0.5rem)',
                                        right: 0,
                                        width: '240px',
                                        background: 'var(--bg-dropdown)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        padding: '1rem',
                                        zIndex: 1002
                                    }}
                                >
                                    {/* User Info Header */}
                                    <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                                        <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>{user?.fullName}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>
                                            {user?.role?.replace('_', ' ')}
                                        </p>
                                    </div>

                                    {/* Menu List */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <button 
                                            onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem',
                                                border: 'none', background: 'none', color: 'var(--text-main)', borderRadius: '12px', cursor: 'pointer', transition: '0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <UserIcon size={18} color="var(--primary)" />
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                                {language === 'kn' ? 'ಖಾತೆ ವಿವರಗಳು (Profile)' : 'Profile Settings'}
                                            </span>
                                        </button>
                                        <button 
                                            onClick={() => { handleLogout(); setIsProfileOpen(false); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem',
                                                border: 'none', background: 'none', color: '#e11d48', borderRadius: '12px', cursor: 'pointer', transition: '0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(225, 29, 72, 0.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <LogOut size={18} />
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                                {language === 'kn' ? 'ಲಾಗಿನ್ ಅಂತ್ಯ (Logout)' : 'Logout'}
                                            </span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
