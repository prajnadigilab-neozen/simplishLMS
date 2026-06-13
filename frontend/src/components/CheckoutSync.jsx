import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi, settingsApi } from '../utils/api';
import { useToast } from './Toast';
import { 
    ShieldCheck, 
    History, 
    CheckCircle2, 
    Loader2,
    Zap,
    Clock,
    RefreshCw,
    AlertTriangle,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';

const isWithinRefundPeriod = (createdAt) => {
    if (!createdAt) return false;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return ageMs <= thirtyDaysMs;
};

const CheckoutSync = () => {
    const { user, refreshUserContext } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    const [showRecords, setShowRecords] = useState(false);
    const [settings, setSettings] = useState({ subscription_price: '99', subscription_duration_days: '30' });
    const [loadingSettings, setLoadingSettings] = useState(true);
    const showToast = useToast();

    // Refund flow states
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [reasonCategory, setReasonCategory] = useState('Duplicate payment / Charged twice');
    const [reasonNotes, setReasonNotes] = useState('');
    const [refundSubmitting, setRefundSubmitting] = useState(false);

    const handleRefundSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPayment) return;

        if (reasonCategory === 'Other' && (!reasonNotes || reasonNotes.trim().length < 10)) {
            showToast('Detailed explanation (min 10 characters) is required for "Other" reason.', 'error');
            return;
        }

        setRefundSubmitting(true);
        try {
            const res = await billingApi.refund({
                payment_id: selectedPayment.transaction_id,
                refund_type: 'full',
                reason_category: reasonCategory,
                reason_notes: reasonCategory === 'Other' ? reasonNotes : undefined
            });

            if (res.data && res.data.success) {
                showToast(`Refund processed successfully: ₹${res.data.refund.refund_amount_rupees}`, 'success');
                setSelectedPayment(null);
                setReasonNotes('');
                setReasonCategory('Duplicate payment / Charged twice');
                await fetchSyncHistory();
                await refreshUserContext();
            } else {
                showToast(res.data?.message || 'Refund failed.', 'error');
            }
        } catch (err) {
            console.error('Refund submission error:', err);
            showToast(err.response?.data?.message || 'Failed to process refund request.', 'error');
        } finally {
            setRefundSubmitting(false);
        }
    };

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
            if (res.data) setSettings(prev => ({ ...prev, ...res.data }));
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
            const amount = customAmount || settings.subscription_price || '99';
            
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
                            await refreshUserContext();
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
                            await refreshUserContext();
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
                            <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>₹{(Number(user?.wallet_balance || 0) / 100).toFixed(2)}</div>
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
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#b91c1c',
                                    background: '#fee2e2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#fecaca';
                                    e.target.style.borderColor = '#fca5a5';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#fee2e2';
                                    e.target.style.borderColor = '#fecaca';
                                }}
                            >
                                {showRecords ? 'Hide' : 'Refund'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {records.slice(0, 3).map((record, i) => {
                                const refundedAmount = record.refunded_amount_paise || 0;
                                const isFullyRefunded = refundedAmount >= record.amount_paise;
                                return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                                ₹{(Number(record.amount_paise) || 0) / 100} <span style={{ opacity: 0.5, fontWeight: 500 }}>({record.payment_type})</span>
                                            </div>
                                            {refundedAmount > 0 && (
                                                <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 600 }}>
                                                    ₹{(refundedAmount / 100).toFixed(2)} refunded
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                color: isFullyRefunded 
                                                    ? '#94a3b8' 
                                                    : record.status === 'completed' 
                                                        ? '#10b981' 
                                                        : '#ef4444', 
                                                fontWeight: 800 
                                            }}>
                                                {isFullyRefunded ? 'REFUNDED' : record.status.toUpperCase()}
                                            </span>
                                             {record.status === 'completed' && record.payment_type === 'TOPUP' && !isFullyRefunded && (
                                                 isWithinRefundPeriod(record.created_at) ? (
                                                     <button onClick={() => setSelectedPayment(record)} style={{ fontSize: '0.7rem', border: 'none', background: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>REFUND</button>
                                                 ) : (
                                                     <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Expired</span>
                                                 )
                                             )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── Action Root ── */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* OPTION 1: MEMBERSHIP */}
                    <motion.div 
                        whileHover={!isSubscribed ? { y: -5 } : {}}
                        style={{ 
                            background: 'white', 
                            borderRadius: '24px', 
                            border: '1px solid #e2e8f0', 
                            overflow: 'hidden', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                            position: 'relative',
                            opacity: isSubscribed ? 0.7 : 1,
                            cursor: isSubscribed ? 'not-allowed' : 'default'
                        }}
                    >
                        {isSubscribed && (
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
                                <div style={{ background: '#d1fae5', padding: '0.75rem', borderRadius: '50%', color: '#059669' }}>
                                    <CheckCircle2 size={24} />
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#065f46', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Access Active
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#047857', margin: 0, textAlign: 'center', fontWeight: 600 }}>
                                    Access is active. Wallet top-up is available below.
                                </p>
                            </div>
                        )}

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
                                disabled={loading || isSubscribed}
                                style={{ 
                                    width: '100%', padding: '1rem', borderRadius: '12px', background: isSubscribed ? '#d1d5db' : '#2563eb', 
                                    color: 'white', fontWeight: 800, border: 'none', cursor: (loading || isSubscribed) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : isSubscribed ? 'ACCESS ACTIVE' : 'RENEW ACCESS'}
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
                                    <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record, idx) => {
                                    const refundedAmount = record.refunded_amount_paise || 0;
                                    const isFullyRefunded = refundedAmount >= record.amount_paise;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '1.25rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>{record.transaction_id}</td>
                                            <td style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>₹{(Number(record.amount_paise) || 0) / 100}</span>
                                                    {refundedAmount > 0 && (
                                                        <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 600 }}>
                                                            ₹{(refundedAmount / 100).toFixed(2)} refunded
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem', fontSize: '0.85rem' }}>{new Date(record.created_at).toLocaleDateString()}</td>
                                            <td style={{ padding: '1.25rem' }}>
                                                <span style={{ 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 800, 
                                                    color: isFullyRefunded 
                                                        ? '#94a3b8' 
                                                        : record.status === 'completed' 
                                                            ? '#10b981' 
                                                            : '#ef4444' 
                                                }}>
                                                    {isFullyRefunded ? 'REFUNDED' : record.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem' }}>
                                                {record.status === 'completed' && record.payment_type === 'TOPUP' && !isFullyRefunded ? (
                                                    isWithinRefundPeriod(record.created_at) ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPayment(record);
                                                                setReasonCategory('Duplicate payment / Charged twice');
                                                                setReasonNotes('');
                                                            }}
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                color: '#dc2626',
                                                                background: '#fef2f2',
                                                                border: '1px solid #fecaca',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease-in-out'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.target.style.background = '#fee2e2';
                                                                e.target.style.borderColor = '#fca5a5';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.target.style.background = '#fef2f2';
                                                                e.target.style.borderColor = '#fecaca';
                                                            }}
                                                        >
                                                            Request Refund
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Refund expired</span>
                                                    )
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Refund Request Modal ── */}
            <AnimatePresence>
                {selectedPayment && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                width: '100%',
                                maxWidth: '500px',
                                backgroundColor: 'white',
                                borderRadius: '24px',
                                padding: '2rem',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                border: '1px solid #e2e8f0',
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={() => setSelectedPayment(null)}
                                style={{
                                    position: 'absolute',
                                    top: '1.5rem',
                                    right: '1.5rem',
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                <X size={20} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#dc2626' }}>
                                <AlertTriangle size={24} />
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Request Full Refund</h2>
                            </div>

                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Transaction ID</div>
                                <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', wordBreak: 'break-all' }}>{selectedPayment.transaction_id}</div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Refund Amount</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>₹{((selectedPayment.amount_paise - (selectedPayment.refunded_amount_paise || 0)) / 100).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Type</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginTop: '0.15rem' }}>{selectedPayment.payment_type}</div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleRefundSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Reason for Refund</label>
                                    <select
                                        value={reasonCategory}
                                        onChange={(e) => setReasonCategory(e.target.value)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '10px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            background: '#ffffff',
                                            color: '#0f172a',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="Duplicate payment / Charged twice" style={{ color: '#0f172a', background: '#ffffff' }}>Duplicate payment / Charged twice</option>
                                        <option value="Order cancelled by customer" style={{ color: '#0f172a', background: '#ffffff' }}>Order cancelled by customer</option>
                                        <option value="Other" style={{ color: '#0f172a', background: '#ffffff' }}>Other (requires explanation)</option>
                                    </select>
                                </div>

                                {reasonCategory === 'Other' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Detailed Explanation</label>
                                        <textarea
                                            value={reasonNotes}
                                            onChange={(e) => setReasonNotes(e.target.value)}
                                            placeholder="Explain why you are requesting a refund (minimum 10 characters)..."
                                            rows={3}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '10px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.9rem',
                                                outline: 'none',
                                                resize: 'none',
                                                fontFamily: 'inherit',
                                                background: '#ffffff',
                                                color: '#0f172a'
                                            }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: reasonNotes.trim().length >= 10 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                            {reasonNotes.trim().length} / 10 characters minimum
                                        </span>
                                    </div>
                                )}

                                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#b91c1c', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <span>
                                        <strong>Refund Notice:</strong> This action initiates a full refund of the remaining balance. Once submitted, it cannot be undone. 
                                        {selectedPayment.payment_type === 'TOPUP' && " Decrementing wallet balance will occur automatically upon refund completion."}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPayment(null)}
                                        disabled={refundSubmitting}
                                        style={{
                                            flex: 1,
                                            padding: '0.85rem',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            color: '#64748b',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => { if(!refundSubmitting) e.target.style.backgroundColor = '#f1f5f9'; }}
                                        onMouseLeave={(e) => { if(!refundSubmitting) e.target.style.backgroundColor = '#f8fafc'; }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={refundSubmitting || (reasonCategory === 'Other' && reasonNotes.trim().length < 10)}
                                        style={{
                                            flex: 1,
                                            padding: '0.85rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: (refundSubmitting || (reasonCategory === 'Other' && reasonNotes.trim().length < 10)) ? '#cbd5e1' : '#dc2626',
                                            color: 'white',
                                            fontWeight: 700,
                                            cursor: (refundSubmitting || (reasonCategory === 'Other' && reasonNotes.trim().length < 10)) ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => { if(!refundSubmitting && !(reasonCategory === 'Other' && reasonNotes.trim().length < 10)) e.target.style.backgroundColor = '#b91c1c'; }}
                                        onMouseLeave={(e) => { if(!refundSubmitting && !(reasonCategory === 'Other' && reasonNotes.trim().length < 10)) e.target.style.backgroundColor = '#dc2626'; }}
                                    >
                                        {refundSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Processing...
                                            </>
                                        ) : 'Confirm Refund'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default CheckoutSync;
