import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Smartphone, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '../utils/api';

const AuthForm = ({ onLoginSuccess, language }) => {
    const [mode, setMode] = useState('signin'); // signin, signup, forgot, reset
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        identifier: '', // strictly for 10-digit phone number
        password: '',
        otp: '',
        newPassword: ''
    });

    const isRegister = mode === 'signup';
    const isForgot = mode === 'forgot';
    const isReset = mode === 'reset';

    const cleanPhone = (input) => {
        const cleaned = input.replace(/\D/g, '');
        if (cleaned.length < 10) return null;
        return cleaned.slice(-10);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const phone = cleanPhone(formData.identifier);
            if (!phone) {
                setError(language === 'kn' ? 'ದಯವಿಟ್ಟು 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.' : 'Please enter a valid 10-digit mobile number.');
                setLoading(false);
                return;
            }

            if (mode === 'signup') {
                await authApi.register({ 
                    fullName: formData.fullName,
                    phone: phone,
                    password: formData.password 
                });
                const loginRes = await authApi.login({ phone, password: formData.password });
                onLoginSuccess(loginRes.data.user, loginRes.data.token);
            } else if (mode === 'signin') {
                const res = await authApi.login({ phone, password: formData.password });
                onLoginSuccess(res.data.user, res.data.token);
            } else if (mode === 'forgot') {
                const res = await authApi.forgotPassword({ phone });
                setMessage(res.data.message);
                setMode('reset');
            } else if (mode === 'reset') {
                const res = await authApi.resetPassword({ 
                    phone, 
                    otp: formData.otp, 
                    password: formData.newPassword 
                });
                setMessage(res.data.message);
                setTimeout(() => setMode('signin'), 2000);
            }
        } catch (err) {
            const status = err.response?.status;
            let errMsg = err.response?.data?.message || 'Something went wrong';
            if (status === 422 && (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists'))) {
                errMsg = language === 'kn' ? 'ಈ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಈಗಾಗಲೇ ನೊಂದಾಯಿತವಾಗಿದೆ. ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಮಾಡಿ.' : 'This mobile number is already registered. Please Sign In.';
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (isForgot) return language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್ ಮರೆತಿರುವಿರಾ?' : 'Forgot Password?';
        if (isReset) return language === 'kn' ? 'ಹೊಸ ಪಾಸ್ವರ್ಡ್' : 'Reset Password';
        if (isRegister) return language === 'kn' ? 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ' : 'Create Account';
        return language === 'kn' ? 'ಲಾಗಿನ್ ಮಾಡಿ' : 'Sign In';
    };

    const getSubtitle = () => {
        if (isForgot) return language === 'kn' ? 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ' : 'Enter your mobile number to reset';
        if (isReset) return language === 'kn' ? 'OTP ಮತ್ತು ಹೊಸ ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ' : 'Enter OTP and new password';
        if (isRegister) return language === 'kn' ? 'ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಲು ನೋಂದಾಯಿಸಿ' : 'Register to start learning';
        return language === 'kn' ? 'ನಿಮ್ಮ ಕಲಿಕೆಯನ್ನು ಮುಂದುವರಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ' : 'Log in to continue your learning';
    };

    return (
        <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>{getTitle()}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>{getSubtitle()}</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {isRegister && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            {language === 'kn' ? 'ಪೂರ್ಣ ಹೆಸರು' : 'Full Name'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                required
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                placeholder={language === 'kn' ? "ಹೆಸರು" : "John Doe"}
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {(mode !== 'reset') && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            {language === 'kn' ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : 'Mobile Number'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Smartphone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                required
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                placeholder="9876543210"
                                value={formData.identifier}
                                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {(mode === 'signin' || mode === 'signup') && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್' : 'Password'}
                            </label>
                            {mode === 'signin' && (
                                <button
                                    type="button"
                                    onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    {language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್ ಮರೆತಿರುವಿರಾ?' : 'Forgot Password?'}
                                </button>
                            )}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                required
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {isReset && (
                    <>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                {language === 'kn' ? 'OTP ಕೋಡ್' : 'OTP Code'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Smartphone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                    placeholder="123456"
                                    value={formData.otp}
                                    onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                {language === 'kn' ? 'ಹೊಸ ಪಾಸ್ವರ್ಡ್' : 'New Password'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                    placeholder="••••••••"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                />
                            </div>
                        </div>
                    </>
                )}

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{ color: '#10b981', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                        {message}
                    </div>
                )}

                <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                    {isForgot ? (language === 'kn' ? 'ಮುಂದೆ' : 'Continue') :
                     isReset ? (language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್ ಬದಲಾಯಿಸಿ' : 'Reset Password') :
                     isRegister ? (language === 'kn' ? 'ಖಾತೆ ರಚಿಸಿ' : 'Register') :
                     (language === 'kn' ? 'ಲಾಗಿನ್ ಮಾಡಿ' : 'Sign In')}
                </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                    {isForgot || isReset ? '' :
                     isRegister ? (language === 'kn' ? 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ? ' : 'Already have an account? ') :
                     (language === 'kn' ? 'ಖಾತೆ ಇಲ್ಲವೇ? ' : "Don't have an account? ")}
                </span>
                <button
                    onClick={() => {
                        if (isForgot || isReset) setMode('signin');
                        else setMode(isRegister ? 'signin' : 'signup');
                        setError(''); setMessage('');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                    {isForgot || isReset ? (language === 'kn' ? 'ಲಾಗಿನ್ ಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ' : 'Back to Login') :
                     isRegister ? (language === 'kn' ? 'ಸೈನ್ ಇನ್ ಮಾಡಿ' : 'Sign In') :
                     (language === 'kn' ? 'ನೋಂದಾಯಿಸಿ' : 'Register')}
                </button>
            </div>
        </div>
    );
};

export default AuthForm;
