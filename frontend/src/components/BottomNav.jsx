import React from 'react';
import { motion } from 'framer-motion';
import { 
    LayoutDashboard, 
    Library, 
    CreditCard, 
    User, 
    Sparkles, 
    ShieldCheck 
} from 'lucide-react';

const BottomNav = ({ onNavigate, currentView, user, language }) => {
    const role = user?.role?.toLowerCase();
    const isAdmin = ['admin', 'moderator', 'super_admin'].includes(role);

    const items = [
        { icon: LayoutDashboard, label: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', id: 'dashboard', en: 'Dashboard' },
        { icon: Sparkles, label: 'ಅಭ್ಯಾಸ ವಿಭಾಗ', id: 'study_area', en: 'Study Area' },
        { icon: Library, label: 'ನನ್ನ ಲೈಬ್ರರಿ', id: 'library', en: 'My Library' },
        ...(isAdmin ? [{ icon: ShieldCheck, label: 'ಅಡ್ಮಿನ್', id: 'admin', en: 'Admin' }] : []),
        { icon: CreditCard, label: 'ಪ್ರೀಮಿಯಂ ಪಡೆಯಿರಿ', id: 'payment', en: 'Go Premium' },
        { icon: User, label: 'ನನ್ನ ಖಾತೆ', id: 'profile', en: 'Profile' },
    ];

    return (
        <nav className="bottom-nav" style={{
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
            height: '70px',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            padding: '0 0.5rem',
        }}>
            {items.map(item => {
                const isActive = currentView === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            flex: 1,
                            padding: '0.5rem 0',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="bottomNavActive"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    width: '32px',
                                    height: '3px',
                                    background: 'var(--primary)',
                                    borderRadius: '2px',
                                    boxShadow: '0 0 12px var(--primary)',
                                }}
                            />
                        )}
                        
                        <div style={{
                            color: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.6)',
                            transform: isActive ? 'translateY(-2px)' : 'none',
                            transition: 'all 0.3s ease',
                            padding: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            {item.id === 'study_area' ? (
                                <img 
                                    src="/logo.png" 
                                    alt="Study" 
                                    style={{ 
                                        width: '24px', 
                                        height: '24px', 
                                        borderRadius: '6px', 
                                        filter: isActive ? 'none' : 'grayscale(100%) brightness(1.2) opacity(0.8)',
                                        transition: 'all 0.3s ease'
                                    }} 
                                />
                            ) : (
                                <item.icon 
                                    size={24} 
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            )}
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: isActive ? '800' : '600',
                                letterSpacing: '0.02em',
                                color: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.6)',
                                transition: 'all 0.3s ease',
                                textAlign: 'center'
                            }}>
                                {language === 'kn' ? item.label : item.en}
                            </span>
                        </div>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
