import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, CheckCircle, AlertCircle, Loader2, MessageSquare, Send } from 'lucide-react';
import { assessmentApi } from '../../utils/api';

// A/B Testing Copywriting Variants
const COPY_VARIANTS = {
    A: {
        title: "Incredible achievement! 🎉",
        subtitle: "Let's make it even better for the next cohort.",
        successTitle: "Thank you! ❤️",
        successSubtitle: "Your insight directly builds the future of Simplish.",
        buttonSubmit: "Submit Feedback",
        buttonSkip: "Skip for now"
    },
    B: {
        title: "Your feedback is our legacy.",
        subtitle: "Help us shape the journey for future students.",
        successTitle: "Awesome! 🌟",
        successSubtitle: "You've successfully passed the torch to the next class.",
        buttonSubmit: "Leave Your Mark",
        buttonSkip: "Maybe Later"
    },
    C: {
        title: "Congrats on graduating!",
        subtitle: "Quick 30-second feedback.",
        successTitle: "Feedback Submitted!",
        successSubtitle: "Good luck on your next steps!",
        buttonSubmit: "Send Feedback",
        buttonSkip: "Skip"
    }
};

const RATING_LABELS: Record<number, string> = {
    1: "Highly Frustrating",
    2: "Needs Improvement",
    3: "Good Experience",
    4: "Very Satisfying",
    5: "Flawless Experience"
};

const FEEDBACK_TAGS = [
    "Question Clarity",
    "Platform Speed/UX",
    "Time Limits",
    "Proctoring/Environment"
];

interface PostExamFeedbackModalProps {
    isOpen: boolean;
    examId: string;
    onClose: () => void;
    variant?: 'A' | 'B' | 'C';
}

