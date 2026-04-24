import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, MessageSquare, ShieldCheck, ChevronDown, ChevronUp, Briefcase, GraduationCap, Users, Sun, Moon } from 'lucide-react';
import { safeGetItem, safeSetItem } from '../utils/storageUtils';
import AuthForm from './AuthForm';
import simplishLogo from '../assets/simplish_logo.jpg';
import simplishTalksLogo from '../assets/logo_final.jpg';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '0.5rem 0'
                }}
            >
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{question}</h4>
                {isOpen ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, paddingBottom: '1rem' }}>{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const LandingPage = ({ onAuthSuccess }) => {
    const [showAuth, setShowAuth] = useState(false);
    const [lang, setLang] = useState('en'); // 'en' or 'kn'
    const [theme, setTheme] = useState(safeGetItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        safeSetItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const content = {
        en: {
            signIn: "Sign In",
            backHome: "Back to Home",
            heroBadge: "Your Success Language",
            heroTitle: "English is Just a Language,",
            heroTitleAccent: "Not a Measure of Your Worth.",
            heroDesc: "Turn your fear into freedom. Join Karnataka’s most welcoming English speaking course for Kannada speakers. We use your mother tongue to guide you from \"Zero to Confident\"—no shame, no pressure.",
            ctaFundamentals: "Start Learning Fundamentals",
            ctaSpeaking: "Start Speaking Now",
            productsTitle: "Two Simple Ways to Master English",
            productsDesc: "Choose your path or excel in both.",
            prod1Title: "SIMPLISH (The Foundation)",
            prod1Sub: "Your Bilingual English Coach",
            prod1Desc: "Don't struggle with complicated rules. We teach you English through Kannada. Step-by-step, master basic grammar and sentence creation.",
            prod1Hook: "\"Never doubt, you can do it.\"",
            prod2Title: "SIMPLISH - Talks (The Action)",
            prod2Sub: "Practice Without Judgement",
            prod2Desc: "Practice speaking anytime with friendly AI agents. Engage in real-life situations without any pressure of physical classes.",
            prod2Feat1: "Zero to Simple English",
            prod2Feat2: "No Physical Class Needed",
            brandTitle: "Breaking the Wall",
            brandDesc1: "For too long, English has been a \"wall\" keeping hard-working people away from the jobs, respect, and opportunities they deserve. At SIMPLISH, we are breaking that wall down and building a door.",
            brandDesc2: "We believe rural empowerment starts with accessible education. You don't need to forget Kannada to learn English—your mother tongue is your greatest strength.",
            brandCTA: "Your Door to Opportunity",
            resultsTitle: "Real Results for the Real World",
            feat1Title: "Workplace Success",
            feat1Desc: "Build confidence to clear interviews and get the job you deserve.",
            feat1Hook: "Nadeyiri, dhairyavagi mathanadi!",
            feat2Title: "Pass Exams",
            feat2Desc: "Understand questions accurately and express answers clearly.",
            feat3Title: "No More Shyness",
            feat3Desc: "Empower yourself with bilingual training that removes the fear of judgment.",
            faqTitle: "Answers to Your Questions",
            faq1Q: "Is it okay if I only know Kannada?",
            faq1A: "Yes! Our platform is perfectly designed for Karnataka. We explain concepts in Kannada so everything makes sense to you instantly.",
            faq2Q: "How does the AI coach work?",
            faq2A: "Imagine practicing with a polite friend who never judges you. SIMPLISH - Talks uses AI to let you chat privately on your phone, offering gentle corrections and encouragement.",
            faq3Q: "Is this for true beginners?",
            faq3A: "Absolutely. We start from the very beginning—the simple and easy sentences—and grow from there at your pace.",
            faq4Q: "Do I need to attend live classes?",
            faq4A: "No travel, no rigid timings. Learn and practice whenever you want through your phone, anywhere in Karnataka.",
            footerMotto: "Empowering Kannada speakers with simple, accessible English.",
            footerCopyright: "© 2026 SIMPLISH - A Simple Movement for Excellence",
            footerLinks: ["Contact Us", "Privacy Policy", "Terms of Service"]
        },
        kn: {
            signIn: "ಸೈನ್ ಇನ್",
            backHome: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
            heroBadge: "ನಿಮ್ಮ ಯಶಸ್ಸಿನ ಭಾಷೆ",
            heroTitle: "ಇಂಗ್ಲಿಷ್ ಒಂದು ಭಾಷೆ ಮಾತ್ರ,",
            heroTitleAccent: "ನಿಮ್ಮ ಮೌಲ್ಯ ಅದರಿಂದ ನಿರ್ಧಾರವಾಗುವುದಿಲ್ಲ",
            heroDesc: "ನಿಮ್ಮ ಭಯವನ್ನು ಆತ್ಮವಿಶ್ವಾಸವಾಗಿ ಬದಲಾಯಿಸಿ. ಕನ್ನಡ ಮಾತನಾಡುವವರಿಗಾಗಿ ಕರ್ನಾಟಕದ ಅತ್ಯಂತ ಸುಲಭವಾದ ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡುವ ಕೋರ್ಸ್‌ಗೆ ಸೇರಿ. ನಾವು ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯ ಮೂಲಕ ನಿಮ್ಮನ್ನು \"ತಳ ಹಂತದಿಂದ ಉನ್ನತ ಮಟ್ಟದವರೆಗೆ\" ಮುನ್ನಡೆಸುತ್ತೇವೆ - ಯಾವುದೇ ಮುಜುಗರವಿಲ್ಲ, ಯಾವುದೇ ಒತ್ತಡವಿಲ್ಲ.",
            ctaFundamentals: "ಮೂಲ ಕಲಿಕೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ",
            ctaSpeaking: "ಈಗಲೇ ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ",
            productsTitle: "ಇಂಗ್ಲಿಷ್ ಕಲಿಯಲು ಎರಡು ಸರಳ ಮಾರ್ಗಗಳು",
            productsDesc: "ನಿಮ್ಮ ದಾರಿಯನ್ನು ಆರಿಸಿ ಅಥವಾ ಎರಡರಲ್ಲೂ ಉತ್ತಮರಾಗಿ.",
            prod1Title: "SIMPLISH (ಫೌಂಡೇಶನ್)",
            prod1Sub: "ನಿಮ್ಮ ದ್ವಿಭಾಷಾ ಇಂಗ್ಲಿಷ್ ಕೋಚ್",
            prod1Desc: "ಜಟಿಲವಾದ ನಿಯಮಗಳ ಬಗ್ಗೆ ಚಿಂತಿಸಬೇಡಿ. ನಾವು ನಿಮಗೆ ಕನ್ನಡದ ಮೂಲಕ ಇಂಗ್ಲಿಷ್ ಕಲಿಸುತ್ತೇವೆ. ಹಂತ-ಹಂತವಾಗಿ, ಮೂಲ ವ್ಯಾಕರಣ ಮತ್ತು ವಾಕ್ಯ ರಚನೆಯನ್ನು ಕಲಿಯಿರಿ.",
            prod1Hook: "\"ಯಾವಾಗಲೂ ಅನುಮಾನಿಸಬೇಡಿ, ನಿಮ್ಮಿಂದ ಸಾಧ್ಯವಿದೆ.\"",
            prod2Title: "SIMPLISH - Talks (ಕ್ರಿಯೆ)",
            prod2Sub: "ಪೂರ್ವಾಗ್ರಹವಿಲ್ಲದೆ ಅಭ್ಯಾಸ ಮಾಡಿ",
            prod2Desc: "ಸ್ನೇಹಿ AI ಏಜೆಂಟ್‌ಗಳೊಂದಿಗೆ ಯಾವಾಗ ಬೇಕಾದರೂ ಮಾತನಾಡಲು ಅಭ್ಯಾಸ ಮಾಡಿ. ಯಾವುದೇ ದೈಹಿಕ ತರಗತಿಗಳ ಒತ್ತಡವಿಲ್ಲದೆ ನೈಜ ಜೀವನದ ಸಂದರ್ಭಗಳಲ್ಲಿ ತೊಡಗಿಸಿಕೊಳ್ಳಿ.",
            prod2Feat1: "ಶೂನ್ಯದಿಂದ ಸರಳ ಇಂಗ್ಲಿಷ್‌ಗೆ",
            prod2Feat2: "ದೈಹಿಕ ತರಗತಿಯ ಅಗತ್ಯವಿಲ್ಲ",
            brandTitle: "ಗೋಡೆಯನ್ನು ಒಡೆಯುವುದು",
            brandDesc1: "ಬಹಳ ಸಮಯದಿಂದ ಇಂಗ್ಲಿಷ್ ಭಾಷೆಯು, ಕಠಿಣ ಪರಿಶ್ರಮ ಪಡುವ ಜನರನ್ನು ಅವರಿಗೆ ಅರ್ಹವಾದ ಉದ್ಯೋಗಗಳು, ಗೌರವ ಮತ್ತು ಅವಕಾಶಗಳಿಂದ ದೂರವಿಟ್ಟಿರುವ \"ಗೋಡೆ\"ಯಾಗಿದೆ. SIMPLISH ನಲ್ಲಿ, ನಾವು ಆ ಗೋಡೆಯನ್ನು ಒಡೆದು ಬಾಗಿಲನ್ನು ನಿರ್ಮಿಸುತ್ತಿದ್ದೇವೆ.",
            brandDesc2: "ನಮ್ಮ ನಂಬಿಕೆ ಏನೆಂದರೆ ಶಕ್ತಿಕರಣವು ಸುಲಭವಾಗಿ ಲಭ್ಯವಾಗುವ ಶಿಕ್ಷಣದಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಇಂಗ್ಲಿಷ್ ಕಲಿಯಲು ನೀವು ಕನ್ನಡವನ್ನು ಮರೆಯುವ ಅಗತ್ಯವಿಲ್ಲ - ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯೇ ನಿಮ್ಮ ದೊಡ್ಡ ಶಕ್ತಿ.",
            brandCTA: "ಇದು ನಿಮ್ಮ ಅವಕಾಶಗಳ ಬಾಗಿಲು.",
            resultsTitle: "ನೈಜ ಜಗತ್ತಿಗೆ ನೈಜ ಫಲಿತಾಂಶಗಳು",
            feat1Title: "ಕೆಲಸದ ಸ್ಥಳದಲ್ಲಿ ಯಶಸ್ಸು",
            feat1Desc: "ಸಂದರ್ಶನಗಳನ್ನು ಎದುರಿಸಲು ಮತ್ತು ನೀವು ಅರ್ಹವಾದ ಕೆಲಸವನ್ನು ಪಡೆಯಲು ಆತ್ಮವಿಶ್ವಾಸ ಬೆಳೆಸಿಕೊಳ್ಳಿ.",
            feat1Hook: "ನಡೆಯಿರಿ, ಧೈರ್ಯವಾಗಿ ಮಾತನಾಡಿ!",
            feat2Title: "ಪರೀಕ್ಷೆಗಳಲ್ಲಿ ಉತ್ತೀರ್ಣರಾಗಿ",
            feat2Desc: "ಪ್ರಶ್ನೆಗಳನ್ನು ನಿಖರವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ ಮತ್ತು ಉತ್ತರಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವ್ಯಕ್ತಪಡಿಸಿ.",
            feat3Title: "ಇನ್ನು ಸಂಕೋಚ ಬೇಡ",
            feat3Desc: "ಭಯವನ್ನು ಹೋಗಲಾಡಿಸಿ ಆತ್ಮವಿಶ್ವಾಸ ಹೆಚ್ಚಿಸುವ ದ್ವಿಭಾಷಾ ತರಬೇತಿಯೊಂದಿಗೆ ನಿಮ್ಮನ್ನು ಸಬಲಗೊಳಿಸಿ.",
            faqTitle: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಗಳು",
            faq1Q: "ನನಗೆ ಕನ್ನಡ ಮಾತ್ರ ತಿಳಿದಿದ್ದರೆ ಪರವಾಗಿಲ್ಲವೇ?",
            faq1A: "ಹೌದು! ನಮ್ಮ ವೇದಿಕೆಯನ್ನು ಕರ್ನಾಟಕಕ್ಕಾಗಿ ವಿಶೇಷವಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ. ನಾವು ವಿಷಯಗಳನ್ನು ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸುತ್ತೇವೆ, ಇದರಿಂದ ನಿಮಗೆ ತಕ್ಷಣ ಅರ್ಥವಾಗುತ್ತದೆ.",
            faq2Q: "AI ಕೋಚ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?",
            faq2A: "ಯಾವಾಗಲೂ ನಿಮ್ಮನ್ನು ನಿರ್ಣಯಿಸದ ಒಬ್ಬ ಸುಸಂಸ್ಕೃತ ಸ್ನೇಹಿತರೊಂದಿಗೆ ಅಭ್ಯಾಸ ಮಾಡುವುದನ್ನು ಕಲ್ಪಿಸಿಕೊಳ್ಳಿ. SIMPLISH - Talks ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಖಾಸಗಿಯಾಗಿ ಮಾತನಾಡಲು AI ಅನ್ನು ಬಳಸುತ್ತದೆ, ತಿದ್ದುಪಡಿಗಳು ಮತ್ತು ಪ್ರೋತ್ಸಾಹವನ್ನು ನೀಡುತ್ತದೆ.",
            faq3Q: "ಇದು ಸಂಪೂರ್ಣ ಆರಂಭಿಕರಿಗಾಗಿ ಇದೆಯೇ?",
            faq3A: "ಖಂಡಿತವಾಗಿಯೂ. ನಾವು ತೀರಾ ಆರಂಭದಿಂದ - ಸರಳ ಮತ್ತು ಸುಲಭ ವಾಕ್ಯಗಳಿಂದ ಪ್ರಾರಂಭಿಸುತ್ತೇವೆ ಮತ್ತು ನಿಮ್ಮ ವೇಗಕ್ಕೆ ಅನುಗುಣವಾಗಿ ಅಭ್ಯಾಸ ಮಾಡಿ.",
            faq4Q: "ನಾನು ನೇರ ತರಗತಿಗಳಿಗೆ ಹಾಜರಾಗಬೇಕೇ?",
            faq4A: "ಯಾವುದೇ ಪ್ರಯಾಣವಿಲ್ಲ, ಯಾವುದೇ ಕಟ್ಟುನಿಟ್ಟಾದ ಸಮಯವಿಲ್ಲ. ಕರ್ನಾಟಕದ ಎಲ್ಲಿಯಾದರೂ ನಿಮ್ಮ ಫೋನ್ ಮೂಲಕ ಯಾವಾಗ ಬೇಕಾದರೂ ಕಲಿಯಿರಿ ಮತ್ತು ಅಭ್ಯಾಸ ಮಾಡಿ.",
            footerMotto: "ಸರಳ ಮತ್ತು ಸುಲಭವಾಗಿ ಲಭ್ಯವಿರುವ ಇಂಗ್ಲಿಷ್‌ನೊಂದಿಗೆ ಕನ್ನಡ ಮಾತನಾಡುವವರನ್ನು ಸಬಲಗೊಳಿಸುವುದು.",
            footerCopyright: "© 2026 SIMPLISH - ಉನ್ನತಿಯೆಡೆಗೆ ಸರಳ ಪಯಣ",
            footerLinks: ["ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ", "ಗೌಪ್ಯತಾ ನೀತಿ", "ಸೇವಾ ನಿಯಮಗಳು"]
        }
    };

    const t = content[lang];

    if (showAuth) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '2rem' }}>
                <AuthForm onLoginSuccess={onAuthSuccess} language={lang} />
                <button
                    onClick={() => setShowAuth(false)}
                    style={{ position: 'fixed', top: '2rem', left: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    ← {t.backHome}
                </button>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', scrollBehavior: 'smooth' }}>
            {/* Optimized Header (No Blur/Transparency for GPU) */}
            <nav style={{
                padding: '0.75rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid var(--border)',
                position: 'sticky',
                top: 0,
                background: 'var(--nav-bg)',
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        height: '42px',
                        width: '42px',
                        borderRadius: '0.6rem',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        background: 'white'
                    }}>
                        <img
                            src={simplishTalksLogo}
                            alt="SIMPLISH - Learn English via Kannada"
                            fetchPriority="high"
                            loading="eager"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }}
                        />
                    </div>
                    <span className="desktop-only" style={{
                        fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
                        textTransform: 'lowercase',
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        letterSpacing: '-0.5px'
                    }}>
                        <span style={{ color: '#007FFF' }}>sim</span>
                        <span style={{ color: '#00A86B' }}>plish</span>
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                            aria-label="ಕನ್ನಡ ಭಾಷೆಗೆ ಬದಲಾಯಿಸಿ (Switch to Kannada)"
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
                            background: 'var(--bg-dark)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            transition: 'all 0.2s ease'
                        }}
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>

                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAuth(true)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--text-main)', color: 'var(--bg-dark)' }}
                    >
                        {t.signIn}
                    </button>
                </div>
            </nav>

            {/* Performance-Optimized Hero */}
            <header style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 1.25rem', textAlign: 'center' }}>
                <motion.div
                    key={lang}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <span style={{
                        background: 'var(--accent)',
                        color: '#ffffff',
                        padding: '0.4rem 1rem',
                        borderRadius: '0.3rem',
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        display: 'inline-block',
                        marginBottom: '1rem',
                        letterSpacing: '0.05em'
                    }}>
                        {t.heroBadge}
                    </span>
                    <h1 style={{ fontSize: 'clamp(1.8rem, 7vw, 3rem)', margin: '0 0 1rem 0', lineHeight: 1.2, fontWeight: 900, color: 'var(--text-main)' }}>
                        {t.heroTitle} <br />
                        <span style={{ color: 'var(--primary)' }}>{t.heroTitleAccent}</span>
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '750px', margin: '0 auto 2rem auto', fontWeight: 600, lineHeight: 1.6 }}>
                        {t.heroDesc}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px', margin: '0 auto' }}>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', background: 'var(--primary)', fontWeight: 800 }}
                            onClick={() => setShowAuth(true)}
                        >
                            {t.ctaFundamentals}
                        </button>
                        <button
                            style={{
                                width: '100%',
                                padding: '1.25rem',
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                background: 'transparent',
                                border: '3px solid var(--accent)',
                                color: 'var(--accent)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer'
                            }}
                            onClick={() => setShowAuth(true)}
                        >
                            {t.ctaSpeaking}
                        </button>
                    </div>
                </motion.div>
            </header>

            {/* Products with High Contrast Buttons */}
            <section style={{ background: 'var(--bg-dark)', padding: '4rem 1.25rem', borderTop: '2px solid var(--border)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{t.productsTitle}</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{t.productsDesc}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {/* Product 1 */}
                        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{
                                height: '56px',
                                width: '56px',
                                borderRadius: '0.75rem',
                                overflow: 'hidden',
                                border: '1px solid var(--border)',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px'
                            }}>
                                <img
                                    src={simplishTalksLogo}
                                    alt="SIMPLISH"
                                    loading="lazy"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }}
                                />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>{t.prod1Title}</h3>
                            <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem' }}>{t.prod1Sub}</p>
                            <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.4 }}>{t.prod1Desc}</p>
                            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)', fontStyle: 'italic' }}>{t.prod1Hook}</p>
                        </div>

                        {/* Product 2 */}
                        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{
                                height: '56px',
                                width: '56px',
                                borderRadius: '0.75rem',
                                overflow: 'hidden',
                                border: '1px solid var(--border)',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px'
                            }}>
                                <img
                                    src={simplishTalksLogo}
                                    alt="SIMPLISH - Talks"
                                    loading="lazy"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>{t.prod2Title}</h3>
                            <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.9rem' }}>{t.prod2Sub}</p>
                            <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.4 }}>{t.prod2Desc}</p>
                            <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.4rem 0.8rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 800 }}>{t.prod2Feat1}</span>
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.4rem 0.8rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 800 }}>{t.prod2Feat2}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* High Contrast Brand Story (Accessible) */}
            <section style={{ padding: '3rem 1.25rem', maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{
                    background: 'var(--primary)',
                    borderRadius: '1rem',
                    padding: '3rem 1.5rem',
                    color: 'white'
                }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--accent)' }}>{t.brandTitle}</h2>
                    <p style={{ fontSize: '1.15rem', lineHeight: 1.6, color: '#f8fafc', marginBottom: '1.5rem' }}>{t.brandDesc1}</p>
                    <p style={{ fontSize: '1.15rem', lineHeight: 1.6, color: '#cbd5e1', marginBottom: '2rem' }}>{t.brandDesc2}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '3rem' }}>🚪</div>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'white' }}>{t.brandCTA}</span>
                    </div>
                </div>
            </section>

            {/* Results with optimized icons */}
            <section style={{ padding: '4rem 1.25rem', background: 'var(--bg-dark)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textAlign: 'center', marginBottom: '3rem' }}>{t.resultsTitle}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { icon: Briefcase, title: t.feat1Title, desc: t.feat1Desc, color: 'var(--primary)' },
                            { icon: GraduationCap, title: t.feat2Title, desc: t.feat2Desc, color: 'var(--accent)' },
                            { icon: Users, title: t.feat3Title, desc: t.feat3Desc, color: '#059669' }
                        ].map((f, i) => (
                            <div key={i} style={{ padding: '1.5rem', border: '2px solid #e2e8f0', borderRadius: '0.75rem' }}>
                                <f.icon size={28} color={f.color} style={{ marginBottom: '0.75rem' }} />
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>{f.title}</h4>
                                <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.4 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Legend-style FAQ (High Tappability) */}
            <section style={{ padding: '4rem 1.25rem', background: 'var(--bg-dark)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textAlign: 'center', marginBottom: '2.5rem', color: 'var(--text-main)' }}>{t.faqTitle}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { q: t.faq1Q, a: t.faq1A }, { q: t.faq2Q, a: t.faq2A }, { q: t.faq3Q, a: t.faq3A }, { q: t.faq4Q, a: t.faq4A }
                        ].map((item, i) => (
                            <FAQItem key={i} question={item.q} answer={item.a} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Clean Footer */}
            <footer style={{ padding: '3rem 1.25rem', textAlign: 'center', background: 'var(--bg-dark)', borderTop: '2px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        height: '40px',
                        width: '40px',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        background: 'white'
                    }}>
                        <img
                            src={simplishTalksLogo}
                            alt="SIMPLISH"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }}
                        />
                    </div>
                    <span style={{
                        fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
                        textTransform: 'lowercase',
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        letterSpacing: '-0.5px'
                    }}>
                        <span style={{ color: '#007FFF' }}>sim</span>
                        <span style={{ color: '#00A86B' }}>plish</span>
                    </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem' }}>{t.footerMotto}</p>
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
                    {t.footerLinks.map(link => <a key={link} href="#" style={{ color: 'var(--text-main)', textDecoration: 'underline', fontWeight: 800, fontSize: '0.9rem' }}>{link}</a>)}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{t.footerCopyright}</div>
            </footer>
        </div>
    );
};

export default LandingPage;

