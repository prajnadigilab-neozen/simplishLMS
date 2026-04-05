import React, { useState, useEffect } from 'react';
import { billingApi, settingsApi } from '../utils/api';
import { useToast } from './Toast';
import { 
    ShieldCheck, 
    History, 
    CheckCircle2, 
    Loader2,
    Zap,
    Clock,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CheckoutSync = ({ user, onUpdateUser }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    const [showRecords, setShowRecords] = useState(false);
    const [settings, setSettings] = useState({ subscription_price: '99', subscription_duration_days: '30' });
    const [loadingSettings, setLoadingSettings] = useState(true);
    const showToast = useToast();

    // ── Load metadata on mount (script loaded lazily only for real mode) ──
    useEffect(() => {
        fetchLocalMetadata();
    }, []);

    const loadExternalScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve();
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = resolve;
            document.body.appendChild(script);
        });
    };

    const fetchLocalMetadata = async () => {
        try {
            const res = await settingsApi.get();
            if (res.data) setSettings(res.data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoadingSettings(false);
        }
    };

    useEffect(() => {
        if (showRecords) fetchSyncHistory();
    }, [showRecords]);

    const fetchSyncHistory = async () => {
        try {
            const res = await billingApi.getHistory();
            setRecords(res.data.history || []);
        } catch (err) {
            console.error('History sync error:', err);
        }
    };

    const handleSyncInitiate = async (type = 'MEMBERSHIP', customAmount = null) => {
        setLoading(true);
        try {
            const amount = customAmount || settings.subscription_price;
            
            // 1. Initiate Sync with Backend
            const syncRes = await billingApi.initiate({
                amount: amount,
                currency: 'INR',
                type: type
            });

            const { entry, token, mock } = syncRes.data;

            // --- MOCK MODE UI BYPASS ---
            if (mock) {
                showToast('MOCK MODE: Synchronizing secure resource...', 'info');
                setTimeout(async () => {
                    try {
                        const confirmRes = await billingApi.confirm({
                            sync_id: entry.id,
                            entry_id: `token_sync_${Math.random().toString(36).substring(7)}`,
                            signature: 'mock_sig'
                        });

                        if (confirmRes.status === 200) {
                            const successMsg = type === 'TOPUP' 
                                ? `Success! ₹${amount} added to your balance${settings.topup_duration_days > 0 ? ` + ${settings.topup_duration_days} days access` : ''}.` 
                                : `Success! Service extended by ${settings.subscription_duration_days} days.`;
                            showToast(successMsg, 'success');
                            if (onUpdateUser) await onUpdateUser();
                            navigate('/');
                        }
                    } catch (err) {
                        showToast('Sync confirmation failed.', 'error');
                    } finally {
                        setLoading(false);
                    }
                }, 2000);
                return;
            }

            // 2. Configure Sync Client (Real Mode)
            const config = {
                key: token,
                amount: entry.amount,
                currency: entry.currency,
                name: "Simplish Lab",
                description: type === 'TOPUP' 
                    ? `Top-up Wallet: ₹${amount}${settings.topup_duration_days > 0 ? ` + ${settings.topup_duration_days} Days Access` : ''}` 
                    : `Unlimited Access: ${settings.subscription_duration_days} Days`,
                image: "https://your-logo-url.png",
                order_id: entry.id,
                handler: async function (response) {
                    setLoading(true);
                    try {
                        const confirmRes = await billingApi.confirm({
                            sync_id: response.razorpay_order_id,
                            entry_id: response.razorpay_payment_id,
                            signature: response.razorpay_signature
                        });

                        if (confirmRes.status === 200) {
                            const successMsg = type === 'TOPUP' 
                                ? `Success! ₹${amount} added to your balance${settings.topup_duration_days > 0 ? ` + ${settings.topup_duration_days} days access` : ''}.` 
                                : `Success! Service extended by ${settings.subscription_duration_days} days.`;
                            showToast(successMsg, 'success');
                            if (onUpdateUser) await onUpdateUser();
                            navigate('/');
                        }
                    } catch (err) {
                        showToast('Confirmation failed.', 'error');
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: user?.fullName || "",
                    email: user?.email || "",
                    contact: user?.phone || ""
                },
                theme: { color: '#2563eb' },
                modal: { ondismiss: function() { setLoading(false); } }
            };

            // Load external resource only when needed (real mode)
            await loadExternalScript();
            const rzp = new window.Razorpay(config);
            rzp.open();

        } catch (err) {
            showToast('Failed to initiate secure checkout.', 'error');
            setLoading(false);
        }
    };

    const isSubscribed = user?.subscription_expires_at && new Date(user.subscription_expires_at) > new Date();

    return (
        <div id="billing-root" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eef2ff', color: '#4338ca', padding: '0.5rem 1.25rem', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(67, 56, 202, 0.1)' }}>
                    <ShieldCheck size={16} /> SECURE BILLING ENGINE
                </div>
                <h1 style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
                    Premium <span style={{ color: '#2563eb' }}>Access</span>
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.15rem' }}>
                    Extend your journey with flexible premium levels.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.5fr', gap: '2.5rem', alignItems: 'start' }}>
                
                {/* ── Status View ── */}
                <section>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ 
                            background: isSubscribed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                            borderRadius: '24px', padding: '2rem', color: 'white', position: 'relative', overflow: 'hidden', 
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)' 
                        }}
                    >
                        <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                            <Clock size={120} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', opacity: 0.8 }}>
                            <Zap size={20} /> <span style={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Financial Status</span>
                        </div>
                        
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>CURRENT BALANCE</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>₹{Number(user?.wallet_balance || 0).toFixed(2)}</div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>PREMIUM STATUS</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                {isSubscribed ? 'Active Profile' : 'Limited Access'}
                            </div>
                            {isSubscribed && (
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.9)' }}>
                                    {Math.ceil((new Date(user.subscription_expires_at) - new Date()) / (1000 * 60 * 60 * 24))} Days Remaining
                                </p>
                            )}
                        </div>
                    </motion.div>

                    <div style={{ marginTop: '1.5rem', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <History size={16} /> RECENT LOGS
                            </h3>
                            <button 
                                onClick={() => setShowRecords(!showRecords)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                {showRecords ? 'HIDE' : 'VIEW ALL'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {records.slice(0, 3).map((record, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                        ₹{record.amount} <span style={{ opacity: 0.5, fontWeight: 500 }}>({record.type})</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: record.status === 'completed' ? '#10b981' : '#ef4444', fontWeight: 800 }}>{record.status.toUpperCase()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Action Root ── */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* OPTION 1: MEMBERSHIP */}
                    <motion.div 
                        whileHover={{ y: -5 }}
                        style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}
                    >
                        <div style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={18} color="#2563eb" /> ACCESS EXTENSION
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>MEMBERSHIP</div>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b' }}>₹{settings.subscription_price}</div>
                                <div style={{ color: '#64748b', fontWeight: 600 }}>for {settings.subscription_duration_days} Days</div>
                            </div>
                            <button
                                onClick={() => handleSyncInitiate('MEMBERSHIP')}
                                disabled={loading}
                                style={{ 
                                    width: '100%', padding: '1rem', borderRadius: '12px', background: '#2563eb', 
                                    color: 'white', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'RENEW ACCESS'}
                            </button>
                        </div>
                    </motion.div>

                    {/* OPTION 2: TOP UP */}
                    <motion.div 
                        whileHover={isSubscribed ? { y: -5 } : {}}
                        style={{ 
                            background: 'white', 
                            borderRadius: '24px', 
                            border: '1px solid #e2e8f0', 
                            overflow: 'hidden', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                            position: 'relative',
                            opacity: isSubscribed ? 1 : 0.7,
                            cursor: isSubscribed ? 'default' : 'not-allowed'
                        }}
                    >
                        {!isSubscribed && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(255,255,255,0.4)',
                                backdropFilter: 'blur(1px)',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                padding: '1rem'
                            }}>
                                <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '50%', color: '#d97706' }}>
                                    <ShieldCheck size={24} />
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#92400e', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Membership Required
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#b45309', margin: 0, textAlign: 'center', fontWeight: 600 }}>
                                    Renew access to unlock wallet top-up
                                </p>
                            </div>
                        )}

                        <div style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={18} color="#f59e0b" fill="#f59e0b" /> WALLET TOP-UP
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>CREDITS</div>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b' }}>₹{settings.topup_price || '100'}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <div style={{ color: '#64748b', fontWeight: 700 }}>₹{settings.topup_amount || '100'} Credit</div>
                                    {settings.topup_duration_days > 0 && (
                                        <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 800 }}>+ {settings.topup_duration_days} Days Access</div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleSyncInitiate('TOPUP', Number(settings.topup_price || 100))}
                                disabled={loading || !isSubscribed}
                                style={{ 
                                    width: '100%', padding: '1rem', borderRadius: '12px', background: isSubscribed ? '#f59e0b' : '#d1d5db', 
                                    color: 'white', fontWeight: 800, border: 'none', cursor: (loading || !isSubscribed) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : isSubscribed ? 'TOP UP NOW' : 'LOCKED'}
                            </button>
                        </div>
                    </motion.div>

                </section>
            </div>

            {/* ── Sync History View ── */}
            <AnimatePresence>
                {showRecords && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: '2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>SYNC TOKEN</th>
                                    <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>VALUE</th>
                                    <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>TIMESTAMP</th>
                                    <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>STATE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1.25rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>{record.transaction_id}</td>
                                        <td style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700 }}>₹{record.amount}</td>
                                        <td style={{ padding: '1.25rem', fontSize: '0.85rem' }}>{new Date(record.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: record.status === 'completed' ? '#10b981' : '#ef4444' }}>
                                                {record.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default CheckoutSync;