const PostExamFeedbackModal: React.FC<PostExamFeedbackModalProps> = ({
    isOpen,
    examId,
    onClose,
    variant = 'A'
}) => {
    const copy = COPY_VARIANTS[variant] || COPY_VARIANTS.A;

    const [rating, setRating] = useState<number | null>(null);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comments, setComments] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const modalRef = useRef<HTMLDivElement>(null);
    const starContainerRef = useRef<HTMLDivElement>(null);

    // Focus Trap & Escape key listener
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
            if (e.key === 'Tab') {
                if (!modalRef.current) return;
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabIndex]:not([tabIndex="-1"])'
                );
                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // Focus the modal container initially for keyboard safety
        modalRef.current?.focus();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Handle Star Keyboard Adjustments (Arrow Keys)
    const handleStarKeyDown = (e: React.KeyboardEvent) => {
        if (!rating) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'Space' || e.key === 'Enter') {
                e.preventDefault();
                setRating(1);
            }
            return;
        }

        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            setRating(prev => Math.min(5, (prev || 0) + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            setRating(prev => Math.max(1, (prev || 1) - 1));
        }
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === null) return;

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            await assessmentApi.submitFeedback(examId, {
                rating,
                feedback_tags: selectedTags,
                comments
            });
            setSubmitStatus('success');
            // Auto close after 2.5 seconds upon success to minimize cognitive load
            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (err: any) {
            console.error('Error submitting exam feedback:', err);
            setSubmitStatus('error');
            if (err.response?.status === 409) {
                setErrorMessage('You have already submitted feedback for this exam.');
            } else if (err.response?.data?.message) {
                setErrorMessage(err.response.data.message);
            } else {
                setErrorMessage('Failed to submit feedback. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-sm">
                <motion.div
                    ref={modalRef}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Post-Exam Feedback"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-lg overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 text-white focus:outline-none"
                    style={{
                        background: 'linear-gradient(145deg, #1e1b4b 0%, #0b0f19 100%)',
                        boxShadow: '0 0 50px rgba(99, 102, 241, 0.15)'
                    }}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/40 hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                        <X size={20} />
                    </button>

                    {submitStatus === 'success' ? (
                        /* SUCCESS STATE */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-10 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, rotate: 360 }}
                                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                                className="mb-6 p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                            >
                                <CheckCircle size={64} className="text-emerald-400" />
                            </motion.div>
                            <h2 className="text-2xl font-black mb-3 bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                {copy.successTitle}
                            </h2>
                            <p className="text-slate-300 max-w-xs leading-relaxed">
                                {copy.successSubtitle}
                            </p>
                        </motion.div>
                    ) : (
                        /* FORM STATE */
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            {/* Heading */}
                            <div className="text-center md:text-left pr-6">
                                <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
                                    Graduation Feedback
                                </span>
                                <h2 className="text-2xl font-black tracking-tight leading-tight text-white mb-2">
                                    {copy.title}
                                </h2>
                                <p className="text-sm text-slate-400">
                                    {copy.subtitle}
                                </p>
                            </div>

                            {/* Stars Rating (Focal Point) */}
                            <div className="flex flex-col items-center gap-3 py-4 bg-slate-800/20 border border-slate-800/40 rounded-2xl">
                                <div
                                    ref={starContainerRef}
                                    role="slider"
                                    aria-label="Star rating out of 5"
                                    aria-valuemin={1}
                                    aria-valuemax={5}
                                    aria-valuenow={rating || 0}
                                    tabIndex={0}
                                    onKeyDown={handleStarKeyDown}
                                    className="flex items-center gap-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none p-1 rounded-lg"
                                >
                                    {[1, 2, 3, 4, 5].map((starValue) => {
                                        const isFilled = hoverRating !== null
                                            ? starValue <= hoverRating
                                            : rating !== null && starValue <= rating;

                                        return (
                                            <button
                                                key={starValue}
                                                type="button"
                                                onClick={() => setRating(starValue)}
                                                onMouseEnter={() => setHoverRating(starValue)}
                                                onMouseLeave={() => setHoverRating(null)}
                                                className="p-1 transition-transform active:scale-95 focus:outline-none text-slate-600 focus:text-indigo-400"
                                                aria-label={`Rate ${starValue} Stars out of 5 - ${RATING_LABELS[starValue]}`}
                                            >
                                                <Star
                                                    size={40}
                                                    className={`transition-colors duration-200 ${
                                                        isFilled
                                                            ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                                            : 'text-slate-700 hover:text-slate-600'
                                                    }`}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-6 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={hoverRating || rating || 'none'}
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="text-xs font-semibold uppercase tracking-wider text-amber-400"
                                        >
                                            {hoverRating !== null
                                                ? RATING_LABELS[hoverRating]
                                                : rating !== null
                                                ? RATING_LABELS[rating]
                                                : "Select a Rating"}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Error Message */}
                            {submitStatus === 'error' && (
                                <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Secondary Fields (Slide-down after rating is chosen) */}
                            <AnimatePresence>
                                {rating !== null && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden flex flex-col gap-5"
                                    >
                                        {/* Multi-select Tags */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                What stood out to you? (Select all that apply)
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {FEEDBACK_TAGS.map((tag) => {
                                                    const isSelected = selectedTags.includes(tag);
                                                    return (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            onClick={() => toggleTag(tag)}
                                                            className={`px-3 py-2 text-xs font-medium rounded-full border transition-all duration-200 ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                                                                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                                                            }`}
                                                        >
                                                            {tag}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Expandable Comments Area */}
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <label htmlFor="comments" className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                    <MessageSquare size={14} /> Optional Comments
                                                </label>
                                                <span className={`text-[10px] font-semibold ${
                                                    comments.length >= 480 ? 'text-rose-400 font-bold' : 'text-slate-500'
                                                }`}>
                                                    {comments.length}/500
                                                </span>
                                            </div>
                                            <textarea
                                                id="comments"
                                                maxLength={500}
                                                value={comments}
                                                onChange={(e) => setComments(e.target.value)}
                                                placeholder={rating <= 3 
                                                    ? "We're sorry to hear that. What can we improve?" 
                                                    : "Share your thoughts about the graduation exam or your journey..."}
                                                className="w-full h-24 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-slate-300 placeholder-slate-500 resize-none outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Buttons */}
                            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-3 text-sm font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {copy.buttonSkip}
                                </button>
                                <button
                                    type="submit"
                                    disabled={rating === null || isSubmitting}
                                    className={`px-6 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 ${
                                        rating === null
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800/40 shadow-none'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} /> {copy.buttonSubmit}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PostExamFeedbackModal;
