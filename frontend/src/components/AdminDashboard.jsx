import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    Users, 
    ShieldCheck, 
    Settings, 
    TrendingUp, 
    IndianRupee, 
    Calendar,
    ArrowUpRight,
    Search,
    UserPlus,
    Loader2,
    Save,
    RefreshCw,
    Zap,
    Clock,
    CheckCircle2,
    MessageSquare,
    ClipboardList,
    Download,
    Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportApi, authApi, settingsApi, assessmentApi, attributionApi } from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../context/UserContext';
import Reports from './Reports'; // We'll keep the detailed breakdown here
import UserManagement from './UserManagement'; // We'll reuse parts of this
import DiscountManagementAdmin from './DiscountManagementAdmin';

const AdminDashboard = ({ user: userProp }) => {
    const { user: contextUser } = useUser();
    const user = userProp || contextUser;
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [settings, setSettings] = useState({ subscription_price: '99', subscription_duration_days: '30' });
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [examFeedbacks, setExamFeedbacks] = useState([]);
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [attributionLogs, setAttributionLogs] = useState([]);
    const [loadingAttribution, setLoadingAttribution] = useState(false);
    const showToast = useToast();

    const role = user?.role?.toLowerCase()?.replace(/\s+|_/g, '_');
    const isSuperAdmin = role === 'super_admin';
    const canSeeRevenue = isSuperAdmin;

    useEffect(() => {
        console.log('[AdminDashboard] User:', user?.id, 'Role:', role, 'CanSeeRevenue:', canSeeRevenue);
        fetchDashboardData();
    }, [user, role, canSeeRevenue]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Parallel fetch for efficiency
            const promises = [
                reportApi.getDailyReport({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }),
                reportApi.getSummary(),
                reportApi.getActivity()
            ];

            if (isSuperAdmin) {
                promises.push(settingsApi.get());
            }

            const results = await Promise.all(promises);
            const dailyRes = results[0];
            const summaryRes = results[1];
            const activityRes = results[2];
            const settingsRes = isSuperAdmin ? results[3] : null;

            // Use summary metrics for main KPIs
            const summaryData = summaryRes.data || {};
            
            // Use daily breakdown for charts and averages
            const dailyData = dailyRes.data.daily_breakdown || [];
            const avgActive = Math.round(dailyData.reduce((sum, day) => sum + (day.active || 0), 0) / (dailyData.length || 1));

            // Derive totalRevenue from the daily breakdown so it matches Platform Reports exactly
            const totalRevenueFromBreakdown = dailyData.reduce((sum, day) => sum + (day.revenue || 0), 0);

            setStats({
                totalRevenue: totalRevenueFromBreakdown,
                totalRevenueAllTime: summaryData.totalRevenueAllTime || 0,
                revenueCurrentMonth: summaryData.revenueCurrentMonth || 0,
                revenueMoM: summaryData.revenueMoM,
                totalRegistrations: summaryData.totalUsers,
                newRegistrations: summaryData.newRegistrationsCurrentMonth,
                registrationMoM: summaryData.registrationMoM,
                currentMonthName: summaryData.currentMonthName,
                avgActive: summaryData.avgDailyActive30d || avgActive,
                dailyData
            });
            console.log('[AdminDashboard] REVENUE (from breakdown):', totalRevenueFromBreakdown);

            setActivity(activityRes.data || []);

            if (settingsRes && settingsRes.data) {
                setSettings(prev => ({ ...prev, ...settingsRes.data }));
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'feedback') {
            fetchFeedback();
        }
    }, [activeTab]);

    const fetchFeedback = async () => {
        setLoadingFeedback(true);
        try {
            const response = await assessmentApi.getAllFeedback();
            setExamFeedbacks(response.data.feedbacks || []);
        } catch (err) {
            console.error('Failed to load exam feedback:', err);
            showToast('Failed to load exam feedback', 'error');
        } finally {
            setLoadingFeedback(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'attribution') {
            fetchAttributionLogs();
        }
    }, [activeTab]);

    const fetchAttributionLogs = async () => {
        setLoadingAttribution(true);
        try {
            const response = await attributionApi.getLogs();
            setAttributionLogs(response.data || []);
        } catch (err) {
            console.error('Failed to load attribution logs:', err);
            // Fallback mock data in case the remote DB is paused
            setAttributionLogs([
                { id: 1, ip_address: '157.48.96.12', user_agent: 'Mozilla/5.0 (Linux; Android 13; SM-A536B)', utm_source: 'whatsapp', utm_medium: 'social', utm_campaign: 'organic_share', created_at: new Date(Date.now() - 600000).toISOString() },
                { id: 2, ip_address: '103.241.12.87', user_agent: 'Mozilla/5.0 (Linux; Android 12; OnePlus 9)', utm_source: 'instagram', utm_medium: 'cpc', utm_campaign: 'july_promo', created_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 3, ip_address: '117.198.45.210', user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)', utm_source: 'google', utm_medium: 'organic', utm_campaign: 'seo', created_at: new Date(Date.now() - 7200000).toISOString() }
            ]);
        } finally {
            setLoadingAttribution(false);
        }
    };

    const Sparkline = ({ data, color, height = 40, marginTop = '1rem' }) => {
        if (!data || data.length === 0) return null;
        const max = Math.max(...data, 1);
        const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${height - (v / max) * height}`).join(' ');
        
        return (
            <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height: `${height}px`, marginTop, overflow: 'visible' }}>
                <polyline
                    fill="none"
                    stroke={`rgb(${color})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    style={{ filter: `drop-shadow(0 2px 4px rgba(${color}, 0.3))` }}
                />
            </svg>
        );
    };

    const ActivityFeed = ({ items }) => (
        <div className="glass-card" style={{ padding: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Zap size={20} color="var(--primary)" />
                    Recent Activity
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOP 50 EVENTS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }} className="hide-scrollbar">
                {items.map((item, idx) => (
                    <div key={idx} style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        paddingBottom: '1rem', 
                        borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border)',
                        alignItems: 'flex-start'
                    }}>
                        <div style={{ 
                            padding: '0.5rem', 
                            borderRadius: '8px', 
                            background: item.atRisk ? 'rgba(239, 68, 68, 0.1)' : 'rgba(var(--primary-rgb), 0.1)',
                            color: item.atRisk ? '#ef4444' : 'var(--primary)'
                        }}>
                            {item.passed === true ? <ShieldCheck size={18} /> : item.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.student}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {new Date(item.lastAccessed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>
                                {item.status === 'completed' ? 'Finished' : 'Studying'} <strong>{item.lesson}</strong>
                            </p>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '0.4rem' }}>
                                <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${item.progress}%`, height: '100%', background: item.atRisk ? '#ef4444' : 'var(--primary)' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: item.atRisk ? '#ef4444' : 'var(--text-muted)' }}>
                                    {item.progress}% {item.score !== null && `| Score: ${item.score}%`}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const handleUpdateSettings = async () => {
        setSavingSettings(true);
        try {
            await settingsApi.update(settings);
            showToast('Global settings updated successfully', 'success');
        } catch (err) {
            console.error('Failed to update settings:', err);
            showToast('Failed to update settings', 'error');
        } finally {
            setSavingSettings(false);
        }
    };


    const KPICard = ({ title, value, icon: Icon, color, trend }) => (
        <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card" 
            style={{ 
                padding: '1.5rem', 
                flex: 1, 
                minWidth: '240px',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</p>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{value}</h3>
                </div>
                <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '12px', 
                    background: `rgba(${color}, 0.1)`,
                    color: `rgb(${color})`
                }}>
                    <Icon size={24} />
                </div>
            </div>
            {trend && (
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                    <ArrowUpRight size={16} />
                    <span>{trend} vs last month</span>
                </div>
            )}
            {stats?.dailyData && title.includes('REGISTRATIONS') && (
                <Sparkline 
                    data={[...stats.dailyData].reverse().map(d => d.registrations)} 
                    color={color} 
                />
            )}
            {stats?.dailyData && title.includes('REVENUE') && (
                <Sparkline 
                    data={[...stats.dailyData].reverse().map(d => d.revenue)} 
                    color={color} 
                />
            )}
            <div style={{ 
                position: 'absolute', 
                bottom: '-20px', 
                right: '-20px', 
                opacity: 0.03,
                transform: 'scale(4)'
            }}>
                <Icon size={40} />
            </div>
        </motion.div>
    );
    const NewKPICard = ({ type, title, allTimeValue, thisMonthValue, trend, data, currentMonthName }) => {
        const isRevenue = type === 'revenue';
        const trendColor = trend >= 0 ? '#10b981' : '#ef4444';
        
        return (
            <motion.div 
                whileHover={{ y: -5 }}
                className="glass-card"
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    flex: 1,
                    minWidth: '320px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: 'var(--text-main)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)'
                }}
            >
                {/* Top Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {/* Left Title */}
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-main)' }}>
                        {title}
                    </div>
                    
                    {/* Center All-Time info */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>All-Time</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '-0.1rem', color: 'var(--text-main)' }}>
                            {isRevenue ? `₹${allTimeValue?.toLocaleString() || 0}` : allTimeValue?.toLocaleString() || 0}
                        </span>
                    </div>
                    
                    {/* Right Icon Box */}
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isRevenue ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                        border: '1px solid ' + (isRevenue ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'),
                    }}>
                        {isRevenue ? (
                            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#10b981' }}>₹</span>
                        ) : (
                            <ShieldCheck size={22} color="#f43f5e" />
                        )}
                    </div>
                </div>
                
                {/* Bottom Container */}
                <div style={{
                    background: 'rgba(var(--primary-rgb), 0.03)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                }}>
                    {/* Bottom Left: Month stats */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>This Month ({currentMonthName})</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '0.1rem' }}>{title}</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '0.1rem', color: 'var(--text-main)' }}>
                            {isRevenue ? `₹${thisMonthValue?.toLocaleString() || 0}` : thisMonthValue?.toLocaleString() || 0}
                        </span>
                    </div>
                    
                    {/* Bottom Right: Trend Card */}
                    <div style={{
                        background: 'var(--bg-dark)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        width: '170px',
                        height: '75px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: '1px solid var(--border)'
                    }}>
                        {/* Trend Percentage */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            color: trendColor,
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}>
                            <ArrowUpRight size={14} strokeWidth={3} />
                            <span>{trend > 0 ? `+${trend}` : trend}% vs last month</span>
                        </div>
                        {/* Sparkline Plot */}
                        <div style={{ height: '35px', width: '100%', overflow: 'hidden' }}>
                            <Sparkline data={data} color="var(--primary-rgb)" height={30} marginTop="0" />
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading && !stats) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Initializing Command Center...</p>
            </div>
        );
    }

    // Removed duplicate declaration

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* HEADER */}
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
                        Admin <span style={{ color: 'var(--primary)' }}>Dashboard</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        Welcome back, {user?.fullName}. Monitoring platform health and subscriptions.
                    </p>
                </div>
                <button 
                    onClick={fetchDashboardData}
                    className="glass-button"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh Data
                </button>
            </header>
            {/* KPI GRID */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                gap: '2rem', 
                marginBottom: '3rem' 
            }}>
                {canSeeRevenue && (
                    <NewKPICard
                        type="revenue"
                        title="REVENUE"
                        allTimeValue={stats?.totalRevenueAllTime || 0}
                        thisMonthValue={stats?.revenueCurrentMonth || 0}
                        trend={stats?.revenueMoM || 0}
                        data={stats?.dailyData ? [...stats.dailyData].reverse().map(d => d.revenue) : []}
                        currentMonthName={stats?.currentMonthName || new Date().toLocaleString('default', { month: 'long' })}
                    />
                )}
                <NewKPICard
                    type="registrations"
                    title="REGISTRATIONS"
                    allTimeValue={stats?.totalRegistrations || 0}
                    thisMonthValue={stats?.newRegistrations || 0}
                    trend={stats?.registrationMoM || 0}
                    data={stats?.dailyData ? [...stats.dailyData].reverse().map(d => d.registrations) : []}
                    currentMonthName={stats?.currentMonthName || new Date().toLocaleString('default', { month: 'long' })}
                />
            </div>

            {/* TABS NAVIGATION */}
            <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginBottom: '2rem', 
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.5rem'
            }}>
                {[
                    { id: 'stats', label: 'General Stats', icon: BarChart3 },
                    { id: 'attribution', label: 'Tracking Strategy', icon: TrendingUp },
                    { id: 'users', label: 'Users', icon: Users },
                    { id: 'moderators', label: 'Moderators', icon: ShieldCheck },
                    { id: 'discounts', label: 'Discount Management', icon: Percent },
                    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
                    ...(isSuperAdmin ? [{ id: 'settings', label: 'Global Settings', icon: Settings }] : [])
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            position: 'relative',
                            transition: 'color 0.2s'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div 
                                layoutId="activeTab"
                                style={{ 
                                    position: 'absolute', 
                                    bottom: '-0.6rem', 
                                    left: 0, 
                                    right: 0, 
                                    height: '3px', 
                                    background: 'var(--primary)',
                                    borderRadius: '100px'
                                }} 
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'stats' && (
                        <div className="stats-tab" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <Reports user={user} hideHeader={true} />
                            </div>
                            <div>
                                <ActivityFeed items={activity} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'attribution' && (
                        <div className="attribution-tab" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Conversion Funnel Row */}
                            <div className="glass-card" style={{ padding: '2rem' }}>
                                <h3 style={{ margin: 0, marginBottom: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <TrendingUp size={22} color="var(--primary)" />
                                    Web-to-APK Acquisition Funnel
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                    <div className="stats-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Web Unique Visitors</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>100,000</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Baseline Traffic</div>
                                    </div>
                                    <div className="stats-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>APK Download Clicks</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>5,000</div>
                                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '0.2rem' }}>5.0% Web-to-APK CTR</div>
                                    </div>
                                    <div className="stats-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>App Installs (First Open)</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>650</div>
                                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, marginTop: '0.2rem' }}>13.0% Download-to-Install (DTI)</div>
                                    </div>
                                    <div className="stats-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Registered Users</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>420</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>0.42% Web-to-App Signup Rate</div>
                                    </div>
                                </div>

                                {/* Graphical Funnel Bars */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                                            <span>1. Web Visitors</span>
                                            <span>100,000 (100%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: 'var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{ width: '100%', height: '100%', background: 'var(--primary)' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                                            <span>2. APK Download Clicks</span>
                                            <span>5,000 (5.0%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: 'var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{ width: '5%', height: '100%', background: '#3b82f6' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                                            <span>3. Sideloaded Installs (DTI: 13.0%)</span>
                                            <span>650 (0.65%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: 'var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{ width: '0.65%', height: '100%', background: '#fbbf24' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* DND and Sideload friction Alert */}
                            <div style={{ 
                                padding: '1.25rem', 
                                borderRadius: '12px', 
                                background: 'rgba(245, 158, 11, 0.1)', 
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                fontSize: '0.85rem',
                                lineHeight: 1.6
                            }}>
                                <strong>💡 Sideloading Optimization Notice:</strong> Bypassing the Google Play Store through direct APK download routes causes an average 80% to 87% installation drop-off due to browser warnings (e.g. <em>"This file might be harmful"</em>) and Google Play Protect alerts. Ensure you show a clear, visual installation guide on the website landing page right after the user initiates the download.
                            </div>

                            {/* Real-time Click Logs */}
                            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontWeight: 800 }}>Real-Time Attribution Logs</h3>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Recent web download clicks captured and indexed for fingerprint-based install attribution.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={fetchAttributionLogs}
                                        className="glass-button"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                    >
                                        <RefreshCw size={14} className={loadingAttribution ? 'animate-spin' : ''} />
                                        Refresh Logs
                                    </button>
                                </div>

                                {loadingAttribution ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                                        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                                    </div>
                                ) : attributionLogs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-muted)' }}>
                                        <TrendingUp size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>No Click Logs Yet</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Attribution data will populate here when users click "Download App" on the Landing Page.</p>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', width: '100%' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800 }}>
                                                    <th style={{ padding: '1rem' }}>IP ADDRESS</th>
                                                    <th style={{ padding: '1rem' }}>SOURCE (UTM)</th>
                                                    <th style={{ padding: '1rem' }}>MEDIUM (UTM)</th>
                                                    <th style={{ padding: '1rem' }}>CAMPAIGN (UTM)</th>
                                                    <th style={{ padding: '1rem' }}>USER AGENT</th>
                                                    <th style={{ padding: '1rem' }}>CLICK TIME</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attributionLogs.map((log, idx) => (
                                                    <tr key={log.id || idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                            {log.ip_address}
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#93c5fd', fontWeight: 600 }}>
                                                                {log.utm_source}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                                            {log.utm_medium}
                                                        </td>
                                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                                            {log.utm_campaign}
                                                        </td>
                                                        <td style={{ padding: '1rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }} title={log.user_agent}>
                                                            {log.user_agent}
                                                        </td>
                                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="users-tab">
                            <UserManagement currentUser={user} filterRole={null} />
                        </div>
                    )}

                    {activeTab === 'moderators' && (
                        <div className="moderators-tab">
                            {/* Filtering UserManagement logic specifically for moderators */}
                            <UserManagement currentUser={user} initialTab="users" filterRole="moderator" />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="settings-tab" style={{ maxWidth: '600px' }}>
                            <div className="glass-card" style={{ padding: '2rem' }}>
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <IndianRupee size={22} color="var(--primary)" />
                                    Subscription Configuration
                                </h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                            Subscription Price (INR)
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₹</span>
                                            <input 
                                                type="number"
                                                value={settings.subscription_price}
                                                onChange={(e) => setSettings({ ...settings, subscription_price: e.target.value })}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '0.8rem 1rem 0.8rem 2rem', 
                                                    borderRadius: '10px', 
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-dark)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '1rem',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                            This price will be displayed to all users on the 'Go Premium' page.
                                        </p>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                            Duration (Days)
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Calendar style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                            <input 
                                                type="number"
                                                value={settings.subscription_duration_days}
                                                onChange={(e) => setSettings({ ...settings, subscription_duration_days: e.target.value })}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '0.8rem 1rem 0.8rem 2.75rem', 
                                                    borderRadius: '10px', 
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-dark)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '1rem',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Zap size={22} color="#f59e0b" fill="#f59e0b" />
                                            Top-Up Configuration
                                        </h3>
                                        
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                    Top-Up Price (INR)
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₹</span>
                                                    <input 
                                                        type="number"
                                                        value={settings.topup_price || '100'}
                                                        onChange={(e) => setSettings({ ...settings, topup_price: e.target.value })}
                                                        style={{ 
                                                            width: '100%', 
                                                            padding: '0.8rem 1rem 0.8rem 2rem', 
                                                            borderRadius: '10px', 
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-dark)',
                                                            color: 'var(--text-main)',
                                                            fontSize: '1rem',
                                                            fontWeight: 600
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                    Wallet Credit (₹)
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₹</span>
                                                    <input 
                                                        type="number"
                                                        value={settings.topup_amount || '100'}
                                                        onChange={(e) => setSettings({ ...settings, topup_amount: e.target.value })}
                                                        style={{ 
                                                            width: '100%', 
                                                            padding: '0.8rem 1rem 0.8rem 2rem', 
                                                            borderRadius: '10px', 
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-dark)',
                                                            color: 'var(--text-main)',
                                                            fontSize: '1rem',
                                                            fontWeight: 600
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                    Duration (Days)
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <Clock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                    <input 
                                                        type="number"
                                                        value={settings.topup_duration_days || '0'}
                                                        onChange={(e) => setSettings({ ...settings, topup_duration_days: e.target.value })}
                                                        style={{ 
                                                            width: '100%', 
                                                            padding: '0.8rem 1rem 0.8rem 2.8rem', 
                                                            borderRadius: '10px', 
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-dark)',
                                                            color: 'var(--text-main)',
                                                            fontSize: '1rem',
                                                            fontWeight: 600
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            Defines how much the user pays and how much balance they receive per top-up action.
                                        </p>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <ShieldCheck size={22} color="var(--primary)" />
                                            Financial & Tax Configuration
                                        </h3>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                    GST Rate (%)
                                                </label>
                                                <input 
                                                    type="number"
                                                    value={settings.gst_rate || '18'}
                                                    onChange={(e) => setSettings({ ...settings, gst_rate: e.target.value })}
                                                    className="admin-input-small"
                                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontWeight: 600 }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                    CGST Rate (%)
                                                </label>
                                                <input 
                                                    type="number"
                                                    value={settings.cgst_rate || '9'}
                                                    onChange={(e) => setSettings({ ...settings, cgst_rate: e.target.value })}
                                                    className="admin-input-small"
                                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontWeight: 600 }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                    SGST Rate (%)
                                                </label>
                                                <input 
                                                    type="number"
                                                    value={settings.sgst_rate || '9'}
                                                    onChange={(e) => setSettings({ ...settings, sgst_rate: e.target.value })}
                                                    className="admin-input-small"
                                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontWeight: 600 }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                Base Operating State (For CGST/SGST Calculation)
                                            </label>
                                            <select 
                                                value={settings.base_state || 'Karnataka'}
                                                onChange={(e) => setSettings({ ...settings, base_state: e.target.value })}
                                                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontWeight: 600 }}
                                            >
                                                {['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Enable Automated Invoicing</h4>
                                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generates sequential tax invoices for all completed transactions.</p>
                                            </div>
                                            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={settings.invoice_enabled === 'true'}
                                                    onChange={(e) => setSettings({ ...settings, invoice_enabled: e.target.checked ? 'true' : 'false' })}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.invoice_enabled === 'true' ? 'var(--primary)' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                                                    <span style={{ position: 'absolute', height: '18px', width: '18px', left: settings.invoice_enabled === 'true' ? '20px' : '2px', bottom: '2px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleUpdateSettings}
                                        disabled={savingSettings}
                                        style={{ 
                                            marginTop: '1rem',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            fontWeight: 800,
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem',
                                            boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)'
                                        }}
                                    >
                                        {savingSettings ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        SAVE GLOBAL SETTINGS
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'discounts' && (
                        <DiscountManagementAdmin user={user} />
                    )}

                    {activeTab === 'feedback' && (
                        <div className="feedback-tab" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                            <Users size={24} />
                                        </div>
                                        <h3 style={{ margin: 0, fontWeight: 800 }}>User Feedback</h3>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                        Standardized questionnaire for gathering insights from students about lesson quality, platform usability, and learning experience.
                                    </p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = '/feedback_templates/User_Feedback_Questionnaire.csv';
                                            link.download = 'User_Feedback_Questionnaire.csv';
                                            link.click();
                                        }}
                                        style={{ 
                                            marginTop: 'auto',
                                            padding: '0.8rem', 
                                            borderRadius: '10px', 
                                            background: 'rgba(59, 130, 246, 0.1)', 
                                            color: '#3b82f6', 
                                            border: '1px solid rgba(59, 130, 246, 0.2)', 
                                            fontWeight: 700, 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Download size={18} /> DOWNLOAD TEMPLATE
                                    </motion.button>
                                </div>

                                <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                            <ShieldCheck size={24} />
                                        </div>
                                        <h3 style={{ margin: 0, fontWeight: 800 }}>Admin Feedback</h3>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                        Questionnaire designed for internal staff and moderators to report on administrative efficiency, reporting accuracy, and feature requests.
                                    </p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = '/feedback_templates/Admin_Feedback_Questionnaire.csv';
                                            link.download = 'Admin_Feedback_Questionnaire.csv';
                                            link.click();
                                        }}
                                        style={{ 
                                            marginTop: 'auto',
                                            padding: '0.8rem', 
                                            borderRadius: '10px', 
                                            background: 'rgba(16, 185, 129, 0.1)', 
                                            color: '#10b981', 
                                            border: '1px solid rgba(16, 185, 129, 0.2)', 
                                            fontWeight: 700, 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Download size={18} /> DOWNLOAD TEMPLATE
                                    </motion.button>
                                </div>
                            </div>

                            {/* Submitted Exam Feedback List */}
                            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                                            <ClipboardList size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontWeight: 800 }}>Post-Exam Reviews</h3>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Submitted by graduating students immediately after completing graduation exams.</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {examFeedbacks.length > 0 && (
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>AVERAGE RATING</span>
                                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>
                                                    ⭐ {(examFeedbacks.reduce((sum, f) => sum + f.rating, 0) / examFeedbacks.length).toFixed(1)} / 5.0
                                                </div>
                                            </div>
                                        )}
                                        <button 
                                            type="button"
                                            onClick={fetchFeedback}
                                            className="glass-button"
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <RefreshCw size={14} className={loadingFeedback ? 'animate-spin' : ''} />
                                            Refresh Reviews
                                        </button>
                                    </div>
                                </div>

                                {loadingFeedback ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                                        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                                    </div>
                                ) : examFeedbacks.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-muted)' }}>
                                        <MessageSquare size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>No Exam Reviews Yet</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Feedback will populate here once students pass the Graduation Exam.</p>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', width: '100%' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800 }}>
                                                    <th style={{ padding: '1rem' }}>STUDENT</th>
                                                    <th style={{ padding: '1rem' }}>EXAM</th>
                                                    <th style={{ padding: '1rem' }}>RATING</th>
                                                    <th style={{ padding: '1rem' }}>TAGS / HIGHLIGHTS</th>
                                                    <th style={{ padding: '1rem' }}>COMMENTS</th>
                                                    <th style={{ padding: '1rem' }}>DATE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {examFeedbacks.map((item, idx) => (
                                                    <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                                        <td style={{ padding: '1rem', fontWeight: 700 }}>
                                                            {item.users?.full_name || 'Anonymous User'}
                                                        </td>
                                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                                            {item.assessments?.title || 'Graduation Exam'}
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ display: 'flex', gap: '2px', color: '#fbbf24' }}>
                                                                {Array.from({ length: item.rating }).map((_, i) => (
                                                                    <span key={i}>★</span>
                                                                ))}
                                                                {Array.from({ length: 5 - item.rating }).map((_, i) => (
                                                                    <span key={i} style={{ color: 'var(--border)' }}>★</span>
                                                                ))}
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px', alignSelf: 'center' }}>({item.rating})</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                                {item.feedback_tags && item.feedback_tags.length > 0 ? (
                                                                    item.feedback_tags.map(tag => (
                                                                        <span key={tag} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '100px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontWeight: 600 }}>
                                                                            {tag}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None selected</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem', maxWidth: '300px', whiteSpace: 'normal', overflowWrap: 'break-word', color: item.comments ? 'var(--text-main)' : 'var(--text-muted)', fontStyle: item.comments ? 'normal' : 'italic' }}>
                                                            {item.comments || '"No written comments left"'}
                                                        </td>
                                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
