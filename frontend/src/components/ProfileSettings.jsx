import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Camera, MapPin, AlignLeft, Save, X, Loader2, Phone, Calendar, Briefcase, Home, Globe } from 'lucide-react';
import { authApi } from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../context/UserContext';
import { safeGetItem, safeRemoveItem } from '../utils/storageUtils';
import { useOnboardingStore } from '../hooks/useOnboardingStore';

const ProfileSettings = ({ onBack }) => {
    const { user, setUser, language } = useUser();
    const showToast = useToast();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Zustand cache store for Onboarding Funnel state
    const dob = useOnboardingStore((state) => state.dob);
    const employmentStatus = useOnboardingStore((state) => state.employmentStatus);
    const personalAddress = useOnboardingStore((state) => state.personalAddress);
    const place = useOnboardingStore((state) => state.place);
    const pincode = useOnboardingStore((state) => state.pincode);
    const setField = useOnboardingStore((state) => state.setField);
    const resetStore = useOnboardingStore((state) => state.resetStore);

    const [errors, setErrors] = useState({});

    // Standard profile settings state (for onboarded users)
    const [form, setForm] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        location: user?.location || '',
        state: user?.state || 'Karnataka',
        password: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size must be less than 5MB', 'error');
                return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitStandard = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', form.fullName);
            formData.append('email', form.email);
            formData.append('phone', form.phone);
            formData.append('bio', form.bio);
            formData.append('location', form.location);
            formData.append('state', form.state);
            if (form.password) formData.append('password', form.password);
            if (avatarFile) formData.append('avatar', avatarFile);

            const token = safeGetItem('simplish_token');
            const res = await authApi.updateProfile(formData, token);

            const updatedUser = {
              ...res.data.user,
              role: res.data.user.role?.toLowerCase()?.replace(/\s+|_/g, '_'),
              isLoggedIn: true,
              token: token
            };
            setUser(updatedUser);
            showToast(language === 'kn' ? 'ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಲಾಗಿದೆ' : 'Profile updated successfully', 'success');
            onBack();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitOnboarding = async (e) => {
        e.preventDefault();
        const newErrors = {};
        setErrors({});

        // Validate DOB
        if (!dob) {
            newErrors.dob = true;
        } else {
            const dobDate = new Date(dob);
            if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
                newErrors.dob = true;
                showToast(language === 'kn' ? 'ಹುಟ್ಟಿದ ದಿನಾಂಕವು ಇತಿಹಾಸದಲ್ಲಿರಬೇಕು.' : 'Date of Birth must be in the past.', 'error');
            }
        }

        // Validate Employment Status
        if (!employmentStatus) {
            newErrors.employmentStatus = true;
        }

        // Validate Place
        if (!place || place.trim() === '') {
            newErrors.place = true;
        }

        // Validate Pincode
        if (!pincode || !/^\d{6}$/.test(pincode)) {
            newErrors.pincode = true;
            showToast(language === 'kn' ? 'ಪಿನ್‌ಕೋಡ್ ೬ ಅಂಕಿಗಳಿರಬೇಕು (ಭಾರತ).' : 'Pincode must be exactly 6 digits (India).', 'error');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showToast(language === 'kn' ? 'ದಯವಿಟ್ಟು ತಪ್ಪುಗಳನ್ನು ಸರಿಪಡಿಸಿ.' : 'Please correct the highlighted fields.', 'error');
            return;
        }

        setLoading(true);
        try {
            const token = safeGetItem('simplish_token');
            const payload = {
                fullName: user.fullName || user.full_name,
                dob,
                employmentStatus,
                personalAddress,
                place,
                pincode,
                onboardingComplete: true,
                onboardingCompleted: true
            };

            const res = await authApi.updateProfile(payload, token);

            const updatedUser = {
                ...res.data.user,
                role: res.data.user.role?.toLowerCase()?.replace(/\s+|_/g, '_'),
                isLoggedIn: true,
                token: token
            };

            setUser(updatedUser);
            resetStore(); // Reset Zustand cache on success
            showToast(language === 'kn' ? 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಂಡಿದೆ!' : 'Profile onboarding completed!', 'success');
            
            // Redirect to placement route
            window.location.href = '/placement';
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit onboarding profile.';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmMsg = language === 'kn' 
            ? 'ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಅಳಿಸಲು ನೀವು ಖಚಿತವಾಗಿ ಬಯಸುವಿರಾ? ಇದು ನಿಮ್ಮ ಎಲ್ಲಾ ಪ್ರಗತಿಯನ್ನು ಅಳಿಸುತ್ತದೆ ಮತ್ತು ಇದನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.'
            : 'Are you absolutely sure you want to delete your account? This will wipe all your progress and cannot be undone.';
        
        if (window.confirm(confirmMsg)) {
            try {
                setLoading(true);
                await authApi.deleteMe();
                showToast('Your account has been deleted successfully.', 'success');
                safeRemoveItem('simplish_token');
                safeRemoveItem('simplish_user');
                safeRemoveItem('simplish_active_lesson');
                window.location.href = '/';
            } catch (err) {
                showToast(err.response?.data?.message || 'Failed to delete account', 'error');
                setLoading(false);
            }
        }
    };

    const inputStyle = (hasError) => ({
        width: '100%',
        padding: '0.75rem 1rem 0.75rem 2.8rem',
        borderRadius: '12px',
        border: hasError ? '2px solid #ef4444' : '1px solid var(--border)',
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        transition: 'all 0.2s',
        outline: 'none',
        boxSizing: 'border-box'
    });

    const labelStyle = {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        marginBottom: '0.5rem',
        marginLeft: '0.25rem'
    };

    const iconStyle = {
        position: 'absolute',
        left: '1rem',
        top: '2.5rem',
        color: 'var(--text-muted)',
        pointerEvents: 'none'
    };

    // ── PROGRESSIVE PROFILE ONBOARDING FUNNEL VIEW ──
    if (user && !user.onboarding_completed) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: '600px', margin: '2rem auto', width: '100%' }}
            >
                <div className="glass-card" style={{ padding: '2.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', marginBottom: '1rem' }}>
                            <User size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            {language === 'kn' ? 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ' : 'Complete Your Profile'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                            {language === 'kn' ? 'ಕಲಿಕೆ ಆರಂಭಿಸಲು ನಿಮ್ಮ ಮೂಲ ವಿವರಗಳನ್ನು ಒದಗಿಸಿ.' : 'Provide your basic details to unlock placement & learning.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmitOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* DOB Picker */}
                        <div style={{ position: 'relative' }}>
                            <label style={labelStyle}>{language === 'kn' ? 'ಹುಟ್ಟಿದ ದಿನಾಂಕ' : 'Date of Birth (DOB)'}</label>
                            <Calendar size={18} style={iconStyle} />
                            <input
                                type="date"
                                required
                                max={new Date().toISOString().split('T')[0]}
                                style={inputStyle(errors.dob)}
                                value={dob}
                                onChange={(e) => setField('dob', e.target.value)}
                            />
                        </div>

                        {/* Employment Status Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <label style={labelStyle}>{language === 'kn' ? 'ಉದ್ಯೋಗದ ಸ್ಥಿತಿ' : 'Employment Status'}</label>
                            <Briefcase size={18} style={iconStyle} />
                            <select
                                required
                                style={inputStyle(errors.employmentStatus)}
                                value={employmentStatus}
                                onChange={(e) => setField('employmentStatus', e.target.value)}
                            >
                                <option value="Student">{language === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿ (Student)' : 'Student'}</option>
                                <option value="Employed">{language === 'kn' ? 'ಉದ್ಯೋಗಿ (Employed)' : 'Employed'}</option>
                                <option value="Self-Employed">{language === 'kn' ? 'ಸ್ವಯಂ ಉದ್ಯೋಗಿ (Self-Employed)' : 'Self-Employed'}</option>
                                <option value="Unemployed">{language === 'kn' ? 'ನಿರುದ್ಯೋಗಿ (Unemployed)' : 'Unemployed'}</option>
                                <option value="Other">{language === 'kn' ? 'ಇತರೆ (Other)' : 'Other'}</option>
                            </select>
                        </div>

                        {/* Place */}
                        <div style={{ position: 'relative' }}>
                            <label style={labelStyle}>{language === 'kn' ? 'ಊರು / ಸ್ಥಳ' : 'Place'}</label>
                            <Globe size={18} style={iconStyle} />
                            <input
                                type="text"
                                required
                                placeholder={language === 'kn' ? 'ಉದಾ: ಬೆಂಗಳೂರು' : 'e.g. Bengaluru'}
                                style={inputStyle(errors.place)}
                                value={place}
                                onChange={(e) => setField('place', e.target.value)}
                            />
                        </div>

                        {/* Pincode */}
                        <div style={{ position: 'relative' }}>
                            <label style={labelStyle}>{language === 'kn' ? 'ಪಿನ್‌ಕೋಡ್' : 'Pincode (6 digits)'}</label>
                            <MapPin size={18} style={iconStyle} />
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="560001"
                                style={inputStyle(errors.pincode)}
                                value={pincode}
                                onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, ''))}
                            />
                        </div>

                        {/* Personal Address (Optional) */}
                        <div style={{ position: 'relative' }}>
                            <label style={labelStyle}>{language === 'kn' ? 'ವೈಯಕ್ತಿಕ ವಿಳಾಸ (ಐಚ್ಛಿಕ)' : 'Personal Address (Optional)'}</label>
                            <Home size={18} style={{ ...iconStyle, top: '2.5rem' }} />
                            <textarea
                                placeholder={language === 'kn' ? 'ನಿಮ್ಮ ವಿಳಾಸ ನಮೂದಿಸಿ...' : 'Enter your residential address...'}
                                style={{ ...inputStyle(errors.personalAddress), height: '80px', resize: 'none', paddingTop: '0.75rem', paddingLeft: '2.8rem' }}
                                value={personalAddress}
                                onChange={(e) => setField('personalAddress', e.target.value)}
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                borderRadius: '12px',
                                marginTop: '1rem'
                            }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? (language === 'kn' ? 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting...') : (language === 'kn' ? 'ಪ್ರೊಫೈಲ್ ಸಲ್ಲಿಸಿ' : 'Submit & Continue')}
                        </button>
                    </form>
                </div>
            </motion.div>
        );
    }

    // ── STANDARD PROFILE SETTINGS VIEW (For Fully Onboarded Users) ──
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}
        >
            <div className="glass-card" style={{ padding: '2.5rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            {language === 'kn' ? 'ಖಾತೆ ವಿವರಗಳು' : 'Profile Settings'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {language === 'kn' ? 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ ಮತ್ತು ಪ್ರೊಫೈಲ್ ಚಿತ್ರವನ್ನು ನವೀಕರಿಸಿ.' : 'Update your personal information and profile picture.'}
                        </p>
                    </div>
                    <button onClick={onBack} className="icon-btn" style={{ padding: '0.5rem', borderRadius: '50%', background: '#f1f5f9' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmitStandard}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 250px) 1fr', gap: '3rem' }}>
                        {/* Left: Avatar Column */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <div style={{
                                    width: '180px',
                                    height: '180px',
                                    borderRadius: '24px',
                                    background: 'var(--primary-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    border: '4px solid #fff',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                                }}>
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={80} color="var(--primary)" style={{ opacity: 0.5 }} />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        position: 'absolute',
                                        right: '-10px',
                                        bottom: '-10px',
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)',
                                        border: '4px solid #fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    <Camera size={18} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                            <div style={{ marginTop: '1.5rem' }}>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '100px',
                                    background: 'var(--primary-light)',
                                    color: 'var(--primary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                }}>
                                    {user?.role}
                                </div>
                            </div>
                        </div>

                        {/* Right: Info Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>{language === 'kn' ? 'ಪೂರ್ಣ ಹೆಸರು' : 'Full Name'}</label>
                                <User size={18} style={iconStyle} />
                                <input
                                    style={inputStyle(false)}
                                    value={form.fullName}
                                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                                    placeholder={language === 'kn' ? 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ' : "Enter your full name"}
                                    required
                                    autoComplete="name"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{language === 'kn' ? 'ಇಮೇಲ್ (ಐಚ್ಛಿಕ)' : 'Email (Optional)'}</label>
                                    <Mail size={18} style={iconStyle} />
                                    <input
                                        type="email"
                                        style={inputStyle(false)}
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="email@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{language === 'kn' ? 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ' : 'Phone'}</label>
                                    <Phone size={18} style={iconStyle} />
                                    <input
                                        type="tel"
                                        style={inputStyle(false)}
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        placeholder="9876543210"
                                        required
                                        maxLength={10}
                                        autoComplete="tel"
                                    />
                                </div>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>{language === 'kn' ? 'ಸ್ಥಳ' : 'Location'}</label>
                                <MapPin size={18} style={iconStyle} />
                                <input
                                    style={inputStyle(false)}
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    placeholder={language === 'kn' ? 'ಉದಾ: ಬೆಂಗಳೂರು, ಭಾರತ' : "e.g. Bengaluru, India"}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>{language === 'kn' ? 'ರಾಜ್ಯ' : 'State'}</label>
                                <MapPin size={18} style={iconStyle} />
                                <select
                                    style={inputStyle(false)}
                                    value={form.state}
                                    onChange={e => setForm({ ...form, state: e.target.value })}
                                >
                                    {['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>{language === 'kn' ? 'ನನ್ನ ಬಗ್ಗೆ' : 'Bio'}</label>
                                <AlignLeft size={18} style={{ ...iconStyle, top: '2.5rem' }} />
                                <textarea
                                    style={{ ...inputStyle(false), height: '100px', resize: 'none', paddingTop: '0.75rem', paddingLeft: '2.8rem' }}
                                    value={form.bio}
                                    onChange={e => setForm({ ...form, bio: e.target.value })}
                                    placeholder={language === 'kn' ? 'ನಿಮ್ಮ ಕಲಿಕೆಯ ಗುರಿಗಳ ಬಗ್ಗೆ ನಮಗೆ ತಿಳಿಸಿ...' : "Tell us a little about your learning goals..."}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>{language === 'kn' ? 'ಹೊಸ ಪಾಸ್ವರ್ಡ್ (ಅಗತ್ಯವಿದ್ದರೆ ಮಾತ್ರ)' : 'New Password (Optional)'}</label>
                                <Lock size={18} style={iconStyle} />
                                <input
                                    type="password"
                                    style={inputStyle(false)}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder={language === 'kn' ? 'ಖಾಲಿ ಬಿಟ್ಟರೆ ಹಳೆಯ ಪಾಸ್ವರ್ಡ್ ಇರುತ್ತದೆ' : "Leave blank to keep current password"}
                                    autoComplete="new-password"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                    className="btn btn-primary"
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        borderRadius: '12px'
                                    }}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {loading 
                                        ? (language === 'kn' ? 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...' : 'Saving...') 
                                        : (language === 'kn' ? 'ಮಾಹಿತಿ ಉಳಿಸಿ' : 'Save Changes')}
                                </button>
                                    <button
                                    className="btn"
                                    type="button"
                                    onClick={onBack}
                                    style={{
                                        padding: '1rem 2rem',
                                        background: 'var(--bg-dark)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-main)',
                                        borderRadius: '12px'
                                    }}
                                >
                                    {language === 'kn' ? 'ರದ್ದುಮಾಡಿ' : 'Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                <div style={{
                    marginTop: '3rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <h4 style={{ color: '#dc2626', margin: 0, fontSize: '1rem' }}>
                        {language === 'kn' ? 'ಖಾತೆ ಅಳಿಸಿ (Danger Zone)' : 'Danger Zone'}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        {language === 'kn' 
                            ? 'ಒಮ್ಮೆ ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಅಳಿಸಿದರೆ, ಅದನ್ನು ಮರಳಿ ಪಡೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಎಲ್ಲಾ ಪ್ರಗತಿಯನ್ನು ಅಳಿಸಲಾಗುತ್ತದೆ.'
                            : 'Once you delete your account, there is no going back. All your progress will be cleared.'}
                    </p>
                    <button
                        type="button"
                        onClick={handleDeleteAccount}
                        style={{
                            alignSelf: 'flex-start',
                            padding: '0.6rem 1.2rem',
                            background: '#fff',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#fff';
                        }}
                    >
                        {language === 'kn' ? 'ಖಾತೆ ಕಿತ್ತುಹಾಕಿ' : 'Delete Account'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ProfileSettings;
