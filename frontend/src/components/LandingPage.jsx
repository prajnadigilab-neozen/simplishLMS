import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, MessageSquare, ShieldCheck, ChevronDown, ChevronUp, Briefcase, GraduationCap, Users, Sun, Moon } from 'lucide-react';
import { safeGetItem, safeSetItem } from '../utils/storageUtils';
import AuthForm from './AuthForm';
import simplishLogo from '../assets/simplish_logo.jpg';
import simplishTalksLogo from '../assets/logo_final.jpg';
import logoApp from '../assets/logo_app.jpg';

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
    const [lang, setLang] = useState(() => safeGetItem('simplish_language') || 'kn');
    const [theme, setTheme] = useState(safeGetItem('theme') || 'light');
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleDownloadApp = (e) => {
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isiOS) {
            e.preventDefault();
            alert(lang === 'en'
                ? "To install: Tap the Share button in Safari, then select 'Add to Home Screen'."
                : "ಸ್ಥಾಪಿಸಲು: Safari ಯಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ (Share) ಬಟನ್ ಟ್ಯಾಪ್ ಮಾಡಿ, ನಂತರ 'ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿ' (Add to Home Screen) ಆಯ್ಕೆಮಾಡಿ."
            );
        }
        // For Android and other devices, do NOT prevent default; let it download /simplish.apk directly.
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        safeSetItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        safeSetItem('simplish_language', lang);
    }, [lang]);

    useEffect(() => {
        document.title = lang === 'kn'
            ? "SIMPLISH LMS - ಕನ್ನಡದ ಮೂಲಕ ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ | Spoken English Course Kannada"
            : "SIMPLISH LMS - Learn English through Kannada | Best English Speaking Course in Karnataka";

        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', lang === 'kn'
            ? "ಕನ್ನಡ ಮಾತನಾಡುವವರಿಗಾಗಿ ಕರ್ನಾಟಕದ ಅತ್ಯಂತ ಸ್ನೇಹಪರ ಸ್ಪೋಕನ್ ಇಂಗ್ಲಿಷ್ ಕೋರ್ಸ್‌ಗೆ ಸೇರಿರಿ. ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯ ಮೂಲಕವೇ ಅತ್ಯುತ್ತಮ ಎಐ ಮತ್ತು ದ್ವಿಭಾಷಾ ತರಬೇತಿಯೊಂದಿಗೆ ಇಂಗ್ಲಿಷ್ ಕರಗತ ಮಾಡಿಕೊಳ್ಳಿ."
            : "Join Karnataka's best bilingual English speaking course for Kannada speakers. Learn English through Kannada step-by-step from zero to confident."
        );
    }, [lang]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const content = {
        en: {
            signIn: "Sign In",
            backHome: "Back to Home",
            heroBadge: "YOUR SUCCESS LANGUAGE | LEARN ENGLISH THROUGH KANNADA",
            heroTitle: "English is Just a Language,",
            heroTitleAccent: "Not a Measure of Your Worth.",
            heroDesc: "Turn your fear of judgment into professional confidence. Join the best bilingual English speaking course in Karnataka, specifically designed for Kannada speakers. Learn English grammar, sentence creation, and daily vocabulary at your own pace from zero to confident—with no shame and zero pressure.",
            ctaFundamentals: "Start Learning Fundamentals",
            productsTitle: "Master English Step-by-Step",
            productsDesc: "A structured bilingual curriculum designed for success.",
            prod1Title: "SIMPLISH (The Foundation)",
            prod1Sub: "Your Bilingual English Coach",
            prod1Desc: "Don't struggle with complicated rules. We teach you English through Kannada. Step-by-step, master basic grammar and sentence creation.",
            prod1Hook: "\"Never doubt, you can do it.\"",
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
            faq3Q: "Is this for true beginners?",
            faq3A: "Absolutely. We start from the very beginning—the simple and easy sentences—and grow from there at your pace.",
            faq4Q: "Do I need to attend live classes?",
            faq4A: "No travel, no rigid timings. Learn and practice whenever you want through your phone, anywhere in Karnataka.",
            footerMotto: "Empowering Kannada speakers with simple, accessible English.",
            footerCopyright: "© 2026 SIMPLISH - A Simple Movement for Excellence"
        },
        kn: {
            signIn: "ಸೈನ್ ಇನ್",
            backHome: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
            heroBadge: "ನಿಮ್ಮ ಯಶಸ್ಸಿನ ಭಾಷೆ | ಕನ್ನಡದ ಮೂಲಕವೇ ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ",
            heroTitle: "ಇಂಗ್ಲಿಷ್ ಕೇವಲ ಒಂದು ಭಾಷೆಯಷ್ಟೇ,",
            heroTitleAccent: "ಅದು ನಿಮ್ಮ ಯೋಗ್ಯತೆಯ ಅಳತೆಯಲ್ಲ.",
            heroDesc: "ನಿಮ್ಮ ಭಯವನ್ನು ಸ್ವಾತಂತ್ರ್ಯವಾಗಿ ಪರಿವರ್ತಿಸಿ. ಕನ್ನಡ ಮಾತನಾಡುವವರಿಗಾಗಿ ಕರ್ನಾಟಕದ ಅತ್ಯಂತ ಸ್ನೇಹಪರ ಇಂಗ್ಲಿಷ್ ಕಲಿಕಾ ಕೋರ್ಸ್ ಸೇರಿರಿ. ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯ ಮೂಲಕವೇ ಇಂಗ್ಲಿಷ್ ವ್ಯಾಕರಣ, ವಾಕ್ಯ ರಚನೆ ಮತ್ತು ದೈನಂದಿನ ಶಬ್ದಕೋಶವನ್ನು ಯಾವುದೇ ಭಯ ಅಥವಾ ಒತ್ತಡವಿಲ್ಲದೆ ಹಂತ-ಹಂತವಾಗಿ ಕರಗತ ಮಾಡಿಕೊಳ್ಳಿ.",
            ctaFundamentals: "ಮೂಲ ಕಲಿಕೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ",
            productsTitle: "ಹಂತ-ಹಂತವಾಗಿ ಇಂಗ್ಲಿಷ್ ಕರಗತ ಮಾಡಿಕೊಳ್ಳಿ",
            productsDesc: "ಯಶಸ್ಸಿಗಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ದ್ವಿಭಾಷಾ ಪಠ್ಯಕ್ರಮ.",
            prod1Title: "SIMPLISH (ಫೌಂಡೇಶನ್)",
            prod1Sub: "ನಿಮ್ಮ ದ್ವಿಭಾಷಾ ಇಂಗ್ಲಿಷ್ ಕೋಚ್",
            prod1Desc: "ಜಟಿಲವಾದ ನಿಯಮಗಳ ಬಗ್ಗೆ ಚಿಂತಿಸಬೇಡಿ. ನಾವು ನಿಮಗೆ ಕನ್ನಡದ ಮೂಲಕ ಇಂಗ್ಲಿಷ್ ಕಲಿಸುತ್ತೇವೆ. ಹಂತ-ಹಂತವಾಗಿ, ಮೂಲ ವ್ಯಾಕರಣ ಮತ್ತು ವಾಕ್ಯ ರಚನೆಯನ್ನು ಕಲಿಯಿರಿ.",
            prod1Hook: "\"ಯಾವಾಗಲೂ ಅನುಮಾನಿಸಬೇಡಿ, ನಿಮ್ಮಿಂದ ಸಾಧ್ಯವಿದೆ.\"",
            brandTitle: "ಗೋಡೆಯನ್ನು ಒಡೆಯುವುದು",
            brandDesc1: "ಬಹಳ ಸಮಯದಿಂದ ಇಂಗ್ಲಿಷ್ ಭಾಷೆಯು, ಕಠಿಣ ಪರಿಶ್ರಮ ಪಡುವ ಜನರನ್ನು ಅವರಿಗೆ ಅರ್ಹವಾದ ಉದ್ಯೋಗಗಳು, ಗೌರವ ಮತ್ತು ಅವಕಾಶಗಳಿಂದ ದೂರವಿಟ್ಟಿರುವ \"ಗೋಡೆ\"ಯಾಗಿದೆ. SIMPLISH ನಲ್ಲಿ, ನಾವು ಆ ಗೋಡೆಯನ್ನು ಒಡೆದು ಬಾಗಿಲನ್ನು ನಿರ್ಮಿಸುತ್ತಿದ್ದೇವೆ.",
            brandDesc2: "ನಮ್ಮ ನಂಬಿಕೆ ಏನೆಂದರೆ ಶಕ್ತಿಕರಣವು ಸುಲಭವಾಗಿ ಲಭ್ಯವಾಗುವ ಶಿಕ್ಷಣದಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಇಂಗ್ಲಿಷ್ ಕಲಿಯಲು ನೀವು ಕನ್ನಡವನ್ನು ಮರೆಯುವ ಅಗತ್ಯವಿಲ್ಲ - ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯೇ ನಿಮ್ಮ ದೊಡ್ಡ ಶಕ್ತಿ.",
            brandCTA: "ಇದು ನಿಮ್ಮ ಅವಕಾಶಗಳ ಬಾಗಿಲು.",
            resultsTitle: "ನೈಜ ಜಗತ್ತಿಗೆ ನೈಜ ಫಲಿತಾಂಶಗಳು",
            feat1Title: "ಕೆಲಸದ ಸ್ಥಳದಲ್ಲಿ ಯಶಸ್ಸು",
            feat1Desc: "ಸಂದರ್ಶನಗಳನ್ನು ಎದುರಿಸಲು ಮತ್ತು ನೀವು ಅರ್ಹವಾದ ಕೆಲಸವನ್ನು ಪಡೆಯಲು ಆತ್ಮವಿಶ್ವಾಸ ಬೆಳೆಸಿಕೊಳ್ಳಿ.",
            feat1Hook: "ನಡೆಯಿರಿ, ಧೈರ್ಯವಾಗಿ ಮಾತನಾಡಿ!",
            feat2Title: "ಪರೀಕ್ಷೆಗಳಲ್ಲಿ ಉತ್ತೀರ್ಣರಾಗಿ",
            feat2Desc: "ಪ್ರಶ್ನೆಗಳನ್ನು ನಿಖರವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ ಮತ್ತು ಉತ್ತರಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸಿರಿ.",
            feat3Title: "ಇನ್ನು ಸಂಕೋಚ ಬೇಡ",
            feat3Desc: "ಭಯವನ್ನು ಹೋಗಲಾಡಿಸಿ ಆತ್ಮವಿಶ್ವಾಸ ಹೆಚ್ಚಿಸುವ ದ್ವಿಭಾಷಾ ತರಬೇತಿಯೊಂದಿಗೆ ನಿಮ್ಮನ್ನು ಸಬಲಗೊಳಿಸಿ.",
            faqTitle: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಗಳು",
            faq1Q: "ನನಗೆ ಕನ್ನಡ ಮಾತ್ರ ತಿಳಿದಿದ್ದರೆ ಪರವಾಗಿಲ್ಲವೇ?",
            faq1A: "ಹೌದು! ನಮ್ಮ ವೇದಿಕೆಯನ್ನು ಕರ್ನಾಟಕಕ್ಕಾಗಿ ವಿಶೇಷವಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ. ನಾವು ವಿಷಯಗಳನ್ನು ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸುತ್ತೇವೆ, ಇದರಿಂದ ನಿಮಗೆ ತಕ್ಷಣ ಅರ್ಥವಾಗುತ್ತದೆ.",
            faq3Q: "ಇದು ಸಂಪೂರ್ಣ ಆರಂಭಿಕರಿಗಾಗಿ ಇದೆಯೇ?",
            faq3A: "ಖಂಡಿತವಾಗಿಯೂ. ನಾವು ತೀರಾ ಆರಂಭದಿಂದ - ಸರಳ ಮತ್ತು ಸುಲಭ ವಾಕ್ಯಗಳಿಂದ ಪ್ರಾರಂಭಿಸುತ್ತೇವೆ ಮತ್ತು ನಿಮ್ಮ ವೇಗಕ್ಕೆ ಅನುಗುಣವಾಗಿ ಅಭ್ಯಾಸ ಮಾಡಿ.",
            faq4Q: "ನಾನು ನೇರ ತರಗತಿಗಳಿಗೆ ಹಾಜರಾಗಬೇಕೇ?",
            faq4A: "ಯಾವುದೇ ಪ್ರಯಾಣವಿಲ್ಲ, ಯಾವುದೇ ಕಟ್ಟುನಿಟ್ಟಾದ ಸಮಯವಿಲ್ಲ. ಕರ್ನಾಟಕದ ಎಲ್ಲಿಯಾದರೂ ನಿಮ್ಮ ಫೋನ್ ಮೂಲಕ ಯಾವಾಗ ಬೇಕಾದರೂ ಕಲಿಯಿರಿ ಮತ್ತು ಅಭ್ಯಾಸ ಮಾಡಿ.",
            footerMotto: "ಸರಳ ಮತ್ತು ಸುಲಭವಾಗಿ ಲಭ್ಯವಿರುವ ಇಂಗ್ಲಿಷ್‌ನೊಂದಿಗೆ ಕನ್ನಡ ಮಾತನಾಡುವವರನ್ನು ಸಬಲಗೊಳಿಸುವುದು.",
            footerCopyright: "© 2026 SIMPLISH - ಉನ್ನತಿಯೆಡೆಗೆ ಸರಳ ಪಯಣ"
        }
    };

    const t = content[lang];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": lang === 'kn' ? "SIMPLISH LMS - ಕನ್ನಡದ ಮೂಲಕ ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ" : "SIMPLISH LMS - Learn English through Kannada",
        "description": lang === 'kn'
            ? "ಕನ್ನಡ ಮಾತನಾಡುವವರಿಗಾಗಿ ಕರ್ನಾಟಕದ ಅತ್ಯಂತ ಸ್ನೇಹಪರ ಸ್ಪೋಕನ್ ಇಂಗ್ಲಿಷ್ ಕೋರ್ಸ್‌ಗೆ ಸೇರಿರಿ. ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯ ಮೂಲಕವೇ ಇಂಗ್ಲಿಷ್ ಕರಗತ ಮಾಡಿಕೊಳ್ಳಿ."
            : "Join Karnataka's best bilingual English speaking course for Kannada speakers. Learn English through Kannada step-by-step from zero to confident.",
        "provider": {
            "@type": "Organization",
            "name": "Prajna DigiLab",
            "sameAs": "https://simplish.in"
        },
        "inLanguage": ["kn", "en"],
        "educationalLevel": "Beginner, Intermediate, Advanced",
        "offers": {
            "@type": "Offer",
            "price": "99",
            "priceCurrency": "INR"
        }
    };

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
                <a
                    href="/simplish.apk"
                    download
                    onClick={handleDownloadApp}
                    style={{
                        position: 'fixed',
                        top: '2rem',
                        right: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: 'white',
                        background: '#007FFF',
                        borderRadius: '0.375rem',
                        textDecoration: 'none',
                        boxShadow: '0 2px 4px rgba(0, 127, 255, 0.2)',
                        transition: 'transform 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)';
                        e.currentTarget.style.backgroundColor = '#0066cc';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = '#007FFF';
                    }}
                >
                    <img
                        src={logoApp}
                        alt="App Icon"
                        style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }}
                    />
                    {lang === 'en' ? 'Download App' : 'ಆಪ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ'}
                </a>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', scrollBehavior: 'smooth' }}>
            <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
            </script>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
                    {isMobile ? (
                        <button
                            onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
                            style={{
                                padding: '0.4rem 0.8rem',
                                border: '1px solid var(--border)',
                                borderRadius: '0.4rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: 'var(--bg-dark)',
                                color: 'var(--text-main)',
                                minHeight: '36px'
                            }}
                        >
                            {lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}
                        </button>
                    ) : (
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
                    )}

                    {/* Theme Toggle (Hidden on mobile) */}
                    {!isMobile && (
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
                    )}

                    {/* Download App Button (Mobile friendly) */}
                    <a
                        href="/simplish.apk"
                        download
                        onClick={handleDownloadApp}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            padding: isMobile ? '0.4rem' : '0.4rem 0.8rem',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            color: 'white',
                            background: '#007FFF',
                            borderRadius: '0.375rem',
                            textDecoration: 'none',
                            boxShadow: '0 2px 4px rgba(0, 127, 255, 0.2)',
                            transition: 'transform 0.2s, background-color 0.2s',
                            minHeight: isMobile ? '36px' : '48px',
                            minWidth: isMobile ? '36px' : '48px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)';
                            e.currentTarget.style.backgroundColor = '#0066cc';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.backgroundColor = '#007FFF';
                        }}
                    >
                        <img
                            src={logoApp}
                            alt="App Icon"
                            style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                        {!isMobile && (lang === 'en' ? 'App' : 'ಆಪ್')}
                    </a>

                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAuth(true)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--text-main)', color: 'var(--bg-dark)', minHeight: isMobile ? '36px' : '48px' }}
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
                        <a
                            href="/simplish.apk"
                            download
                            onClick={handleDownloadApp}
                            style={{
                                width: '100%',
                                padding: '1.25rem',
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                background: 'transparent',
                                border: '3px solid #007FFF',
                                color: '#007FFF',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                textDecoration: 'none',
                                boxSizing: 'border-box',
                                transition: 'transform 0.2s, background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.backgroundColor = 'rgba(0, 127, 255, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <img
                                src={logoApp}
                                alt="App Icon"
                                style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                            {lang === 'en' ? 'Download Android App' : 'ಆಂಡ್ರಾಯ್ಡ್ ಆಪ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ'}
                        </a>
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

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {/* Product 1 */}
                        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', width: '100%' }}>
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
                            { q: t.faq1Q, a: t.faq1A }, { q: t.faq3Q, a: t.faq3A }, { q: t.faq4Q, a: t.faq4A }
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

                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{t.footerCopyright}</div>
            </footer>
        </div>
    );
};

export default LandingPage;

