import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, User, ShieldAlert, Trash2, FileText, CheckCircle2, XCircle, Search } from 'lucide-react';
import api, { authApi } from '../utils/api';
import { useToast } from './Toast';

const UserManagement = ({ initialTab = 'users', filterRole = null, currentUser = null }) => {
    const [activeTab, setActiveTab] = useState(initialTab); // 'users' or 'logs'
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0, totalUsers: 0 });
    const showToast = useToast();

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers(1);
        } else if (activeTab === 'logs') {
            fetchLogs();
        }
    }, [activeTab]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await authApi.getSystemLogs();
            setLogs(res.data?.logs || []);
        } catch (err) {
            console.error('Failed to load system logs:', err);
            showToast('Failed to load system logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async (page = 1) => {
        try {
            setLoading(true);
            const res = await authApi.getAllUsers({ page, limit: 100 }); 
            let fetchedUsers = Array.isArray(res.data.users) ? res.data.users : [];
            
            if (filterRole) {
                fetchedUsers = fetchedUsers.filter(u => u.role?.toLowerCase() === filterRole.toLowerCase());
            }

            setUsers(fetchedUsers);
            setPagination(res.data.pagination || pagination);
        } catch (err) {
            console.error('Failed to load users:', err);
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await authApi.updateRole(userId, newRole);
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`User role updated to ${newRole}`, 'success');
        } catch (err) {
            showToast('Failed to update role', 'error');
        }
    };

    const handleStatusToggle = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await authApi.updateStatus(userId, newStatus);
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            showToast(`User is now ${newStatus}`, 'success');
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getSubscriptionStatus = (expiry) => {
        if (!expiry) return { label: 'TOPUP REQ.', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
        const expiryDate = new Date(expiry);
        const now = new Date();
        const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { label: 'EXPIRED', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
        if (diffDays <= 3) return { label: `${diffDays} DAYS LEFT`, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
        return { label: `ACTIVE (${diffDays}D)`, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    };

    const filteredUsers = users.filter(u => {
        const term = searchTerm.toLowerCase();
        return (
            (u.full_name || u.fullName || '').toLowerCase().includes(term) ||
            (u.phone || '').includes(term) ||
            (u.email || '').toLowerCase().includes(term)
        );
    });

    if (loading && users.length === 0 && logs.length === 0) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" /></div>;

    const hideHeaderNav = filterRole !== null;

    return (
        <div style={{ padding: hideHeaderNav ? '0' : '1.5rem' }}>
            {!hideHeaderNav && (
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShieldCheck color="var(--primary)" /> Super Admin Operations
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage user roles and view system cleanup logs.</p>
                </header>
            )}

            {/* TABS */}
            {!hideHeaderNav && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            background: 'none', border: 'none', padding: '1rem 2rem', cursor: 'pointer',
                            fontSize: '1rem', fontWeight: 600,
                            color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <User size={18} /> User Management
                    </button>
                    {currentUser?.role?.toLowerCase()?.replace(/\s+|_/g, '_') === 'super_admin' && (
                        <button
                            onClick={() => setActiveTab('logs')}
                            style={{
                                background: 'none', border: 'none', padding: '1rem 2rem', cursor: 'pointer',
                                fontSize: '1rem', fontWeight: 600,
                                color: activeTab === 'logs' ? 'var(--primary)' : 'var(--text-muted)',
                                borderBottom: activeTab === 'logs' ? '2px solid var(--primary)' : '2px solid transparent',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <FileText size={18} /> System Logs
                        </button>
                    )}
                </div>
            )}

            {activeTab === 'users' && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                   <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text"
                            placeholder="Search by name, phone or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-dark)',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem'
                            }}
                        />
                   </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="glass-card responsive-table-wrapper" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>User / Contact</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>Joined On</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>Status / Level</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>Subscription</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>Role/Access</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => {
                                const sub = getSubscriptionStatus(u.subscription_expires_at);
                                const isSuperAdminCaller = currentUser?.role?.toLowerCase()?.replace(/\s+|_/g, '_') === 'super_admin';
                                
                                // Secondary safety: If not super_admin caller, don't even render super_admin rows
                                if (!isSuperAdminCaller && u.role?.toLowerCase()?.replace(/\s+|_/g, '_') === 'super_admin') return null;

                                    return (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{u.full_name || u.fullName || 'Unnamed User'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                    {u.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}><strong>📱 {u.phone}</strong></div>}
                                                    {u.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>✉️ {u.email}</div>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                {formatDate(u.created_at)}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800,
                                                        background: u.status === 'active' ? 'var(--badge-active-bg)' : 'var(--badge-inactive-bg)',
                                                        color: u.status === 'active' ? 'var(--badge-active-text)' : 'var(--badge-inactive-text)',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {u.status || 'ACTIVE'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    Level: {u.current_level || 'N/A'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{
                                                    display: 'inline-block',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    background: sub.bg,
                                                    color: sub.color
                                                }}>
                                                    {sub.label}
                                                </div>
                                                {u.subscription_expires_at && (
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                                        Ends: {formatDate(u.subscription_expires_at)}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                                    {isSuperAdminCaller ? (
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                            style={{
                                                                padding: '0.4rem 0.6rem',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--border)',
                                                                background: 'var(--bg-card)',
                                                                color: 'var(--text-main)',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            <option value="user">USER</option>
                                                            <option value="moderator">MODERATOR</option>
                                                            <option value="admin">ADMIN</option>
                                                            <option value="super_admin">SUPER ADMIN</option>
                                                        </select>
                                                    ) : (
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 800,
                                                            background: 'rgba(var(--primary-rgb), 0.1)',
                                                            color: 'var(--primary)',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {u.role || 'USER'}
                                                        </span>
                                                    )}
                                                    {u.status !== 'deleted' && (
                                                        <button
                                                            onClick={() => handleStatusToggle(u.id, u.status || 'active')}
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                border: 'none',
                                                                background: u.status === 'inactive' ? 'var(--primary)' : 'rgba(239, 68, 68, 0.1)',
                                                                color: u.status === 'inactive' ? '#fff' : '#ef4444'
                                                            }}
                                                        >
                                                            {u.status === 'inactive' ? 'Unrestrict' : 'Restrict'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                            })}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && !loading && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No users matching "{searchTerm}" found.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'users' && !filterRole && (
                <div style={{
                    marginTop: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 0.5rem'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Showing {users.length} of {pagination.totalUsers} users
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            onClick={() => fetchUsers(pagination.page - 1)}
                            disabled={pagination.page <= 1 || loading}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                                opacity: pagination.page <= 1 ? 0.5 : 1,
                                fontSize: '0.8rem'
                            }}
                        >
                            Previous
                        </button>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            Page {pagination.page} of {pagination.totalPages || 1}
                        </span>
                        <button
                            onClick={() => fetchUsers(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages || loading}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                                opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                                fontSize: '0.8rem'
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="glass-card responsive-table-wrapper" style={{ padding: 0 }}>
                    {loading && logs.length === 0 ? (
                        <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" color="var(--primary)" /></div>
                    ) : logs.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No system logs found.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>Timestamp</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>Event Type</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>Details</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => {
                                    const details = log.details || {};
                                    const hasErrors = details.errors && details.errors.length > 0;

                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem',
                                                    background: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9', textTransform: 'uppercase'
                                                }}>
                                                    {log.event_type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>
                                                <div style={{ marginBottom: '0.2rem' }}>
                                                    <strong>Deleted Junk Files:</strong> {details.deletedFiles?.length || 0}
                                                </div>
                                                <div style={{ marginBottom: '0.2rem' }}>
                                                    <strong>Orphaned Auth Users Cleared:</strong> {details.deletedOrphanedUsers || 0}
                                                </div>
                                                {hasErrors && (
                                                    <div style={{ color: '#ef4444', marginTop: '0.5rem' }}>
                                                        <strong>Errors:</strong> {details.errors.length}
                                                        <ul style={{ margin: '0.2rem 0', paddingLeft: '1rem' }}>
                                                            {details.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                {hasErrors ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                                                        <XCircle size={16} /> Issues Found
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                                                        <CheckCircle2 size={16} /> Success
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserManagement;
