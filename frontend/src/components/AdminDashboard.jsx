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
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportApi, authApi, settingsApi } from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../context/UserContext';
import Reports from './Reports'; // We'll keep the detailed breakdown here
import UserManagement from './UserManagement'; // We'll reuse parts of this

const AdminDashboard = ({ user: userProp }) => {
    const { user: contextUser } = useUser();
    const user = userProp || contextUser;
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [settings, setSettings] = useState({ subscription_price: '99', subscription_duration_days: '30' });
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const showToast = useToast();

    const role = user?.role?.toLowerCase()?.replace(/\s+|_/g, '_');
    const isSuperAdmin = role === 'super_admin';
    const canSeeRevenue = isSuperAdmin || role === 'admin' || role === 'moderator';

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

            setStats({
                totalRevenue: summaryData.totalRevenueAllTime,
                revenueMoM: summaryData.revenueMoM,
                totalRegistrations: summaryData.totalUsers,
                newRegistrations: summaryData.newRegistrationsCurrentMonth,
                registrationMoM: summaryData.registrationMoM,
                currentMonthName: summaryData.currentMonthName,
                avgActive: summaryData.avgDailyActive30d || avgActive,
                dailyData
            });
            console.log('[AdminDashboard] REVENUE DATA RECEIVED:', summaryData.totalRevenueAllTime);

            setActivity(activityRes.data || []);

            if (settingsRes && settingsRes.data) {
                setSettings(settingsRes.data);
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const Sparkline = ({ data, color, height = 40 }) => {
        if (!data || data.length === 0) return null;
        const max = Math.max(...data, 1);
        const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${height - (v / max) * height}`).join(' ');
        
        return (
            <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height: `${height}px`, marginTop: '1rem', overflow: 'visible' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {canSeeRevenue && (
                    <KPICard 
                        title="TOTAL REVENUE (All-time)" 
                        value={`₹${stats?.totalRevenue?.toLocaleString() || 0}`} 
                        icon={IndianRupee} 
                        color="59, 130, 246"
                        trend={stats?.revenueMoM ? `${stats.revenueMoM > 0 ? '+' : ''}${stats.revenueMoM}%` : null}
                    />
                )}
                <KPICard 
                    title="TOTAL REGISTRATIONS (All-time)" 
                    value={stats?.totalRegistrations?.toLocaleString() || 0} 
                    icon={ShieldCheck} 
                    color="236, 72, 153"
                />
                <KPICard 
                    title={`NEW REGISTRATIONS (${(stats?.currentMonthName || new Date().toLocaleString('default', { month: 'long' })).toUpperCase()}) (Current Month only)`} 
                    value={stats?.newRegistrations?.toLocaleString() || 0} 
                    icon={UserPlus} 
                    color="139, 92, 246"
                    trend={stats?.registrationMoM ? `${stats.registrationMoM > 0 ? '+' : ''}${stats.registrationMoM}%` : null}
                />
                <KPICard 
                    title="AVG DAILY ACTIVE (30-day average)" 
                    value={stats?.avgActive || 0} 
                    icon={TrendingUp} 
                    color="16, 185, 129"
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
                    { id: 'users', label: 'Users', icon: Users },
                    { id: 'moderators', label: 'Moderators', icon: ShieldCheck },
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
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
