import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Smartphone, Lock, Loader2, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { authApi } from '../utils/api';
import { useToast } from './Toast';

const AuthForm = ({ onLoginSuccess, language }) => {
    const [mode, setMode] = useState('signin'); // signin, signup, forgot, reset
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const [formData, setFormData] = useState({
        fullName: '',
        identifier: '', // E.164 phone number
        password: '',
        confirmPassword: '',
        otp: '',
        newPassword: ''
    });

    const showToast = useToast();

    const isRegister = mode === 'signup';
    const isForgot = mode === 'forgot';
    const isReset = mode === 'reset';

    // Countdown Timer for Resend OTP
    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const sanitizeInput = (val) => {
        if (typeof val !== 'string') return val;
        return val
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/on\w+="[^"]*"/gim, "")
            .replace(/on\w+='[^']*'/gim, "")
            .trim();
    };

    const cleanPhone = (input) => {
        const cleaned = input.trim();
        if (cleaned.startsWith('+')) {
            const digits = cleaned.replace(/\D/g, '');
            return '+' + digits;
        }
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length === 12 && digits.startsWith('91')) {
            return '+' + digits;
        }
        if (digits.length === 10) {
            return '+91' + digits;
        }
        return null;
    };

    const handleSendOtp = async (phoneVal) => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const res = await authApi.sendOtp({
                fullName: sanitizeInput(formData.fullName),
                phone: phoneVal,
                password: 'tempPassword123!' // temporary until credentials step
            });
            setMessage(res.data.message);
            setOtpSent(true);
            setResendTimer(60);
            showToast(language === 'kn' ? 'OTP ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ.' : 'OTP sent successfully.', 'success');
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Error sending OTP';
            setError(errMsg);
            showToast(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const phone = cleanPhone(formData.identifier);
            if (!phone && mode !== 'reset') {
                setError(language === 'kn' ? 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ (E.164).' : 'Please enter a valid E.164 mobile number.');
                setLoading(false);
                return;
            }

            if (mode === 'signup') {
                if (!otpSent) {
                    await handleSendOtp(phone);
                } else if (!otpVerified) {
                    // Verify OTP
                    try {
                        const res = await authApi.verifyOtp({ phone, otp: formData.otp });
                        setMessage(res.data.message);
                        setOtpVerified(true);
                        setError('');
                        showToast(language === 'kn' ? 'OTP ಯಶಸ್ವಿಯಾಗಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ!' : 'OTP verified successfully!', 'success');
                    } catch (err) {
                        const errMsg = err.response?.data?.message || 'Invalid OTP code.';
                        setError(errMsg);
                        showToast(errMsg, 'error');
                    }
                } else {
                    // Phase 2: Credentials setup
                    const sanitizedPassword = sanitizeInput(formData.password);
                    await authApi.register({
                        fullName: sanitizeInput(formData.fullName),
                        phone: phone,
                        password: sanitizedPassword,
                        otp: formData.otp
                    });
                    
                    // Log in
                    const loginRes = await authApi.login({ phone, password: sanitizedPassword });
                    showToast(language === 'kn' ? 'ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ!' : 'Registration successful!', 'success');
                    onLoginSuccess(loginRes.data.user, loginRes.data.token);
                }
            } else if (mode === 'signin') {
                const res = await authApi.login({ phone, password: sanitizeInput(formData.password) });
                onLoginSuccess(res.data.user, res.data.token);
            } else if (mode === 'forgot') {
                const res = await authApi.forgotPassword({ phone });
                setMessage(res.data.message);
                setMode('reset');
            } else if (mode === 'reset') {
                const res = await authApi.resetPassword({
                    phone: cleanPhone(formData.identifier) || '',
                    otp: formData.otp,
                    password: sanitizeInput(formData.newPassword)
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
            showToast(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (isForgot) return language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್ ಮರೆತಿರುವಿರಾ?' : 'Forgot Password?';
        if (isReset) return language === 'kn' ? 'ಹೊಸ ಪಾಸ್ವರ್ಡ್' : 'Reset Password';
        if (isRegister) {
            if (otpVerified) return language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ' : 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ';
            return language === 'kn' ? 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ' : 'Create Account';
        }
        return language === 'kn' ? 'ಲಾಗಿನ್ ಮಾಡಿ' : 'Sign In';
    };

    const getSubtitle = () => {
        if (isForgot) return language === 'kn' ? 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ' : 'Enter your mobile number to reset';
        if (isReset) return language === 'kn' ? 'OTP ಮತ್ತು ಹೊಸ ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ' : 'Enter OTP and new password';
        if (isRegister) {
            if (otpVerified) return language === 'kn' ? 'ನಿಮ್ಮ ಖಾತೆಗೆ ಸುರಕ್ಷಿತ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ' : 'Set a secure password for your account';
            return otpSent
                ? (language === 'kn' ? 'ನಿಮ್ಮ ಮೊಬೈಲ್‌ಗೆ ಕಳುಹಿಸಲಾದ OTP ಅನ್ನು ನಮೂದಿಸಿ' : 'Enter the OTP sent to your mobile')
                : (language === 'kn' ? 'ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಲು ನೋಂದಾಯಿಸಿ' : 'Register to start learning');
        }
        return language === 'kn' ? 'ನಿಮ್ಮ ಕಲಿಕೆಯನ್ನು ಮುಂದುವರಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ' : 'Log in to continue your learning';
    };

    // Password Validation Criteria
    const isLengthValid = formData.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecialChar = /[!@#$%^&*]/.test(formData.password);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.password !== '';

    const isPasswordValid = isLengthValid && hasUppercase && hasNumber && hasSpecialChar;

    const getOtpSubmitDisabled = () => {
        if (isRegister && otpSent && !otpVerified) {
            return formData.otp.length !== 6 || loading;
        }
        return loading;
    };

    const getCredentialsSubmitDisabled = () => {
        if (isRegister && otpVerified) {
            return !isPasswordValid || !passwordsMatch || loading;
        }
        return loading;
    };

    return (
        <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>{getTitle()}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>{getSubtitle()}</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Sign Up / Phase 1: Name & Phone */}
                {isRegister && !otpVerified && (
                    <>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                {language === 'kn' ? 'ಬಳಕೆದಾರರ ಹೆಸರು' : 'Username'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    disabled={otpSent}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', opacity: otpSent ? 0.6 : 1 }}
                                    placeholder={language === 'kn' ? "ಹೆಸರು" : "username123"}
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                {language === 'kn' ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : 'Phone Number'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Smartphone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    disabled={otpSent}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', opacity: otpSent ? 0.6 : 1 }}
                                    placeholder="+919483105965"
                                    value={formData.identifier}
                                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                    autoComplete="username"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Sign In & Forgot Password Modes */}
                {(mode === 'signin' || mode === 'forgot') && (
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
                                placeholder="+919483105965"
                                value={formData.identifier}
                                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                autoComplete="username"
                            />
                        </div>
                    </div>
                )}

                {/* Sign In Password Input */}
                {mode === 'signin' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            {language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್' : 'Password'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                required
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                autoComplete="current-password"
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                            <button
                                type="button"
                                onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                                {language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್ ಮರೆತಿರುವಿರಾ?' : 'Forgot Password?'}
                            </button>
                        </div>
                    </div>
                )}

                {/* OTP Input for verification & reset */}
                {(isReset || (isRegister && otpSent && !otpVerified)) && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            {language === 'kn' ? 'OTP ಕೋಡ್' : 'OTP Code'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Smartphone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                required
                                maxLength={6}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                placeholder="123456"
                                value={formData.otp}
                                onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                                autoComplete="one-time-code"
                            />
                        </div>

                        {/* 60s Resend OTP Timer */}
                        {isRegister && !otpVerified && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>
                                    {resendTimer > 0 
                                        ? (language === 'kn' ? `${resendTimer} ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಮರುಕಳುಹಿಸಿ` : `Resend in ${resendTimer}s`) 
                                        : ''}
                                </span>
                                <button
                                    type="button"
                                    disabled={resendTimer > 0}
                                    onClick={() => handleSendOtp(cleanPhone(formData.identifier))}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--primary)',
                                        cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <RefreshCw size={12} /> {language === 'kn' ? 'OTP ಮರುಕಳುಹಿಸಿ' : 'Resend OTP'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Phase 2: Credentials Setup Form */}
                {isRegister && otpVerified && (
                    <>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                {language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ' : 'Create Password'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    required
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Password Validator Checklist */}
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isLengthValid ? '#10b981' : '#ef4444' }}>
                                    <CheckCircle2 size={14} style={{ opacity: isLengthValid ? 1 : 0.5 }} />
                                    <span>{language === 'kn' ? 'ಕನಿಷ್ಠ ೮ ಅಕ್ಷರಗಳು' : 'Minimum 8 characters'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: hasUppercase ? '#10b981' : '#ef4444' }}>
                                    <CheckCircle2 size={14} style={{ opacity: hasUppercase ? 1 : 0.5 }} />
                                    <span>{language === 'kn' ? 'ಒಂದು ದೊಡ್ಡ ಅಕ್ಷರ [A-Z]' : 'One uppercase letter [A-Z]'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: hasNumber ? '#10b981' : '#ef4444' }}>
                                    <CheckCircle2 size={14} style={{ opacity: hasNumber ? 1 : 0.5 }} />
                                    <span>{language === 'kn' ? 'ಒಂದು ಸಂಖ್ಯೆ [0-9]' : 'One number [0-9]'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: hasSpecialChar ? '#10b981' : '#ef4444' }}>
                                    <CheckCircle2 size={14} style={{ opacity: hasSpecialChar ? 1 : 0.5 }} />
                                    <span>{language === 'kn' ? 'ಒಂದು ವಿಶೇಷ ಅಕ್ಷರ (!@#$%^&*)' : 'One special char (!@#$%^&*)'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                {language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ' : 'Confirm Password'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 2.8rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid',
                                        borderColor: passwordsMatch ? 'var(--border)' : '#ef4444',
                                        background: 'var(--bg-dark)',
                                        color: 'var(--text-main)'
                                    }}
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Reset Password flow */}
                {isReset && (
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
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
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

                {/* Submit button logic */}
                <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={
                        isRegister && otpSent && !otpVerified ? getOtpSubmitDisabled() :
                        isRegister && otpVerified ? getCredentialsSubmitDisabled() :
                        loading
                    }
                    style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                    {isForgot ? (language === 'kn' ? 'ಮುಂದೆ' : 'Continue') :
                     isReset ? (language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್ ಬದಲಾಯಿಸಿ' : 'Reset Password') :
                     isRegister ? (
                         otpVerified ? (language === 'kn' ? 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ' : 'Confirm Password') :
                         otpSent ? (language === 'kn' ? 'ಪರಿಶೀಲಿಸಿ' : 'Verify OTP') : 
                         (language === 'kn' ? 'OTP ಕಳುಹಿಸಿ' : 'Send OTP')
                     ) :
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
                        setOtpSent(false);
                        setOtpVerified(false);
                        setError(''); setMessage('');
                        setFormData({ ...formData, otp: '', password: '', confirmPassword: '' });
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
