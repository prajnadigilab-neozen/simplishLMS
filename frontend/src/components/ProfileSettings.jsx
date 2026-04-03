import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Camera, MapPin, AlignLeft, Save, X, Loader2, Phone } from 'lucide-react';
import { authApi } from '../utils/api';
import { useToast } from './Toast';

const ProfileSettings = ({ user, onUpdate, onBack, language }) => {
    const [form, setForm] = useState({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
        password: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const showToast = useToast();

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', form.fullName);
            formData.append('email', form.email);
            formData.append('phone', form.phone);
            formData.append('bio', form.bio);
            formData.append('location', form.location);
            if (form.password) formData.append('password', form.password);
            if (avatarFile) formData.append('avatar', avatarFile);

            const token = localStorage.getItem('simplish_token');
            const res = await authApi.updateProfile(formData, token);

            await onUpdate(res.data.user);
            onBack();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update profile', 'error');
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
                // The API call usually triggers a logout or requires it
                localStorage.removeItem('simplish_token');
                localStorage.removeItem('simplish_user');
                window.location.href = '/';
            } catch (err) {
                showToast(err.response?.data?.message || 'Failed to delete account', 'error');
                setLoading(false);
            }
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem 1rem 0.75rem 2.8rem',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        transition: 'all 0.2s',
        outline: 'none',
        boxSizing: 'border-box'
    };

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

                <form onSubmit={handleSubmit}>
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
                                    {user.role}
                                </div>
                            </div>
                        </div>

                        {/* Right: Info Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>{language === 'kn' ? 'ಪೂರ್ಣ ಹೆಸರು' : 'Full Name'}</label>
                                <User size={18} style={iconStyle} />
                                <input
                                    style={inputStyle}
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
                                        style={inputStyle}
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
                                        style={inputStyle}
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
                                    style={inputStyle}
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    placeholder={language === 'kn' ? 'ಉದಾ: ಬೆಂಗಳೂರು, ಭಾರತ' : "e.g. Bengaluru, India"}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <label style={labelStyle}>{language === 'kn' ? 'ನನ್ನ ಬಗ್ಗೆ' : 'Bio'}</label>
                                <AlignLeft size={18} style={{ ...iconStyle, top: '2.5rem' }} />
                                <textarea
                                    style={{ ...inputStyle, height: '100px', resize: 'none', paddingTop: '0.75rem', paddingLeft: '2.8rem' }}
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
                                    style={inputStyle}
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
