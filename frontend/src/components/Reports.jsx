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
    ChevronRight
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
const sevenDaysAgoStr = () => toLocalDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

// ── Component ─────────────────────────────────────────────────────────────────
const Reports = ({ user: userProp, hideHeader = false }) => {
    const { user: contextUser } = useUser();
    const user = userProp || contextUser;
    const role = user?.role?.toLowerCase()?.replace(/\s+|_/g, '_');
    const isSuperAdmin = role === 'super_admin';
    const canSeeRevenue = isSuperAdmin || role === 'admin' || role === 'moderator';

    // Date filter state
    const [fromDate, setFromDate] = useState(sevenDaysAgoStr());
    const [toDate, setToDate] = useState(todayStr());

    useEffect(() => {
        console.log('[Reports] User:', user?.id, 'Role:', role, 'CanSeeRevenue:', canSeeRevenue);
    }, [user, role, canSeeRevenue]);

    // Data state
    const [dailyBreakdown, setDailyBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('REPORTS');

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

    useEffect(() => {
        fetchReports(fromDate, toDate);
    }, [fetchReports]); // Run once on mount with default dates

    const handleView = () => {
        fetchReports(fromDate, toDate);
    };

    // ── CSV Download ──
    const downloadCSV = () => {
        const val = (v) => (v !== null && v !== undefined) ? String(v) : '0';
        
        const headers = [
            'Date', 
            'Registered Users', 
            'Active Users', 
            ...(canSeeRevenue ? ['Top-Up Revenue', 'Total Revenue'] : []),
            'Deleted Users'
        ];

        const rows = dailyBreakdown.map(row => [
            row.date,
            row.registrations,
            row.active,
            ...(canSeeRevenue ? [row.topUpRevenue, row.revenue] : []),
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

            {/* ── Platform Reports Section ── */}
            <section>
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--report-title)', margin: 0 }}>
                        Platform Reports
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                        Daily performance metrics and user activity trends.
                    </p>
                </div>

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
                                    {['DATE', 'REG. USERS', 'ACTIVE', ...(canSeeRevenue ? ['TOP-UP REV', 'TOTAL REVENUE'] : []), 'DELETED'].map(h => (
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
                                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 800, color: '#059669' }}>
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
            </section>

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
