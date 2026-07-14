import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, MessageSquare, ShieldCheck, ChevronDown, ChevronUp,
    Briefcase, GraduationCap, Users, Sun, Moon, Check, X, ArrowRight, Play,
    Award, Smartphone, HelpCircle, Heart, Star, Compass, ArrowUpRight, AlertCircle
} from 'lucide-react';
import { safeGetItem, safeSetItem } from '../utils/storageUtils';
import AuthForm from './AuthForm';
import { attributionApi } from '../utils/api';
import simplishTalksLogo from '../assets/logo_final.jpg';
import logoApp from '../assets/logo_app.jpg';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{
            borderBottom: '1px solid var(--border)',
            padding: '1.25rem 0',
            transition: 'all 0.3s ease'
        }}>
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
                    padding: '0.5rem 0',
                    outline: 'none'
                }}
            >
                <h4 style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <HelpCircle size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                    {question}
                </h4>
                <div style={{
                    background: isOpen ? 'var(--primary-light)' : 'transparent',
                    borderRadius: '50%',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                }}>
                    {isOpen ? <ChevronUp size={18} color="var(--primary)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <p style={{
                            color: 'var(--text-muted)',
                            lineHeight: 1.6,
                            padding: '0.5rem 0 1rem 2.25rem',
                            margin: 0,
                            fontSize: '1rem'
                        }}>{answer}</p>
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
        e.preventDefault();

        // Log click attribution
        const urlParams = new URLSearchParams(window.location.search);
        attributionApi.logClick({
            utm_source: urlParams.get('utm_source') || 'direct',
            utm_medium: urlParams.get('utm_medium') || 'direct-download',
            utm_campaign: urlParams.get('utm_campaign') || 'landing_page_pwa',
            screen_resolution: `${window.screen.width}x${window.screen.height}`
        }).catch(err => console.error('Failed to log click attribution', err));

        const promptEvent = window.deferredPrompt || deferredPrompt;
        if (promptEvent) {
            promptEvent.prompt();
            promptEvent.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the PWA install prompt');
                }
                window.deferredPrompt = null;
                setDeferredPrompt(null);
            }).catch(err => console.error("PWA prompt error:", err));
        } else {
            const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isiOS) {
                alert(lang === 'en'
                    ? "To install: Tap the Share button in Safari, then select 'Add to Home Screen'."
                    : "ಸ್ಥಾಪಿಸಲು: Safari ಯಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ (Share) ಬಟನ್ ಟ್ಯಾಪ್ ಮಾಡಿ, ನಂತರ 'ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿ' (Add to Home Screen) ಆಯ್ಕೆಮಾಡಿ."
                );
            } else {
                alert(lang === 'en'
                    ? "App may already be installed, or install prompt is unavailable. Look for 'Install App' in your browser menu."
                    : "ಆಪ್ ಈಗಾಗಲೇ ಸ್ಥಾಪಿತವಾಗಿರಬಹುದು. ನಿಮ್ಮ ಬ್ರೌಸರ್ ಮೆನುವಿನಲ್ಲಿ 'ಸ್ಥಾಪಿಸಿ' (Install) ಆಯ್ಕೆಯನ್ನು ನೋಡಿ."
                );
            }
        }
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
            // HERO SECTION
            preHeader: "📚 SIMPLISH LMS",
            preHeaderSub: "The Foundation of Confident English Communication",
            headline: "Learn English Through Kannada",
            subHeadline: "Understand how English sentences are built, explained step-by-step in your mother tongue.",
            stopMemorizing: "Stop memorizing grammar rules.",
            learnStructureText: "Learn the structure, meaning, and logic behind English sentences using simple Kannada explanations designed for complete beginners.",
            lmsAudienceText: "Whether you're preparing for interviews, workplace communication, exams, or everyday conversations, SIMPLISH LMS gives you the foundation you need.",
            ctaStartFree: "Start Learning Free",
            ctaViewPath: "View Learning Path",
            // Trust indicators
            trust1: "Beginner Friendly",
            trust2: "Learn Through Kannada",
            trust3: "Mobile Friendly",
            trust4: "Self-Paced Learning",

            // SECTION 2
            struggleTitle: "Why Most People Struggle With English",
            toldTitle: "Many learners are told:",
            toldItem1: "Memorize grammar",
            toldItem2: "Learn vocabulary lists",
            toldItem3: "Read English books",
            explainTitle: "But nobody explains:",
            explainItem1: "Why is this sentence formed this way?",
            explainItem2: "Why does the verb change?",
            explainItem3: "Why do English sentences sound different from Kannada?",
            struggleSummary: "Without understanding the structure, speaking becomes difficult.",
            struggleSolution: "SIMPLISH LMS solves this problem.",

            // SECTION 3
            bridgeTitle: "Learn English the Kannada Way",
            bridgeIntro: "Instead of teaching English only in English, we use Kannada as a bridge.",
            exampleTitle: "Visual Sentence Comparison",
            kannadaLabel: "Kannada (SOV Structure):",
            kannadaSentence: "ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ",
            englishLabel: "English (SVO Structure):",
            englishSentence: "I go to school.",
            subject: "Subject (ಕರ್ತೃ)",
            verb: "Verb (ಕ್ರಿಯಾಪದ)",
            object: "Object (ಕರ್ಮ)",
            sentenceStructure: "Sentence Structure",
            realLifeUsage: "Real-Life Usage",
            bridgeExplanation: "We break down how the Subject, Verb, and Object align and change. This makes English easier to understand and remember.",

            // SECTION 4
            learnTitle: "What You Will Learn",
            learnCard1Title: "Foundations",
            learnCard1Item1: "Alphabet & Sounds",
            learnCard1Item2: "Basic Words",
            learnCard1Item3: "Everyday Vocabulary",
            learnCard2Title: "Sentence Building",
            learnCard2Item1: "Subject, Verb, Object",
            learnCard2Item2: "Sentence Patterns",
            learnCard2Item3: "Constructing Statements",
            learnCard3Title: "Grammar Made Simple",
            learnCard3Item1: "Tenses & Time Frames",
            learnCard3Item2: "Articles & Prepositions",
            learnCard3Item3: "Question Formation",
            learnCard4Title: "Real Communication",
            learnCard4Item1: "Daily Conversations",
            learnCard4Item2: "Workplace English",
            learnCard4Item3: "Interview Preparation",

            // SECTION 5
            journeyTitle: "Your Learning Journey",
            lvl1Title: "Level 1: Beginner",
            lvl1Desc: "Start from absolute zero.",
            lvl2Title: "Level 2: Foundation",
            lvl2Desc: "Understand sentence construction.",
            lvl3Title: "Level 3: Intermediate",
            lvl3Desc: "Create your own sentences confidently.",
            lvl4Title: "Level 4: Advanced",
            lvl4Desc: "Use English naturally in everyday situations.",

            // SECTION 6
            diffTitle: "Why SIMPLISH LMS Is Different",
            colFocus: "Focus Area",
            colTraditional: "Traditional Courses",
            colSimplish: "SIMPLISH LMS",
            rowHeader1: "Core Style",
            row1Traditional: "Grammar memorization",
            row1Simplish: "Grammar understanding",
            rowHeader2: "Teaching Language",
            row2Traditional: "English-only teaching",
            row2Simplish: "Kannada-supported learning",
            rowHeader3: "Lesson Complexity",
            row3Traditional: "Complex explanations",
            row3Simplish: "Simple structured lessons",
            rowHeader4: "Student Engagement",
            row4Traditional: "Passive learning",
            row4Simplish: "Active understanding",
            rowHeader5: "Methodology",
            row5Traditional: "One-size-fits-all",
            row5Simplish: "Beginner-friendly pathway",

            // SECTION 7
            thinkTitle: "Designed for People Who Think...",
            think1Q: "\"My English is very weak.\"",
            think1A: "Perfect. We'll start from the basics.",
            think2Q: "\"I can understand but cannot speak.\"",
            think2A: "Strong understanding creates confident speaking.",
            think3Q: "\"I'm afraid of grammar.\"",
            think3A: "We simplify grammar using Kannada explanations.",
            think4Q: "\"I'm too old to learn.\"",
            think4A: "English is a skill, not a talent.",

            // SECTION 8
            faqTitle: "Answers to Your Questions",
            faq1Q: "Do I need prior English knowledge?",
            faq1A: "No. SIMPLISH LMS starts from the fundamentals.",
            faq2Q: "Is everything taught in English?",
            faq2A: "No. We use Kannada explanations to make learning easier.",
            faq3Q: "How much time should I spend daily?",
            faq3A: "15–20 minutes consistently is enough to make progress.",
            faq4Q: "Is this suitable for job seekers?",
            faq4A: "Yes. The course builds the foundation needed for interviews and workplace communication.",
            faq5Q: "Can I learn on my mobile phone?",
            faq5A: "Yes. SIMPLISH LMS is designed for mobile-first learning.",

            // SECTION 9
            nextTitle: "What Happens After LMS?",
            nextIntro: "Learning English has three stages.",
            step1Title: "Step 1: Learn with SIMPLISH LMS",
            step1Desc: "Understand English.",
            step2Title: "Step 2: Practice with SIMPLISH Talks",
            step2Desc: "Build speaking habits.",
            step3Title: "Step 3: Speak with SIMPLISH Snehi",
            step3Desc: "Gain real-world confidence.",

            // FINAL CTA
            finalCtaTitle: "Start Building Your English Foundation Today",
            finalCtaText: "You don't need perfect English. You don't need confidence. You don't need prior experience. You only need a starting point. SIMPLISH LMS will guide you from understanding English to using it with confidence.",
            footerMotto: "Empowering Kannada speakers with simple, accessible English.",
            footerCopyright: "© 2026 SIMPLISH - A Simple Movement for Excellence"
        },
        kn: {
            signIn: "ಸೈನ್ ಇನ್",
            backHome: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
            // HERO SECTION
            preHeader: "📚 SIMPLISH LMS",
            preHeaderSub: "ಇಂಗ್ಲಿಷ್ ಆತ್ಮವಿಶ್ವಾಸದ ಸಂವಹನಕ್ಕೆ ಭದ್ರ ಬುನಾದಿ",
            headline: "ಕನ್ನಡದ ಮೂಲಕ ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ",
            subHeadline: "ಇಂಗ್ಲಿಷ್ ವಾಕ್ಯಗಳನ್ನು ಹೇಗೆ ರಚಿಸಲಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ನಿಮ್ಮ ಮಾತೃಭಾಷೆಯಲ್ಲಿ ಹಂತ-ಹಂತವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.",
            stopMemorizing: "ವ್ಯಾಕರಣದ ನಿಯಮಗಳನ್ನು ಬಾಯಿಪಾಠ ಮಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿ.",
            learnStructureText: "ಸಂಪೂರ್ಣ ಆರಂಭಿಕರಿಗಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ಸರಳ ಕನ್ನಡ ವಿವರಣೆಗಳನ್ನು ಬಳಸಿಕೊಂಡು ಇಂಗ್ಲಿಷ್ ವಾಕ್ಯಗಳ ಹಿಂದಿರುವ ರಚನೆ, ಅರ್ಥ ಮತ್ತು ತರ್ಕವನ್ನು ಕಲಿಯಿರಿ.",
            lmsAudienceText: "ನೀವು ಸಂದರ್ಶನಗಳು, ಕೆಲಸದ ಸ್ಥಳದ ಸಂವಹನ, ಪರೀಕ್ಷೆಗಳು ಅಥವಾ ದೈನಂದಿನ ಸಂಭಾಷಣೆಗಳಿಗೆ ತಯಾರಿ ನಡೆಸುತ್ತಿರಲಿ, SIMPLISH LMS ನಿಮಗೆ ಅಗತ್ಯವಿರುವ ಬುನಾದಿಯನ್ನು ಒದಗಿಸುತ್ತದೆ.",
            ctaStartFree: "ಉಚಿತವಾಗಿ ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಿ",
            ctaViewPath: "ಕಲಿಕೆಯ ಮಾರ್ಗವನ್ನು ನೋಡಿ",
            // Trust indicators
            trust1: "ಆರಂಭಿಕ ಸ್ನೇಹಿ",
            trust2: "ಕನ್ನಡದ ಮೂಲಕವೇ ಕಲಿಕೆ",
            trust3: "ಮೊಬೈಲ್ ಸ್ನೇಹಿ",
            trust4: "ನಿಮ್ಮದೇ ವೇಗದಲ್ಲಿ ಕಲಿಯಿರಿ",

            // SECTION 2
            struggleTitle: "ಹೆಚ್ಚಿನ ಜನರು ಇಂಗ್ಲಿಷ್ ಕಲಿಯಲು ಏಕೆ ಕಷ್ಟಪಡುತ್ತಾರೆ?",
            toldTitle: "ಅನೇಕ ಕಲಿಯುವವರಿಗೆ ಹೀಗೆ ಹೇಳಲಾಗುತ್ತದೆ:",
            toldItem1: "ವ್ಯಾಕರಣ ಬಾಯಿಪಾಠ ಮಾಡಿ",
            toldItem2: "ಪದಗಳ ಪಟ್ಟಿಯನ್ನು ಕಲಿಯಿರಿ",
            toldItem3: "ಇಂಗ್ಲಿಷ್ ಪುಸ್ತಕಗಳನ್ನು ಓದಿ",
            explainTitle: "ಆದರೆ ಯಾರೂ ವಿವರಿಸುವುದಿಲ್ಲ:",
            explainItem1: "ಈ ವಾಕ್ಯವನ್ನು ಏಕೆ ಈ ರೀತಿಯಲ್ಲಿ ರಚಿಸಲಾಗಿದೆ?",
            explainItem2: "ಕ್ರಿಯಾಪದ (verb) ಏಕೆ ಬದಲಾಗುತ್ತದೆ?",
            explainItem3: "ಇಂಗ್ಲಿಷ್ ವಾಕ್ಯಗಳು ಕನ್ನಡಕ್ಕಿಂತ ಭಿನ್ನವಾಗಿ ಏಕೆ ಕೇಳಿಸುತ್ತವೆ?",
            struggleSummary: "ರಚನೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳದೆ, ಮಾತನಾಡುವುದು ಕಷ್ಟವಾಗುತ್ತದೆ.",
            struggleSolution: "SIMPLISH LMS ಈ ಸಮಸ್ಯೆಯನ್ನು ಪರಿಹರಿಸುತ್ತದೆ.",

            // SECTION 3
            bridgeTitle: "ಇಂಗ್ಲಿಷ್ ಅನ್ನು ಕನ್ನಡದ ಶೈಲಿಯಲ್ಲಿ ಕಲಿಯಿರಿ",
            bridgeIntro: "ಇಂಗ್ಲಿಷ್ ಅನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತ್ರ ಕಲಿಸುವ ಬದಲು, ನಾವು ಕನ್ನಡವನ್ನು ಸೇತುವೆಯಾಗಿ ಬಳಸುತ್ತೇವೆ.",
            exampleTitle: "ವಾಕ್ಯ ರಚನೆಯ ಹೋಲಿಕೆ",
            kannadaLabel: "ಕನ್ನಡ (SOV ರಚನೆ):",
            kannadaSentence: "ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ",
            englishLabel: "ಇಂಗ್ಲಿಷ್ (SVO ರಚನೆ):",
            englishSentence: "I go to school.",
            subject: "Subject (ಕರ್ತೃ)",
            verb: "Verb (ಕ್ರಿಯಾಪದ)",
            object: "Object (ಕರ್ಮ)",
            sentenceStructure: "ವಾಕ್ಯದ ರಚನೆ",
            realLifeUsage: "ನೈಜ ಜಗತ್ತಿನ ಬಳಕೆ",
            bridgeExplanation: "ಕರ್ತೃ (Subject), ಕ್ರಿಯಾಪದ (Verb), ಮತ್ತು ಕರ್ಮ (Object) ಹೇಗೆ ಜೋಡಣೆಯಾಗುತ್ತವೆ ಮತ್ತು ಬದಲಾಗುತ್ತವೆ ಎಂಬುದನ್ನು ನಾವು ವಿವರಿಸುತ್ತೇವೆ. ಇದು ಇಂಗ್ಲಿಷ್ ಅನ್ನು ಸುಲಭವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಮತ್ತು ನೆನಪಿಡಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",

            // SECTION 4
            learnTitle: "ನೀವು ಏನನ್ನು ಕಲಿಯುವಿರಿ",
            learnCard1Title: "ಮೂಲಭೂತ ವಿಷಯಗಳು",
            learnCard1Item1: "ಅಕ್ಷರಮಾಲೆ ಮತ್ತು ಧ್ವನಿಗಳು",
            learnCard1Item2: "ಮೂಲಭೂತ ಪದಗಳು",
            learnCard1Item3: "ದೈನಂದಿನ ಶಬ್ದಕೋಶ",
            learnCard2Title: "ವಾಕ್ಯ ರಚನೆ",
            learnCard2Item1: "ಕರ್ತೃ, ಕ್ರಿಯಾಪದ, ಕರ್ಮ",
            learnCard2Item2: "ವಾಕ್ಯದ ಮಾದರಿಗಳು",
            learnCard2Item3: "ವಾಕ್ಯಗಳ ನಿರ್ಮಾಣ",
            learnCard3Title: "ವ್ಯಾಕರಣ ಸರಳೀಕರಣ",
            learnCard3Item1: "ಕಾಲಗಳು (Tenses)",
            learnCard3Item2: "ಆರ್ಟಿಕಲ್ಸ್ ಮತ್ತು ಪ್ರಿಪೊಸಿಷನ್ಸ್",
            learnCard3Item3: "ಪ್ರಶ್ನೆಗಳ ರಚನೆ",
            learnCard4Title: "ನೈಜ ಸಂವಹನ",
            learnCard4Item1: "ದೈನಂದಿನ ಸಂಭಾಷಣೆಗಳು",
            learnCard4Item2: "ಕೆಲಸದ ಸ್ಥಳದ ಇಂಗ್ಲಿಷ್",
            learnCard4Item3: "ಸಂದರ್ಶನದ ತಯಾರಿ",

            // SECTION 5
            journeyTitle: "ನಿಮ್ಮ ಕಲಿಕೆಯ ಪ್ರಯಾಣ",
            lvl1Title: "ಹಂತ 1: ಆರಂಭಿಕ (Beginner)",
            lvl1Desc: "ಸಂಪೂರ್ಣ ಶೂನ್ಯದಿಂದ ಪ್ರಾರಂಭಿಸಿ.",
            lvl2Title: "ಹಂತ 2: ಬುನಾದಿ (Foundation)",
            lvl2Desc: "ವಾಕ್ಯ ರಚನೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.",
            lvl3Title: "ಹಂತ 3: ಮಧ್ಯಂತರ (Intermediate)",
            lvl3Desc: "ನಿಮ್ಮ ಸ್ವಂತ ವಾಕ್ಯಗಳನ್ನು ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ರಚಿಸಿ.",
            lvl4Title: "ಹಂತ 4: ಮುಂದುವರಿದ (Advanced)",
            lvl4Desc: "ದೈನಂದಿನ ಸಂದರ್ಭಗಳಲ್ಲಿ ಇಂಗ್ಲಿಷ್ ಅನ್ನು ಸಹಜವಾಗಿ ಬಳಸಿ.",

            // SECTION 6
            diffTitle: "SIMPLISH LMS ಏಕೆ ವಿಭಿನ್ನವಾಗಿದೆ?",
            colFocus: "ಗಮನ ಹರಿಸುವ ಕ್ಷೇತ್ರ",
            colTraditional: "ಸಾಂಪ್ರದಾಯಿಕ ಕೋರ್ಸ್‌ಗಳು",
            colSimplish: "SIMPLISH LMS",
            rowHeader1: "ಮುಖ್ಯ ಶೈಲಿ",
            row1Traditional: "ವ್ಯಾಕರಣ ಬಾಯಿಪಾಠ",
            row1Simplish: "ವ್ಯಾಕರಣದ ತಿಳುವಳಿಕೆ",
            rowHeader2: "ಬೋಧನಾ ಭಾಷೆ",
            row2Traditional: "ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತ್ರ ಬೋಧನೆ",
            row2Simplish: "ಕನ್ನಡ ಬೆಂಬಲಿತ ಕಲಿಕೆ",
            rowHeader3: "ಪಾಠಗಳ ಕ್ಲಿಷ್ಟತೆ",
            row3Traditional: "ಜಟಿಲವಾದ ವಿವರಣೆಗಳು",
            row3Simplish: "ಸರಳಗೊಳಿಸಿದ ರಚನಾತ್ಮಕ ಪಾಠಗಳು",
            rowHeader4: "ವಿದ್ಯಾರ್ಥಿಗಳ ತೊಡಗಿಸಿಕೊಳ್ಳುವಿಕೆ",
            row4Traditional: "ನಿಷ್ಕ್ರಿಯ ಕಲಿಕೆ",
            row4Simplish: "ಸಕ್ರಿಯ ತಿಳುವಳಿಕೆ",
            rowHeader5: "ಬೋಧನಾ ವಿಧಾನ",
            row5Traditional: "ಎಲ್ಲರಿಗೂ ಒಂದೇ ಮಾದರಿ",
            row5Simplish: "ಆರಂಭಿಕ ಸ್ನೇಹಿ ಹಾದಿ",

            // SECTION 7
            thinkTitle: "ಇಂತಹ ಆಲೋಚನೆ ಇರುವವರಿಗಾಗಿಯೇ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ...",
            think1Q: "\"ನನ್ನ ಇಂಗ್ಲಿಷ್ ತುಂಬಾ ದುರ್ಬಲವಾಗಿದೆ.\"",
            think1A: "ತೊಂದರೆಯಿಲ್ಲ. ನಾವು ಮೂಲಭೂತ ವಿಷಯಗಳಿಂದಲೇ ಪ್ರಾರಂಭಿಸುತ್ತೇವೆ.",
            think2Q: "\"ನನಗೆ ಅರ್ಥವಾಗುತ್ತದೆ ಆದರೆ ಮಾತನಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ.\"",
            think2A: "ಬಲವಾದ ತಿಳುವಳಿಕೆಯು ಆತ್ಮವಿಶ್ವಾಸದ ಮಾತುಗಾರಿಕೆಯನ್ನು ಸೃಷ್ಟಿಸುತ್ತದೆ.",
            think3Q: "\"ನನಗೆ ವ್ಯಾಕರಣವೆಂದರೆ ಭಯ.\"",
            think3A: "ನಾವು ಕನ್ನಡದ ವಿವರಣೆಗಳನ್ನು ಬಳಸಿ ವ್ಯಾಕರಣವನ್ನು ಸರಳಗೊಳಿಸುತ್ತೇವೆ.",
            think4Q: "\"ಕಲಿಯಲು ನನಗೆ ವಯಸ್ಸಾಗಿದೆ.\"",
            think4A: "ಇಂಗ್ಲಿಷ್ ಒಂದು ಕೌಶಲ್ಯವೇ ಹೊರತು ಜನ್ಮಜಾತ ಪ್ರತಿಭೆಯಲ್ಲ.",

            // SECTION 8
            faqTitle: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಗಳು",
            faq1Q: "ನನಗೆ ಮುಂಚಿತವಾಗಿ ಇಂಗ್ಲಿಷ್ ಜ್ಞಾನದ ಅಗತ್ಯವಿದೆಯೇ?",
            faq1A: "ಇಲ್ಲ. SIMPLISH LMS ಮೂಲಭೂತ ಅಂಶಗಳಿಂದಲೇ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.",
            faq2Q: "ಎಲ್ಲವನ್ನೂ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿಯೇ ಕಲಿಸಲಾಗುತ್ತದೆಯೇ?",
            faq2A: "ಇಲ್ಲ. ಕಲಿಕೆಯನ್ನು ಸುಲಭಗೊಳಿಸಲು ನಾವು ಕನ್ನಡ ವಿವರಣೆಗಳನ್ನು ಬಳಸುತ್ತೇವೆ.",
            faq3Q: "ನಾನು ಪ್ರತಿದಿನ ಎಷ್ಟು ಸಮಯ ಕಳೆಯಬೇಕು?",
            faq3A: "ಪ್ರಗತಿ ಹೊಂದಲು ಪ್ರತಿದಿನ 15-20 ನಿಮಿಷಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ ಸಾಕು.",
            faq4Q: "ಇದು ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿಗಳಿಗೆ ಸೂಕ್ತವೇ?",
            faq4A: "ಹೌದು. ಈ ಕೋರ್ಸ್ ಸಂದರ್ಶನಗಳು ಮತ್ತು ಕೆಲಸದ ಸ್ಥಳದ ಸಂವಹನಕ್ಕೆ ಅಗತ್ಯವಿರುವ ಬುನಾದಿಯನ್ನು ನಿರ್ಮಿಸುತ್ತದೆ.",
            faq5Q: "ನಾನು ನನ್ನ ಮೊಬೈಲ್ ಫೋನ್‌ನಲ್ಲಿ ಕಲಿಯಬಹುದೇ?",
            faq5A: "ಹೌದು. SIMPLISH LMS ಅನ್ನು ಮೊಬೈಲ್ ಸ್ನೇಹಿಯನ್ನಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ.",

            // SECTION 9
            nextTitle: "LMS ನಂತರ ಏನಾಗುತ್ತದೆ?",
            nextIntro: "ಇಂಗ್ಲಿಷ್ ಕಲಿಯುವಿಕೆಯಲ್ಲಿ ಮೂರು ಹಂತಗಳಿವೆ.",
            step1Title: "ಹಂತ 1: SIMPLISH LMS ನೊಂದಿಗೆ ಕಲಿಯಿರಿ",
            step1Desc: "ಇಂಗ್ಲಿಷ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.",
            step2Title: "ಹಂತ 2: SIMPLISH Talks ನೊಂದಿಗೆ ಅಭ್ಯಾಸ ಮಾಡಿ",
            step2Desc: "ಮಾತನಾಡುವ ಹವ್ಯಾಸವನ್ನು ಬೆಳೆಸಿಕೊಳ್ಳಿ.",
            step3Title: "ಹಂತ 3: SIMPLISH Snehi ಯೊಂದಿಗೆ ಮಾತನಾಡಿ",
            step3Desc: "ನೈಜ ಜಗತ್ತಿನ ಆತ್ಮವಿಶ್ವಾಸವನ್ನು ಗಳಿಸಿ.",

            // FINAL CTA
            finalCtaTitle: "ಇಂದೇ ನಿಮ್ಮ ಇಂಗ್ಲಿಷ್ ಬುನಾದಿ ನಿರ್ಮಿಸಲು ಪ್ರಾರಂಭಿಸಿ",
            finalCtaText: "ನಿಮಗೆ ಪರಿಪೂರ್ಣ ಇಂಗ್ಲಿಷ್ ಅಗತ್ಯವಿಲ್ಲ. ನಿಮಗೆ ಮೊದಲೇ ಆತ್ಮವಿಶ್ವಾಸದ ಅಗತ್ಯವಿಲ್ಲ. ನಿಮಗೆ ಯಾವುದೇ ಪೂರ್ವ ಅನುಭವದ ಅಗತ್ಯವಿಲ್ಲ. ನಿಮಗೆ ಕೇವಲ ಒಂದು ಆರಂಭದ ಬಿಂದು ಬೇಕು. ಇಂಗ್ಲಿಷ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವುದರಿಂದ ಹಿಡಿದು ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ಬಳಸುವವರೆಗೆ SIMPLISH LMS ನಿಮಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ.",
            footerMotto: "ಸರಳ ಮತ್ತು ಸುಲಭವಾಗಿ ಲಭ್ಯವಿರುವ ಇಂಗ್ಲಿಷ್‌ನೊಂದಿಗೆ ಕನ್ನಡ ಮಾತನಾಡುವವರನ್ನು ಸಬಲಗೊಳಿಸುವುದು.",
            footerCopyright: "© 2026 SIMPLISH - ಉನ್ನತಿಯೆಡೆಗೆ ಸರಳ ಪಯಣ"
        }
    };

    const mergedKn = { ...content.en, ...content.kn };
    const t = lang === 'en' ? content.en : mergedKn;

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
            "price": "0",
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
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-dark)',
            color: 'var(--text-main)',
            scrollBehavior: 'smooth',
            fontFamily: "'Noto Sans Kannada', 'Inter', system-ui, -apple-system, sans-serif"
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                .premium-hero-badge {
                    background: linear-gradient(90deg, var(--primary), var(--accent));
                    color: white;
                    padding: 0.5rem 1.25rem;
                    border-radius: 9999px;
                    font-size: 0.85rem;
                    font-weight: 800;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.15);
                }
                .gradient-text-title {
                    background: linear-gradient(135deg, var(--text-main) 30%, var(--primary) 90%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: 900;
                    line-height: 1.15;
                    font-size: clamp(2.2rem, 7vw, 4rem);
                    letter-spacing: -1px;
                }
                .trust-indicator-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    padding: 1rem 1.25rem;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-weight: 700;
                    font-size: 0.95rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
                }
                .trust-indicator-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                    border-color: var(--primary);
                }
                .struggle-card-red {
                    background: rgba(239, 68, 68, 0.03);
                    border: 1px solid rgba(239, 68, 68, 0.15);
                    border-radius: 1rem;
                    padding: 1.5rem;
                    transition: all 0.3s ease;
                }
                .struggle-card-red:hover {
                    border-color: rgba(239, 68, 68, 0.3);
                    background: rgba(239, 68, 68, 0.05);
                }
                .struggle-card-green {
                    background: rgba(16, 185, 129, 0.03);
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 1rem;
                    padding: 1.5rem;
                    transition: all 0.3s ease;
                }
                .struggle-card-green:hover {
                    border-color: rgba(16, 185, 129, 0.3);
                    background: rgba(16, 185, 129, 0.05);
                }
                .sov-block {
                    padding: 0.75rem 1.25rem;
                    border-radius: 0.5rem;
                    font-weight: 800;
                    font-size: 1.1rem;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    display: inline-block;
                }
                .arrow-bridge {
                    font-size: 1.5rem;
                    color: var(--accent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; transform: scale(0.95); }
                    50% { opacity: 1; transform: scale(1.05); }
                }
                .learn-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 1rem;
                    padding: 2rem 1.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .learn-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 15px 30px -10px rgba(var(--primary-rgb), 0.12);
                    border-color: var(--primary);
                }
                .timeline-step {
                    display: flex;
                    gap: 1.5rem;
                    position: relative;
                }
                .timeline-step:not(:last-child)::after {
                    content: '';
                    position: absolute;
                    left: 20px;
                    top: 40px;
                    bottom: -20px;
                    width: 2px;
                    background: var(--border);
                }
                .timeline-circle {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: var(--bg-card);
                    border: 3px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    flex-shrink: 0;
                    transition: all 0.3s ease;
                }
                .timeline-step:hover .timeline-circle {
                    border-color: var(--primary);
                    background: var(--primary-light);
                    transform: scale(1.1);
                }
                .diff-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    border-radius: 0.75rem;
                    overflow: hidden;
                }
                .diff-table th {
                    background: var(--primary-light);
                    color: var(--text-main);
                    padding: 1.25rem 1rem;
                    font-weight: 800;
                    border-bottom: 2px solid var(--border);
                }
                .diff-table td {
                    padding: 1.25rem 1rem;
                    border-bottom: 1px solid var(--border);
                    font-size: 1rem;
                }
                .diff-table tr:hover {
                    background: rgba(var(--primary-rgb), 0.02);
                }
                .think-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-left: 5px solid var(--accent);
                    padding: 1.5rem;
                    border-radius: 0.5rem;
                    transition: all 0.3s ease;
                }
                .think-card:hover {
                    transform: translateX(4px);
                    border-color: var(--accent);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }
                .ecosystem-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    padding: 1.75rem;
                    border-radius: 1rem;
                    text-align: center;
                    flex: 1;
                    min-width: 250px;
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .ecosystem-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--primary);
                    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.04);
                }
                .ecosystem-badge {
                    position: absolute;
                    top: -15px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--accent);
                    color: white;
                    padding: 0.25rem 1rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .final-cta-container {
                    background: linear-gradient(135deg, rgba(0, 82, 204, 0.95), rgba(5, 150, 105, 0.95)), url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath fill-rule="evenodd" d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zM11 58c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 1c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z"/%3E%3C/g%3E%3C/svg%3E');
                    color: white;
                    border-radius: 1.5rem;
                    padding: 4rem 2rem;
                    text-align: center;
                    box-shadow: 0 15px 35px rgba(0, 82, 204, 0.2);
                    margin-top: 4rem;
                }
                .btn-pulse {
                    position: relative;
                }
                .btn-pulse::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    border-radius: inherit;
                    box-shadow: 0 0 0 0 rgba(255,255,255,0.4);
                    animation: pulse-ring 1.5s cubic-bezier(0.24, 0, 0.38, 1) infinite;
                }
                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.6); }
                    70% { box-shadow: 0 0 0 12px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
            `}} />

            <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
            </script>

            {/* Header / Nav */}
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
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        letterSpacing: '-0.5px',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: '#007FFF', textTransform: 'lowercase' }}>sim</span>
                        <span style={{ color: '#00A86B', textTransform: 'lowercase' }}>plish</span>
                        <span style={{ color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '1.2rem', marginLeft: '0.35rem', fontWeight: 900 }}>LMS</span>
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
                                transition: 'all 0.2s ease',
                                minHeight: '36px',
                                minWidth: '36px'
                            }}
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    )}

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
                            minHeight: '36px',
                            minWidth: isMobile ? '36px' : 'auto'
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
                        style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            background: 'var(--text-main)',
                            color: 'var(--bg-dark)',
                            minHeight: '36px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {t.signIn}
                    </button>
                </div>
            </nav>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.25rem' }}>

                {/* HERO SECTION */}
                <header style={{ padding: '4.5rem 0 3rem 0', textAlign: 'center' }}>
                    <motion.div
                        key={lang}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="premium-hero-badge">
                            <Sparkles size={14} />
                            <span>{t.preHeader} • {t.preHeaderSub}</span>
                        </div>

                        <h1 className="gradient-text-title" style={{ margin: '0 auto 1.5rem auto', maxWidth: '900px' }}>
                            {t.headline}
                        </h1>

                        <h3 style={{
                            fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            margin: '0 auto 1.5rem auto',
                            maxWidth: '750px',
                            lineHeight: 1.4
                        }}>
                            {t.subHeadline}
                        </h3>

                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '1rem',
                            padding: '1.75rem',
                            maxWidth: '750px',
                            margin: '0 auto 2.5rem auto',
                            boxShadow: '0 10px 25px -10px rgba(0,0,0,0.04)',
                            textAlign: 'left'
                        }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={18} />
                                {t.stopMemorizing}
                            </p>
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1rem', fontWeight: 550 }}>
                                {t.learnStructureText}
                            </p>
                            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                                {t.lmsAudienceText}
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', maxWidth: '550px', margin: '0 auto 4rem auto' }}>
                            <button
                                className="btn btn-primary btn-pulse"
                                style={{
                                    flex: '1 1 240px',
                                    padding: '1.25rem 2rem',
                                    fontSize: '1.15rem',
                                    background: 'var(--primary)',
                                    fontWeight: 800,
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem'
                                }}
                                onClick={() => setShowAuth(true)}
                            >
                                {t.ctaStartFree}
                                <ArrowRight size={20} />
                            </button>
                            <button
                                className="btn"
                                style={{
                                    flex: '1 1 240px',
                                    padding: '1.25rem 2rem',
                                    fontSize: '1.15rem',
                                    background: 'transparent',
                                    border: '2px solid var(--border)',
                                    color: 'var(--text-main)',
                                    fontWeight: 700,
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => {
                                    document.getElementById('learning-journey')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.background = 'var(--primary-light)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <Play size={16} fill="var(--text-main)" />
                                {t.ctaViewPath}
                            </button>
                        </div>

                        {/* Trust Indicators */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '1rem',
                            marginTop: '2rem'
                        }}>
                            {[
                                { text: t.trust1, color: '#10B981' },
                                { text: t.trust2, color: '#3B82F6' },
                                { text: t.trust3, color: '#F59E0B' },
                                { text: t.trust4, color: '#8B5CF6' }
                            ].map((indicator, index) => (
                                <div key={index} className="trust-indicator-card">
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: `${indicator.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: indicator.color
                                    }}>
                                        <Check size={16} strokeWidth={3} />
                                    </div>
                                    <span style={{ color: 'var(--text-main)' }}>{indicator.text}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </header>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 2: Why Most People Struggle */}
                <section style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.struggleTitle}</h2>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '2rem',
                        marginBottom: '3rem'
                    }}>
                        {/* Red Column (Traditional Methods) */}
                        <div className="struggle-card-red">
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EF4444', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <X size={20} strokeWidth={2.5} />
                                {t.toldTitle}
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[t.toldItem1, t.toldItem2, t.toldItem3].map((item, idx) => (
                                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        <span style={{ color: '#EF4444', fontWeight: 900 }}>•</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Yellow/Orange Column (The Core Question gaps) */}
                        <div className="struggle-card-red" style={{ background: 'rgba(245, 158, 11, 0.03)', borderColor: 'rgba(245, 158, 11, 0.15)' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <HelpCircle size={20} />
                                {t.explainTitle}
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[t.explainItem1, t.explainItem2, t.explainItem3].map((item, idx) => (
                                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="struggle-card-green" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                            {t.struggleSummary}
                        </p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10B981', margin: 0 }}>
                            🎉 {t.struggleSolution}
                        </p>
                    </div>
                </section>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 3: Learn English the Kannada Way */}
                <section style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.bridgeTitle}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto 1.5rem auto', fontWeight: 600 }}>
                            {t.bridgeIntro}
                        </p>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '1.5rem',
                        padding: '2.5rem 1.5rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                        maxWidth: '950px',
                        margin: '0 auto'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem', color: 'var(--text-main)' }}>
                            {t.exampleTitle}
                        </h3>

                        {/* Interactive Structure Comparison */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2rem',
                            maxWidth: '700px',
                            margin: '0 auto 2.5rem auto'
                        }}>
                            {/* Kannada Line */}
                            <div>
                                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>
                                    {t.kannadaLabel}
                                </h4>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div className="sov-block" style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#2563EB' }}>
                                        ನಾನು <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.subject}</div>
                                    </div>
                                    <div className="sov-block" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#D97706' }}>
                                        ಶಾಲೆಗೆ <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.object}</div>
                                    </div>
                                    <div className="sov-block" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669' }}>
                                        ಹೋಗುತ್ತೇನೆ <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.verb}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Arrow bridge to denote transfer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 2rem' }}>
                                <div className="arrow-bridge">↓</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 750, background: 'var(--bg-dark)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', border: '1px dashed var(--border)' }}>
                                    Word Order Shifts (SOV ➔ SVO)
                                </div>
                                <div className="arrow-bridge">↓</div>
                            </div>

                            {/* English Line */}
                            <div>
                                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>
                                    {t.englishLabel}
                                </h4>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div className="sov-block" style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#2563EB' }}>
                                        I <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.subject}</div>
                                    </div>
                                    <div className="sov-block" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669' }}>
                                        go <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.verb}</div>
                                    </div>
                                    <div className="sov-block" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#D97706' }}>
                                        to school <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.object}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'var(--bg-dark)',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            border: '1px solid var(--border)'
                        }}>
                            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: 1.6, textAlign: 'center', fontWeight: 600 }}>
                                💡 {t.bridgeExplanation}
                            </p>
                        </div>
                    </div>
                </section>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 4: What You Will Learn */}
                <section style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.learnTitle}</h2>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {/* Card 1 */}
                        <div className="learn-card">
                            <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: '#3B82F6' }}>
                                <BookOpen size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-main)' }}>{t.learnCard1Title}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard1Item1}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard1Item2}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard1Item3}</li>
                            </ul>
                        </div>

                        {/* Card 2 */}
                        <div className="learn-card">
                            <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: '#8B5CF6' }}>
                                <Compass size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-main)' }}>{t.learnCard2Title}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard2Item1}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard2Item2}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard2Item3}</li>
                            </ul>
                        </div>

                        {/* Card 3 */}
                        <div className="learn-card">
                            <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: '#F59E0B' }}>
                                <Award size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-main)' }}>{t.learnCard3Title}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard3Item1}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard3Item2}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard3Item3}</li>
                            </ul>
                        </div>

                        {/* Card 4 */}
                        <div className="learn-card">
                            <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: '#10B981' }}>
                                <MessageSquare size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-main)' }}>{t.learnCard4Title}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard4Item1}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard4Item2}</li>
                                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Check size={16} color="#10B981" /> {t.learnCard4Item3}</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 5: Your Learning Journey */}
                <section id="learning-journey" style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.journeyTitle}</h2>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                            {/* Step 1 */}
                            <div className="timeline-step">
                                <div className="timeline-circle">
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>L1</span>
                                </div>
                                <div style={{ paddingTop: '0.2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>{t.lvl1Title}</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1rem' }}>{t.lvl1Desc}</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="timeline-step">
                                <div className="timeline-circle">
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>L2</span>
                                </div>
                                <div style={{ paddingTop: '0.2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>{t.lvl2Title}</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1rem' }}>{t.lvl2Desc}</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="timeline-step">
                                <div className="timeline-circle">
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>L3</span>
                                </div>
                                <div style={{ paddingTop: '0.2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>{t.lvl3Title}</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1rem' }}>{t.lvl3Desc}</p>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="timeline-step">
                                <div className="timeline-circle" style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}>
                                    <Star size={16} color="white" />
                                </div>
                                <div style={{ paddingTop: '0.2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>{t.lvl4Title}</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1rem' }}>{t.lvl4Desc}</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 6: Why SIMPLISH LMS Is Different */}
                <section style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.diffTitle}</h2>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '1.5rem',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                        maxWidth: '900px',
                        margin: '0 auto'
                    }}>
                        <div className="responsive-table-wrapper">
                            <table className="diff-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>{t.colFocus}</th>
                                        <th style={{ width: '30%', color: 'var(--text-muted)' }}>{t.colTraditional}</th>
                                        <th style={{ width: '30%', color: 'var(--primary)' }}>{t.colSimplish}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>{t.rowHeader1}</strong></td>
                                        <td style={{ color: 'var(--text-muted)' }}>{t.row1Traditional}</td>
                                        <td style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                            <span style={{ color: '#10B981', marginRight: '0.5rem' }}>✓</span>
                                            {t.row1Simplish}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>{t.rowHeader2}</strong></td>
                                        <td style={{ color: 'var(--text-muted)' }}>{t.row2Traditional}</td>
                                        <td style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                            <span style={{ color: '#10B981', marginRight: '0.5rem' }}>✓</span>
                                            {t.row2Simplish}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>{t.rowHeader3}</strong></td>
                                        <td style={{ color: 'var(--text-muted)' }}>{t.row3Traditional}</td>
                                        <td style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                            <span style={{ color: '#10B981', marginRight: '0.5rem' }}>✓</span>
                                            {t.row3Simplish}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>{t.rowHeader4}</strong></td>
                                        <td style={{ color: 'var(--text-muted)' }}>{t.row4Traditional}</td>
                                        <td style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                            <span style={{ color: '#10B981', marginRight: '0.5rem' }}>✓</span>
                                            {t.row4Simplish}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>{t.rowHeader5}</strong></td>
                                        <td style={{ color: 'var(--text-muted)' }}>{t.row5Traditional}</td>
                                        <td style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                            <span style={{ color: '#10B981', marginRight: '0.5rem' }}>✓</span>
                                            {t.row5Simplish}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 7: Designed for People Who Think... */}
                <section style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.thinkTitle}</h2>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        <div className="think-card">
                            <p style={{ fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 750, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                {t.think1Q}
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
                                {t.think1A}
                            </p>
                        </div>

                        <div className="think-card">
                            <p style={{ fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 750, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                {t.think2Q}
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
                                {t.think2A}
                            </p>
                        </div>

                        <div className="think-card">
                            <p style={{ fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 750, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                {t.think3Q}
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
                                {t.think3A}
                            </p>
                        </div>

                        <div className="think-card">
                            <p style={{ fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 750, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                {t.think4Q}
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
                                {t.think4A}
                            </p>
                        </div>
                    </div>
                </section>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 8: Answers to Your Questions (FAQ) */}
                <section style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.faqTitle}</h2>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{
                        maxWidth: '850px',
                        margin: '0 auto',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '1.5rem',
                        padding: '2rem'
                    }}>
                        <FAQItem question={t.faq1Q} answer={t.faq1A} />
                        <FAQItem question={t.faq2Q} answer={t.faq2A} />
                        <FAQItem question={t.faq3Q} answer={t.faq3A} />
                        <FAQItem question={t.faq4Q} answer={t.faq4A} />
                        <FAQItem question={t.faq5Q} answer={t.faq5A} />
                    </div>
                </section>

                <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '4rem 0' }} />

                {/* SECTION 9: What Happens After LMS? */}
                <section style={{ padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>{t.nextTitle}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 600 }}>{t.nextIntro}</p>
                        <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto', borderRadius: '2px' }} />
                    </div>

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2.5rem 1.5rem',
                        justifyContent: 'center',
                        marginTop: '2rem'
                    }}>
                        {/* Step 1 */}
                        <div className="ecosystem-card">
                            <div className="ecosystem-badge" style={{ background: 'var(--primary)' }}>Phase 1</div>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📚</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                                {t.step1Title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                                {t.step1Desc}
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="ecosystem-card">
                            <div className="ecosystem-badge">Phase 2</div>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎤</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                                {t.step2Title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                                {t.step2Desc}
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="ecosystem-card">
                            <div className="ecosystem-badge" style={{ background: '#10B981' }}>Phase 3</div>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                                {t.step3Title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                                {t.step3Desc}
                            </p>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA SECTION */}
                <div className="final-cta-container">
                    <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.2 }}>
                        {t.finalCtaTitle}
                    </h2>

                    <p style={{
                        fontSize: 'clamp(1.05rem, 3.5vw, 1.25rem)',
                        lineHeight: 1.7,
                        maxWidth: '800px',
                        margin: '0 auto 2.5rem auto',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 600
                    }}>
                        {t.finalCtaText}
                    </p>

                    <button
                        className="btn btn-primary btn-pulse"
                        style={{
                            padding: '1.25rem 3rem',
                            fontSize: '1.25rem',
                            background: 'white',
                            color: 'var(--primary)',
                            fontWeight: 900,
                            borderRadius: '0.75rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => setShowAuth(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {t.ctaStartFree}
                        <ArrowUpRight size={22} />
                    </button>
                </div>

                {/* Footer */}
                <footer style={{
                    padding: '4rem 0 2rem 0',
                    textAlign: 'center',
                    borderTop: '1px solid var(--border)',
                    marginTop: '5rem'
                }}>
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
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            letterSpacing: '-0.5px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: '#007FFF', textTransform: 'lowercase' }}>sim</span>
                            <span style={{ color: '#00A86B', textTransform: 'lowercase' }}>plish</span>
                            <span style={{ color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '1.2rem', marginLeft: '0.35rem', fontWeight: 900 }}>LMS</span>
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.05rem' }}>
                        {t.footerMotto}
                    </p>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                        {t.footerCopyright}
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
