import React, { useEffect, useState, useCallback } from 'react';
import { reportApi } from '../utils/api';
import {
    Users,
    UserMinus,
    Activity,
    BarChart3,
    Loader2,
    Download,
    CalendarDays,
    Lock,
    Search,
    BookOpen,
    Sparkles,
    ShieldCheck,
    IndianRupee,
    ChevronRight,
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    Clock,
    Phone,
    Mail,
    CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
};

const toLocalDateStr = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const todayStr = () => toLocalDateStr(new Date());
const thirtyDaysAgoStr = () => toLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

const StatusBadge = ({ status }) => {
    const config = {
        completed: { bg: '#dcfce7', color: '#166534', icon: CheckCircle2, label: 'Completed' },
        pending: { bg: '#fef9c3', color: '#854d0e', icon: Clock, label: 'Pending' },
        failed: { bg: '#fee2e2', color: '#991b1b', icon: AlertCircle, label: 'Failed' }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.75rem', borderRadius: '999px',
            background: c.bg, color: c.color,
            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
        }}>
            <Icon size={12} />
            {c.label}
        </span>
    );
};

// ── Component ─────────────────────────────────────────────────────────────────
const Reports = ({ user: userProp, hideHeader = false }) => {
    const { user: contextUser } = useUser();
    const user = userProp || contextUser;
    const role = user?.role?.toLowerCase()?.replace(/\s+|_/g, '_');
    const isSuperAdmin = role === 'super_admin';
    const canSeeRevenue = isSuperAdmin;

    // Sub-tab state
    const [reportTab, setReportTab] = useState('platform');

    // Date filter state
    const [fromDate, setFromDate] = useState(thirtyDaysAgoStr());
    const [toDate, setToDate] = useState(todayStr());

    // Refund report date filters (separate)
    const [refundFromDate, setRefundFromDate] = useState(thirtyDaysAgoStr());
    const [refundToDate, setRefundToDate] = useState(todayStr());

    useEffect(() => {
        console.log('[Reports] User:', user?.id, 'Role:', role, 'CanSeeRevenue:', canSeeRevenue);
    }, [user, role, canSeeRevenue]);

    // Data state
    const [dailyBreakdown, setDailyBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('REPORTS');

    // Refund report state
    const [refundData, setRefundData] = useState([]);
    const [refundSummary, setRefundSummary] = useState({ total: 0, total_refunded: 0 });
    const [refundLoading, setRefundLoading] = useState(false);

    // ── Admin Tabs ──
    const tabs = ['USERS', 'GENERAL STATS', 'REPORTS', 'MODERATORS', ...(isSuperAdmin ? ['GLOBAL SETTINGS'] : [])];

    // ── Fetch Data ──
    const fetchReports = useCallback(async (from, to) => {
        setLoading(true);
        try {
            const res = await reportApi.getDailyReport({ from, to });
            setDailyBreakdown(res.data.daily_breakdown || []);
            console.log('[Reports] DAILY BREAKDOWN DATA:', res.data.daily_breakdown);
        } catch (err) {
            console.error('Failed to load reports:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRefundReport = useCallback(async (from, to) => {
        if (!isSuperAdmin) return;
        setRefundLoading(true);
        try {
            const res = await reportApi.getRefundReport({ from, to });
            setRefundData(res.data.refunds || []);
            setRefundSummary({ total: res.data.total || 0, total_refunded: res.data.total_refunded || 0 });
        } catch (err) {
            console.error('Failed to load refund report:', err);
        } finally {
            setRefundLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchReports(fromDate, toDate);
    }, [fetchReports]); // Run once on mount with default dates

    useEffect(() => {
        if (reportTab === 'refunds' && isSuperAdmin) {
            fetchRefundReport(refundFromDate, refundToDate);
        }
    }, [reportTab, isSuperAdmin]);

    const handleView = () => {
        fetchReports(fromDate, toDate);
    };

    const handleRefundView = () => {
        fetchRefundReport(refundFromDate, refundToDate);
    };

    // ── CSV Download ──
    const downloadCSV = () => {
        const val = (v) => (v !== null && v !== undefined) ? String(v) : '0';
        
        const headers = [
            'Date', 
            'Registered Users', 
            'Active Users', 
            ...(canSeeRevenue ? ['Top-Up Revenue', 'Membership Revenue', 'Total Revenue'] : []),
            'Deleted Users'
        ];

        const rows = dailyBreakdown.map(row => [
            row.date,
            row.registrations,
            row.active,
            ...(canSeeRevenue ? [row.topUpRevenue, row.membershipRevenue, row.revenue] : []),
            row.deleted
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(c => `"${c}"`).join(','))
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform_report_${fromDate}_to_${toDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Refund CSV Download ──
    const downloadRefundCSV = () => {
        const headers = [
            'Refund Date', 'User Name', 'Phone', 'Email',
            'Payment ID', 'Payment Type', 'Payment Mode',
            'Original Amount (₹)', 'Refund Amount (₹)', 'Refund Type',
            'Reason', 'Notes', 'Status', 'Razorpay Refund ID'
        ];

        const rows = refundData.map(r => [
            new Date(r.refund_date).toLocaleDateString('en-IN'),
            r.user_name,
            r.user_phone,
            r.user_email,
            r.payment_id,
            r.payment_type,
            r.payment_mode,
            r.original_amount,
            r.refund_amount,
            r.refund_type,
            r.reason_category,
            r.reason_notes,
            r.status,
            r.razorpay_refund_id
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `refund_report_${refundFromDate}_to_${refundToDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Sub-tab styles ──
    const subTabStyle = (isActive) => ({
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.7rem 1.5rem', borderRadius: '0.75rem',
        border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
        background: isActive ? 'var(--primary, #3b82f6)' : 'transparent',
        color: isActive ? 'white' : '#64748b',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none'
    });

    return (
        <div style={{ backgroundColor: hideHeader ? 'transparent' : '#f8fafc', minHeight: hideHeader ? 'auto' : '100vh', padding: hideHeader ? '0' : '1.5rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* ── Admin Dashboard Header ── */}
            {!hideHeader && (
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                                ADMIN DASHBOARD
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                                    Role: {role?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.25rem', 
                            borderRadius: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', 
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' 
                        }}>
                            <BookOpen size={18} /> COURSE CONTENT
                        </button>
                        <button style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.25rem', 
                            borderRadius: '0.75rem', background: '#8b5cf6', color: 'white', border: 'none', 
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' 
                        }}>
                            <Sparkles size={18} /> AI INSTRUCTIONS
                        </button>
                    </div>
                </header>
            )}

            {/* ── Tabs Navigation ── */}
            {!hideHeader && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '1rem', width: 'fit-content' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '0.6rem 1.5rem',
                                borderRadius: '0.75rem',
                                border: 'none',
                                background: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? '#3b82f6' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Report Sub-Tabs ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--report-title, #1e293b)', margin: 0 }}>
                        Reports
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '0.85rem', width: 'fit-content', marginBottom: '1.5rem' }}>
                    <button onClick={() => setReportTab('platform')} style={subTabStyle(reportTab === 'platform')}>
                        <BarChart3 size={16} /> Platform Reports
                    </button>
                    {isSuperAdmin && (
                        <button onClick={() => setReportTab('refunds')} style={subTabStyle(reportTab === 'refunds')}>
                            <RotateCcw size={16} /> Refund Report
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* ── Platform Reports Tab ── */}
                {reportTab === 'platform' && (
                    <motion.section
                        key="platform"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0', marginBottom: '1.5rem' }}>
                            Daily performance metrics and user activity trends.
                        </p>

                        {/* Filters Bar */}
                        <div style={{ 
                            display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2.5rem', 
                            background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginLeft: '0.25rem' }}>START DATE</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <CalendarDays size={16} style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }} />
                                    <input 
                                        type="date" 
                                        value={fromDate}
                                        onChange={e => setFromDate(e.target.value)}
                                        style={{ 
                                            padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc', outline: 'none'
                                        }} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginLeft: '0.25rem' }}>END DATE</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <CalendarDays size={16} style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }} />
                                    <input 
                                        type="date" 
                                        value={toDate}
                                        onChange={e => setToDate(e.target.value)}
                                        style={{ 
                                            padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc', outline: 'none'
                                        }} 
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleView}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', 
                                    borderRadius: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', 
                                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', height: '46px'
                                }}
                            >
                                <Search size={18} /> VIEW
                            </button>

                            <button 
                                onClick={downloadCSV}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
                                    borderRadius: '0.75rem', background: 'var(--btn-download-bg)', color: '#9a3412', border: 'none', 
                                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', height: '46px'
                                }}
                            >
                                <Download size={18} /> DOWNLOAD CSV
                            </button>
                        </div>

                        {/* Data Table */}
                        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            {['DATE', 'REG. USERS', 'ACTIVE', ...(canSeeRevenue ? ['TOP-UP REV', 'MEMBERSHIP REV', 'TOTAL REV'] : []), 'DELETED'].map(h => (
                                                <th key={h} style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={10} style={{ padding: '4rem', textAlign: 'center' }}>
                                                        <Loader2 className="animate-spin" size={32} color="#3b82f6" style={{ margin: '0 auto' }} />
                                                    </td>
                                                </tr>
                                            ) : dailyBreakdown.length === 0 ? (
                                                <tr>
                                                    <td colSpan={10} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                                                        No activity recorded for this period.
                                                    </td>
                                                </tr>
                                            ) : (
                                                dailyBreakdown.map((row, idx) => (
                                                    <motion.tr 
                                                        key={row.date}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.03 }}
                                                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                                                            {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                                        </td>
                                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>
                                                            +{row.registrations}
                                                        </td>
                                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                                                            {row.active} users
                                                        </td>
                                                        {canSeeRevenue && (
                                                            <>
                                                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#059669' }}>
                                                                    {formatCurrency(row.topUpRevenue)}
                                                                </td>
                                                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>
                                                                    {formatCurrency(row.membershipRevenue)}
                                                                </td>
                                                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                                                                    {formatCurrency(row.revenue)}
                                                                </td>
                                                            </>
                                                        )}
                                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>
                                                            {row.deleted}
                                                        </td>
                                                    </motion.tr>
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* ── Refund Report Tab ── */}
                {reportTab === 'refunds' && isSuperAdmin && (
                    <motion.section
                        key="refunds"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Summary Cards */}
                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{
                                flex: 1, padding: '1.25rem 1.5rem', borderRadius: '1rem',
                                background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
                                border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '1rem'
                            }}>
                                <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.1)' }}>
                                    <RotateCcw size={22} color="#ef4444" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#9f1239', letterSpacing: '0.05em' }}>TOTAL REFUNDS</p>
                                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#be123c' }}>{refundSummary.total}</p>
                                </div>
                            </div>
                            <div style={{
                                flex: 1, padding: '1.25rem 1.5rem', borderRadius: '1rem',
                                background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
                                border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '1rem'
                            }}>
                                <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(234, 179, 8, 0.1)' }}>
                                    <IndianRupee size={22} color="#d97706" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.05em' }}>TOTAL REFUNDED AMOUNT</p>
                                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#b45309' }}>{formatCurrency(refundSummary.total_refunded)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Filters Bar */}
                        <div style={{ 
                            display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2rem', 
                            background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginLeft: '0.25rem' }}>START DATE</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <CalendarDays size={16} style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }} />
                                    <input 
                                        type="date" 
                                        value={refundFromDate}
                                        onChange={e => setRefundFromDate(e.target.value)}
                                        style={{ 
                                            padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc', outline: 'none'
                                        }} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginLeft: '0.25rem' }}>END DATE</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <CalendarDays size={16} style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }} />
                                    <input 
                                        type="date" 
                                        value={refundToDate}
                                        onChange={e => setRefundToDate(e.target.value)}
                                        style={{ 
                                            padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc', outline: 'none'
                                        }} 
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleRefundView}
                                disabled={refundLoading}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', 
                                    borderRadius: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', 
                                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', height: '46px',
                                    opacity: refundLoading ? 0.7 : 1
                                }}
                            >
                                {refundLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} VIEW
                            </button>

                            <button 
                                onClick={downloadRefundCSV}
                                disabled={refundData.length === 0}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
                                    borderRadius: '0.75rem', background: '#fef3c7', color: '#92400e', border: 'none', 
                                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', height: '46px',
                                    opacity: refundData.length === 0 ? 0.5 : 1
                                }}
                            >
                                <Download size={18} /> DOWNLOAD CSV
                            </button>
                        </div>

                        {/* Refund Data Table */}
                        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                                    <thead>
                                        <tr style={{ background: '#fef2f2', borderBottom: '1px solid #fecdd3' }}>
                                            {['REFUND DATE', 'USER NAME', 'PHONE', 'PAYMENT MODE', 'ORIGINAL AMT', 'REFUND AMT', 'REFUND TYPE', 'REASON', 'STATUS'].map(h => (
                                                <th key={h} style={{ padding: '1.1rem 1.25rem', fontSize: '0.7rem', fontWeight: 800, color: '#9f1239', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {refundLoading ? (
                                            <tr>
                                                <td colSpan={9} style={{ padding: '4rem', textAlign: 'center' }}>
                                                    <Loader2 className="animate-spin" size={32} color="#ef4444" style={{ margin: '0 auto' }} />
                                                </td>
                                            </tr>
                                        ) : refundData.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                        <RotateCcw size={40} color="#cbd5e1" />
                                                        <p style={{ margin: 0, fontWeight: 600 }}>No refunds found for this period.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            refundData.map((row, idx) => (
                                                <motion.tr 
                                                    key={row.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                        {new Date(row.refund_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{row.user_name}</div>
                                                        {row.user_email !== 'N/A' && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                                <Mail size={10} /> {row.user_email}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                                            <Phone size={13} color="#94a3b8" /> {row.user_phone}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                                            <CreditCard size={13} color="#94a3b8" /> {row.payment_mode}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                                        {formatCurrency(row.original_amount)}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 800, color: '#dc2626' }}>
                                                        -{formatCurrency(row.refund_amount)}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <span style={{
                                                            display: 'inline-block', padding: '0.25rem 0.75rem',
                                                            borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            background: row.refund_type === 'full' ? '#dbeafe' : '#ede9fe',
                                                            color: row.refund_type === 'full' ? '#1e40af' : '#6d28d9'
                                                        }}>
                                                            {row.refund_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 500, color: '#64748b', maxWidth: '200px' }}>
                                                        <div style={{ fontWeight: 600, color: '#475569' }}>{row.reason_category}</div>
                                                        {row.reason_notes && (
                                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {row.reason_notes}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <StatusBadge status={row.status} />
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* ── Role Gating Notice for Moderators ── */}
            {!canSeeRevenue && (
                <div style={{ 
                    marginTop: '2rem', padding: '1.25rem', borderRadius: '1rem', background: '#fffbeb', 
                    border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '1rem' 
                }}>
                    <Lock size={20} color="#d97706" />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
                        Revenue and financial data are restricted to Staff members. Please contact a higher-level administrator if you believe this is an error.
                    </p>
                </div>
            )}

        </div>
    );
};

export default Reports;

