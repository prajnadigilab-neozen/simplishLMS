import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { safeGetItem, safeSetItem } from '../utils/storageUtils';
import AuthForm from './AuthForm';
import simplishLogo from '../assets/simplish_logo.png';
import simplishTalksLogo from '../assets/logo_final.png';

const LandingPage = ({ onAuthSuccess }) => {
    const [lang, setLang] = useState(() => safeGetItem('simplish_language') || 'kn');
    const [theme, setTheme] = useState(safeGetItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        safeSetItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        safeSetItem('simplish_language', lang);
    }, [lang]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const content = {
        en: {
            heroBadge: "Your Success Language",
            heroTitle: "English is Just a Language,",
            heroTitleAccent: "Not a Measure of Your Worth.",
            heroDesc: "Turn your fear into freedom. Join Karnataka’s most welcoming English speaking course for Kannada speakers. We use your mother tongue to guide you from \"Zero to Confident\"—no shame, no pressure.",
            feature1: "Learn through your mother tongue (Kannada)",
            feature2: "Bilingual training to remove fear of judgment",
            feature3: "Learn at your own speed with a step-by-step guide.",
            feature4: "Master the material through a structured curriculum.",
            footerCopyright: "© 2026 SIMPLISH"
        },
        kn: {
            heroBadge: "ನಿಮ್ಮ ಯಶಸ್ಸಿನ ಭಾಷೆ",
            heroTitle: "ಇಂಗ್ಲಿಷ್ ಒಂದು ಭಾಷೆ ಮಾತ್ರ,",
            heroTitleAccent: "ನಿಮ್ಮ ಮೌಲ್ಯ ಅದರಿಂದ ನಿರ್ಧಾರವಾಗುವುದಿಲ್ಲ",
            heroDesc: "ನಿಮ್ಮ ಭಯವನ್ನು ಆತ್ಮವಿಶ್ವಾಸವಾಗಿ ಬದಲಾಯಿಸಿ. ಕನ್ನಡ ಮಾತನಾಡುವವರಿಗಾಗಿ ಕರ್ನಾಟಕದ ಅತ್ಯಂತ ಸುಲಭವಾದ ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡುವ ಕೋರ್ಸ್‌ಗೆ ಸೇರಿ. ನಾವು ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯ ಮೂಲಕ ನಿಮ್ಮನ್ನು \"ತಳ ಹಂತದಿಂದ ಉನ್ನತ ಮಟ್ಟದವರೆಗೆ\" ಮುನ್ನಡೆಸುತ್ತೇವೆ - ಯಾವುದೇ ಮುಜುಗರವಿಲ್ಲ, ಯಾವುದೇ ಒತ್ತಡವಿಲ್ಲ.",
            feature1: "ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯ (ಕನ್ನಡ) ಮೂಲಕ ಕಲಿಯಿರಿ",
            feature2: "ಭಯವನ್ನು ಹೋಗಲಾಡಿಸುವ ದ್ವಿಭಾಷಾ ತರಬೇತಿ",
            feature3: "ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿಯೊಂದಿಗೆ ನಿಮ್ಮದೇ ವೇಗದಲ್ಲಿ ಕಲಿಯಿರಿ.",
            feature4: "ವ್ಯವಸ್ಥಿತ ಪಠ್ಯಕ್ರಮದೊಂದಿಗೆ ವಿಷಯವನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ಕರಗತ ಮಾಡಿಕೊಳ್ಳಿ.",
            footerCopyright: "© 2026 SIMPLISH"
        }
    };

    const t = content[lang];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)', color: 'var(--text-main)', transition: 'background-color 0.2s ease' }}>
            {/* Header / Navbar */}
            <nav style={{
                padding: '0.75rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid var(--border)',
                position: 'sticky',
                top: 0,
                background: 'var(--nav-bg)',
                zIndex: 1000,
                transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img
                            src={simplishTalksLogo}
                            alt="SIMPLISH - Learn English via Kannada"
                            style={{
                                width: '52px',
                                height: '52px',
                                objectFit: 'contain',
                                flexShrink: 0
                            }}
                        />
                    <span style={{
                        fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
                        fontSize: '2.0rem',
                        fontWeight: 'bold',
                        letterSpacing: '-0.5px',
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>
                        <span style={{ color: '#007FFF', textTransform: 'lowercase' }}>sim</span>
                        <span style={{ color: '#00A86B', textTransform: 'lowercase' }}>plish</span>
                        <span style={{ color: 'var(--text-main)', marginLeft: '6px', fontWeight: '600', fontSize: '1.35rem', textTransform: 'uppercase' }}>LMS</span>
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Download App Button */}
                    <a
                        href="/simplish.apk"
                        download
                        title="Download Android App"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0.4rem',
                            background: 'var(--bg-card)',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            color: 'var(--text-main)',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.transform = 'none';
                        }}
                    >
                        <img
                            src="/logo_app.jpg"
                            alt="App Icon"
                            style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                objectFit: 'cover'
                            }}
                        />
                        <span className="desktop-only">{lang === 'kn' ? 'ಆ್ಯಪ್ ಡೌನ್‌ಲೋಡ್' : 'Download App'}</span>
                    </a>

                    {/* Language Switcher */}
                    <div style={{ display: 'flex', background: 'var(--bg-dark)', padding: '0.2rem', borderRadius: '0.4rem', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => setLang('en')}
                            aria-label="Switch interface to English"
                            style={{
                                padding: '0.4rem 0.6rem',
                                border: 'none',
                                borderRadius: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: lang === 'en' ? 'var(--primary)' : 'transparent',
                                color: lang === 'en' ? 'white' : 'var(--text-muted)'
                            }}
                        >EN</button>
                        <button
                            onClick={() => setLang('kn')}
                            aria-label="ಕನ್ನಡ ಭಾಷೆಗೆ ಬದಲಾಯಿಸಿ"
                            style={{
                                padding: '0.4rem 0.6rem',
                                border: 'none',
                                borderRadius: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: lang === 'kn' ? 'var(--primary)' : 'transparent',
                                color: lang === 'kn' ? 'white' : 'var(--text-muted)'
                            }}
                        >ಕನ್ನಡ</button>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                        style={{
                            padding: '0.4rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0.4rem',
                            background: 'var(--bg-card)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            width: '32px',
                            height: '32px'
                        }}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '2rem 1.5rem' }}>
                <div style={{
                    maxWidth: '1100px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '3rem',
                    alignItems: 'center'
                }}>
                    {/* Left Column: Localized Brand Message */}
                    <motion.div
                        key={lang}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}
                    >
                        <div>
                            <span style={{
                                background: 'var(--accent)',
                                color: '#ffffff',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                letterSpacing: '0.05em',
                                marginBottom: '0.75rem'
                            }}>
                                <Sparkles size={12} /> {t.heroBadge}
                            </span>
                            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', margin: 0, lineHeight: 1.2, fontWeight: 900, color: 'var(--text-main)' }}>
                                {t.heroTitle} <br />
                                <span style={{ color: 'var(--primary)' }}>{t.heroTitleAccent}</span>
                            </h1>
                        </div>

                        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
                            {t.heroDesc}
                        </p>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

                        {/* Highlighting Value Propositions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>
                                <span>{t.feature1}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>
                                <span>{t.feature2}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>
                                <span>{t.feature3}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>
                                <span>{t.feature4}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Centered Auth Form */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <AuthForm onLoginSuccess={onAuthSuccess} language={lang} />
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                padding: '1.5rem',
                textAlign: 'center',
                borderTop: '2px solid var(--border)',
                background: 'var(--nav-bg)',
                transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>{t.footerCopyright}</div>
            </footer>
        </div>
    );
};

export default LandingPage;
