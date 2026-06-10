import React from 'react';
import {
    LayoutDashboard,
    Library,
    Sparkles,
    Trophy,
    User,
    Settings,
    Flame,
    Upload,
    ShieldAlert,
    BarChart3,
    CreditCard,
    X
} from 'lucide-react';
import { motion } from 'framer-motion';
import simplishTalksLogo from '../assets/logo_final.png';

const Sidebar = ({ onNavigate, currentView, user, onLogout, isOpen, onClose }) => {
    const role = user?.role?.toLowerCase();

    // ── Navigation Categories ────────────────────────────────────────────────
    const categories = [
        {
            title: 'ಲರ್ನಿಂಗ್ (Learning)',
            items: [
                { icon: LayoutDashboard, label: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ (Dashboard)', id: 'dashboard' },
                { icon: Sparkles, label: 'ಸ್ಟಡಿ ಏರಿಯಾ (Study Area)', id: 'study_area' },
                { icon: Library, label: 'ನನ್ನ ಲೈಬ್ರರಿ (My Library)', id: 'library' },
                { icon: CreditCard, label: 'ಪ್ರೀಮಿಯಂ (Go Premium)', id: 'payment' },
            ]
        },
        {
            title: 'ನಿರ್ವಹಣೆ (Management)',
            roles: ['admin', 'moderator', 'super_admin'],
            items: [
                { icon: LayoutDashboard, label: 'ಅಡ್ಮಿನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ (Admin Dashboard)', id: 'admin' },
            ]
        },
        {
            title: 'ಸೆಟ್ಟಿಂಗ್ಸ್ (Settings)',
            items: [
                { icon: User, label: 'ಪ್ರೊಫೈಲ್ (Profile)', id: 'profile' },
            ]
        }
    ].map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
            if (!item.roles) return true;
            return item.roles.some(r => r.toLowerCase() === role);
        })
    })).filter(cat => {
        if (!cat.roles) return cat.items.length > 0;
        return cat.roles.some(r => r.toLowerCase() === role) && cat.items.length > 0;
    });

    return (
        <div className={`sidebar glass-card ${isOpen ? 'open' : ''}`} style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            paddingBottom: '1.5rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                        src={simplishTalksLogo}
                        alt="Logo"
                        style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'contain',
                            flexShrink: 0
                        }}
                    />
                    <h2 style={{
                        margin: 0,
                        fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
                        fontSize: '1.7rem',
                        fontWeight: 'bold',
                        letterSpacing: '-0.5px',
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>
                        <span style={{ color: '#007FFF', textTransform: 'lowercase' }}>sim</span>
                        <span style={{ color: '#00A86B', textTransform: 'lowercase' }}>plish</span>
                        <span style={{ color: 'var(--text-main)', marginLeft: '6px', fontWeight: '600', fontSize: '1.2rem', textTransform: 'uppercase' }}>LMS</span>
                    </h2>
                </div>
                <button
                    className="mobile-only"
                    onClick={onClose}
                    style={{
                        background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '50%',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-main)', cursor: 'pointer'
                    }}
                    aria-label="Close Menu"
                >
                    <X size={18} />
                </button>
            </div>

            <nav style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                flex: 1,
                overflowY: 'auto',
                paddingRight: '0.5rem'
            }}>
                {categories.map((category) => (
                    <div key={category.title}>
                        <p style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-main)',
                            opacity: 0.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '0.75rem',
                            paddingLeft: '1rem',
                            fontWeight: 'bold'
                        }}>
                            {category.title}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {category.items.map((item) => (
                                <motion.div
                                    key={item.id}
                                    whileHover={{ x: 5, backgroundColor: 'rgba(var(--primary-rgb), 0.05)' }}
                                    onClick={() => onNavigate(item.id)}
                                    className="flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: currentView === item.id ? 'var(--primary-light)' : 'transparent'
                                    }}
                                >
                                    {item.id === 'study_area' ? (
                                        <img src={simplishTalksLogo} alt="Study" style={{ width: '18px', height: '18px', borderRadius: '4px', filter: currentView === 'study_area' ? 'none' : 'grayscale(100%) opacity(0.6)' }} />
                                    ) : (
                                        <item.icon size={18} color={currentView === item.id ? "var(--primary)" : "var(--text-muted)"} />
                                    )}
                                    <span style={{
                                        fontSize: '0.85rem',
                                        color: currentView === item.id ? 'var(--text-main)' : 'var(--text-muted)',
                                        fontWeight: currentView === item.id ? '600' : '400'
                                    }}>
                                        {item.label}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom Section: Profile & Logout */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'var(--bg-dark)',
                borderRadius: '1.25rem',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}>
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user?.fullName?.charAt(0) || 'U'
                        )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <p style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {user?.fullName || 'User'}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {user?.role?.replace('_', ' ')}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(225, 29, 72, 0.2)',
                        background: 'rgba(225, 29, 72, 0.1)',
                        color: '#e11d48',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => { e.target.style.background = 'rgba(225, 29, 72, 0.2)'; }}
                    onMouseOut={(e) => { e.target.style.background = 'rgba(225, 29, 72, 0.1)'; }}
                >
                    ಲಾಗ್ ಔಟ್ (Logout)
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
