import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Smartphone, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '../utils/api';

const AuthForm = ({ onLoginSuccess, language }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        identifier: '', // Now strictly for 10-digit phone number
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const input = formData.identifier.trim();
            // Ensure 10 digits for phone
            const cleaned = input.replace(/\D/g, '');
            if (cleaned.length < 10) {
                setError(language === 'kn' ? 'ದಯವಿಟ್ಟು 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.' : 'Please enter a valid 10-digit mobile number.');
                setLoading(false);
                return;
            }
            const phone = cleaned.slice(-10);

            if (isRegister) {
                await authApi.register({ 
                    fullName: formData.fullName,
                    phone: phone,
                    password: formData.password 
                });
                
                // After registration, automatically login
                const loginRes = await authApi.login({
                    phone: phone,
                    password: formData.password
                });
                onLoginSuccess(loginRes.data.user, loginRes.data.token);
            } else {
                const res = await authApi.login({
                    phone: phone,
                    password: formData.password
                });
                onLoginSuccess(res.data.user, res.data.token);
            }
        } catch (err) {
            const status = err.response?.status;
            let errMsg = err.response?.data?.message || 'Something went wrong';

            // Provide a user-friendly message for "User already exists"
            if (status === 422 && (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists'))) {
                errMsg = language === 'kn' ? 'ಈ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಈಗಾಗಲೇ ನೊಂದಾಯಿತವಾಗಿದೆ. ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಮಾಡಿ.' : 'This mobile number is already registered. Please Sign In.';
            }

            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>
                {isRegister 
                    ? (language === 'kn' ? 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ' : 'Create Account') 
                    : (language === 'kn' ? 'ಲಾಗಿನ್ ಮಾಡಿ' : 'Sign In')}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                {isRegister 
                    ? (language === 'kn' ? 'ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಲು ನೋಂದಾಯಿಸಿ' : 'Register to start learning') 
                    : (language === 'kn' ? 'ನಿಮ್ಮ ಕಲಿಕೆಯನ್ನು ಮುಂದುವರಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ' : 'Log in to continue your learning')}
            </p>

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
                                autoComplete="name"
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                placeholder={language === 'kn' ? "ಹೆಸರು" : "John Doe"}
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        {language === 'kn' ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : 'Mobile Number'}
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Smartphone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            required
                            autoComplete="username"
                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                            placeholder="9876543210"
                            value={formData.identifier}
                            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        {language === 'kn' ? 'ಪಾಸ್ವರ್ಡ್' : 'Password'}
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            required
                            autoComplete={isRegister ? "new-password" : "current-password"}
                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    {isRegister && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {language === 'kn' 
                                ? 'ಪಾಸ್ವರ್ಡ್ ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು ಮತ್ತು ಅಕ್ಷರ ಹಾಗು ಸಂಖ್ಯೆಗಳನ್ನು ಒಳಗೊಂಡಿರಬೇಕು.' 
                                : 'Password must be at least 8 characters and include letters and numbers.'}
                        </p>
                    )}
                </div>

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                        {error}
                    </div>
                )}

                <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                    {isRegister 
                        ? (language === 'kn' ? 'ಖಾತೆ ರಚಿಸಿ' : 'Register') 
                        : (language === 'kn' ? 'ಲಾಗಿನ್ ಮಾಡಿ' : 'Sign In')}
                </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                    {isRegister 
                        ? (language === 'kn' ? 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ? ' : 'Already have an account? ') 
                        : (language === 'kn' ? 'ಖಾತೆ ಇಲ್ಲವೇ? ' : "Don't have an account? ")}
                </span>
                <button
                    onClick={() => setIsRegister(!isRegister)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                    {isRegister 
                        ? (language === 'kn' ? 'ಸೈನ್ ಇನ್ ಮಾಡಿ' : 'Sign In') 
                        : (language === 'kn' ? 'ನೋಂದಾಯಿಸಿ' : 'Register')}
                </button>
            </div>
        </div>
    );
};

export default AuthForm;
