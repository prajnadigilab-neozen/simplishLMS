import React, { useState, useEffect } from 'react';
import { 
    Tag, 
    Percent, 
    TrendingUp, 
    Plus, 
    Edit, 
    Trash2, 
    Copy, 
    Download, 
    Search, 
    Sparkles, 
    Clock, 
    Calendar,
    CheckCircle2, 
    XCircle, 
    Loader2, 
    Filter,
    BarChart3,
    History,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { discountApi } from '../utils/api';
import { useToast } from './Toast';

const DiscountManagementAdmin = ({ user }) => {
    const showToast = useToast();
    const [activeSection, setActiveSection] = useState('list'); // 'list', 'analytics', 'history'
    
    // States for coupon listing
    const [coupons, setCoupons] = useState([]);
    const [totalCoupons, setTotalCoupons] = useState(0);
    const [loadingCoupons, setLoadingCoupons] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 10;

    // States for analytics
    const [analytics, setAnalytics] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // States for history
    const [history, setHistory] = useState([]);
    const [totalHistory, setTotalHistory] = useState(0);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyPage, setHistoryPage] = useState(1);

    // Modal and form states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form inputs (Single Coupon)
    const [customerType, setCustomerType] = useState('Student');
    const [couponCode, setCouponCode] = useState('');
    const [discountType, setDiscountType] = useState('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState(50);
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [maxUsage, setMaxUsage] = useState(1000);
    const [isActive, setIsActive] = useState(true);

    // Form inputs (Bulk Generation)
    const [bulkCustomerType, setBulkCustomerType] = useState('Student');
    const [bulkPrefix, setBulkPrefix] = useState('STU');
    const [bulkQuantity, setBulkQuantity] = useState(100);
    const [bulkDiscountType, setBulkDiscountType] = useState('PERCENTAGE');
    const [bulkDiscountValue, setBulkDiscountValue] = useState(50);
    const [bulkEndDate, setBulkEndDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [bulkUsageLimit, setBulkUsageLimit] = useState(1);

    useEffect(() => {
        if (activeSection === 'list') {
            fetchCoupons();
        } else if (activeSection === 'analytics') {
            fetchAnalytics();
        } else if (activeSection === 'history') {
            fetchHistory();
        }
    }, [activeSection, currentPage, searchQuery, filterType, historyPage]);

    const fetchCoupons = async () => {
        setLoadingCoupons(true);
        try {
            const offset = (currentPage - 1) * limit;
            const res = await discountApi.getAll({
                search: searchQuery || undefined,
                filterType: filterType || undefined,
                limit,
                offset
            });
            setCoupons(res.data.coupons || []);
            setTotalCoupons(res.data.total || 0);
        } catch (err) {
            console.error('Fetch coupons error:', err);
            showToast('Failed to load coupons.', 'error');
        } finally {
            setLoadingCoupons(false);
        }
    };

    const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const res = await discountApi.getAnalytics();
            setAnalytics(res.data);
        } catch (err) {
            console.error('Fetch analytics error:', err);
            showToast('Failed to load analytics metrics.', 'error');
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const offset = (historyPage - 1) * limit;
            const res = await discountApi.getHistory({
                limit,
                offset
            });
            setHistory(res.data.history || []);
            setTotalHistory(res.data.total || 0);
        } catch (err) {
            console.error('Fetch history error:', err);
            showToast('Failed to load usage history.', 'error');
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!couponCode.trim()) {
            showToast('Coupon code is required.', 'error');
            return;
        }

        setFormLoading(true);
        const payload = {
            customer_type: customerType,
            coupon_code: couponCode.trim().toUpperCase(),
            discount_type: discountType,
            discount_value: Number(discountValue),
            description: description || `Coupon for ${customerType}`,
            start_date: new Date(startDate).toISOString(),
            end_date: new Date(endDate).toISOString(),
            max_usage: Number(maxUsage),
            is_active: isActive
        };

        try {
            if (editingCoupon) {
                await discountApi.update(editingCoupon.id, payload);
                showToast('Coupon updated successfully.', 'success');
            } else {
                await discountApi.create(payload);
                showToast('Coupon created successfully.', 'success');
            }
            setShowCreateModal(false);
            setEditingCoupon(null);
            resetSingleForm();
            fetchCoupons();
        } catch (err) {
            console.error('Save coupon error:', err);
            showToast(err.response?.data?.message || 'Failed to save coupon.', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        if (!bulkPrefix.trim()) {
            showToast('Prefix is required.', 'error');
            return;
        }
        if (bulkQuantity <= 0 || bulkQuantity > 1000) {
            showToast('Bulk quantity must be between 1 and 1000.', 'error');
            return;
        }

        setFormLoading(true);
        const payload = {
            customerType: bulkCustomerType,
            prefix: bulkPrefix.trim().toUpperCase(),
            quantity: Number(bulkQuantity),
            discountType: bulkDiscountType,
            discountValue: Number(bulkDiscountValue),
            expiryDate: new Date(bulkEndDate).toISOString(),
            usageLimit: Number(bulkUsageLimit)
        };

        try {
            const res = await discountApi.generateBulk(payload);
            showToast(`Generated ${res.data.count} coupons successfully.`, 'success');
            setShowBulkModal(false);
            resetBulkForm();
            fetchCoupons();
        } catch (err) {
            console.error('Bulk generate error:', err);
            showToast(err.response?.data?.message || 'Failed to bulk-generate coupons.', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggle = async (coupon) => {
        try {
            const res = await discountApi.toggle(coupon.id);
            setCoupons(prev => prev.map(c => c.id === coupon.id ? res.data.coupon : c));
            showToast(`Coupon ${coupon.coupon_code} toggled successfully.`, 'success');
        } catch (err) {
            console.error('Toggle coupon error:', err);
            showToast('Failed to toggle coupon status.', 'error');
        }
    };

    const handleDelete = async (coupon) => {
        if (!window.confirm(`Are you sure you want to permanently delete coupon ${coupon.coupon_code}?`)) {
            return;
        }
        try {
            await discountApi.delete(coupon.id);
            showToast(`Coupon ${coupon.coupon_code} deleted successfully.`, 'success');
            fetchCoupons();
        } catch (err) {
            console.error('Delete coupon error:', err);
            showToast('Failed to delete coupon.', 'error');
        }
    };

    const handleClone = async (coupon) => {
        try {
            await discountApi.clone(coupon.id);
            showToast(`Cloned coupon ${coupon.coupon_code} successfully.`, 'success');
            fetchCoupons();
        } catch (err) {
            console.error('Clone coupon error:', err);
            showToast('Failed to clone coupon.', 'error');
        }
    };

    const handleEditClick = (coupon) => {
        setEditingCoupon(coupon);
        setCustomerType(coupon.customer_type);
        setCouponCode(coupon.coupon_code);
        setDiscountType(coupon.discount_type);
        setDiscountValue(coupon.discount_value);
        setDescription(coupon.description || '');
        setStartDate(new Date(coupon.start_date).toISOString().split('T')[0]);
        setEndDate(new Date(coupon.end_date).toISOString().split('T')[0]);
        setMaxUsage(coupon.max_usage);
        setIsActive(coupon.is_active);
        setShowCreateModal(true);
    };

    const handleCreateClick = () => {
        setEditingCoupon(null);
        resetSingleForm();
        setShowCreateModal(true);
    };

    const resetSingleForm = () => {
        setCustomerType('Student');
        setCouponCode('');
        setDiscountType('PERCENTAGE');
        setDiscountValue(50);
        setDescription('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setMaxUsage(1000);
        setIsActive(true);
    };

    const resetBulkForm = () => {
        setBulkCustomerType('Student');
        setBulkPrefix('STU');
        setBulkQuantity(100);
        setBulkDiscountType('PERCENTAGE');
        setBulkDiscountValue(50);
        setBulkEndDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setBulkUsageLimit(1);
    };

    const exportToCSV = () => {
        if (coupons.length === 0) {
            showToast('No coupons to export.', 'info');
            return;
        }

        const headers = ['Customer Type', 'Coupon Code', 'Discount Type', 'Discount Value', 'Start Date', 'End Date', 'Current Usage', 'Max Usage', 'Status', 'Percent Used'];
        const csvRows = [headers.join(',')];

        coupons.forEach(c => {
            const pct = c.max_usage > 0 ? ((c.current_usage / c.max_usage) * 100).toFixed(0) : '0';
            const row = [
                `"${c.customer_type}"`,
                `"${c.coupon_code}"`,
                `"${c.discount_type}"`,
                c.discount_value,
                `"${new Date(c.start_date).toLocaleDateString()}"`,
                `"${new Date(c.end_date).toLocaleDateString()}"`,
                c.current_usage,
                c.max_usage,
                c.is_active ? 'Active' : 'Inactive',
                `"${pct}%"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `simplish_coupons_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Coupons exported successfully.', 'success');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header section inside Tab */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
                        Discount & Coupon Hub
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Manage manual and automated campaigns, trace redemptions, and view cost analytics.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                        onClick={handleCreateClick}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)' }}
                    >
                        <Plus size={16} /> New Coupon
                    </button>
                    <button 
                        onClick={() => setShowBulkModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid rgba(var(--primary-rgb), 0.2)', background: 'rgba(var(--primary-rgb), 0.05)', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
                    >
                        <Sparkles size={16} /> Bulk Generate
                    </button>
                </div>
            </div>

            {/* Hub Tab Navigation */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                {[
                    { id: 'list', label: 'All Coupons', icon: Tag },
                    { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
                    { id: 'history', label: 'Redemption Log', icon: History }
                ].map(sec => (
                    <button
                        key={sec.id}
                        onClick={() => setActiveSection(sec.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: activeSection === sec.id ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            position: 'relative'
                        }}
                    >
                        <sec.icon size={16} />
                        {sec.label}
                        {activeSection === sec.id && (
                            <div style={{ position: 'absolute', bottom: '-0.6rem', left: 0, right: 0, height: '3px', background: 'var(--primary)', borderRadius: '10px' }} />
                        )}
                    </button>
                ))}
            </div>

            {/* SECTION 1: COUPON LIST */}
            {activeSection === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Filters Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search by code or customer type..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                                <select
                                    value={filterType}
                                    onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                                    style={{ padding: '0.6rem 1.5rem 0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                >
                                    <option value="">All Types</option>
                                    <option value="PERCENTAGE">Percentage</option>
                                    <option value="FREE_ACCESS">Free Access (100%)</option>
                                    <option value="FREE_MONTHS">Free Months</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={exportToCSV}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' }}
                        >
                            <Download size={16} /> Export CSV
                        </button>
                    </div>

                    {/* Table Grid */}
                    <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {loadingCoupons ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                                <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                            </div>
                        ) : coupons.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                                <Tag size={48} style={{ opacity: 0.3, margin: '0 auto 1.5rem' }} />
                                <h4 style={{ margin: '0 0 0.5rem 0' }}>No Coupons Found</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>Try refining your search terms or create a new coupon.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(var(--primary-rgb), 0.02)', color: 'var(--text-muted)', fontWeight: 800 }}>
                                            <th style={{ padding: '1rem 1.25rem' }}>CUSTOMER TYPE</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>COUPON CODE</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>DISCOUNT</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>DATE RANGE</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>USAGE LIMIT</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>PERCENT USED</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>STATUS</th>
                                            <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coupons.map(coupon => {
                                            const pct = coupon.max_usage > 0 
                                                ? Math.min(((coupon.current_usage / coupon.max_usage) * 100), 100) 
                                                : 0;
                                            
                                            return (
                                                <tr key={coupon.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>{coupon.customer_type}</td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 800, padding: '0.2rem 0.6rem', background: 'var(--bg-dark)', color: 'var(--text-main)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                            {coupon.coupon_code}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 700 }}>
                                                                {coupon.discount_type === 'PERCENTAGE' && `${coupon.discount_value}% Off`}
                                                                {coupon.discount_type === 'FREE_ACCESS' && '100% Free Access'}
                                                                {coupon.discount_type === 'FREE_MONTHS' && `+${coupon.discount_value} Month(s) Free`}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{coupon.discount_type.replace('_', ' ')}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Calendar size={12} />
                                                            {new Date(coupon.start_date).toLocaleDateString()} - {new Date(coupon.end_date).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <span style={{ fontWeight: 600 }}>{coupon.current_usage}</span> / <span style={{ color: 'var(--text-muted)' }}>{coupon.max_usage}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', width: '150px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                <span>{pct.toFixed(0)}%</span>
                                                            </div>
                                                            <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#ef4444' : 'var(--primary)', borderRadius: '100px' }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <button 
                                                            onClick={() => handleToggle(coupon)}
                                                            style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            {coupon.is_active ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '100px', background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                    <CheckCircle2 size={12} /> Active
                                                                </span>
                                                            ) : (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '100px', background: '#fee2fee', color: '#991b1b', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                    <XCircle size={12} /> Disabled
                                                                </span>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                                            <button 
                                                                onClick={() => handleEditClick(coupon)}
                                                                title="Edit Coupon"
                                                                style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleClone(coupon)}
                                                                title="Clone Coupon"
                                                                style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(coupon)}
                                                                title="Delete Coupon"
                                                                style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Footer */}
                        {totalCoupons > limit && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(var(--primary-rgb), 0.01)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalCoupons)} of {totalCoupons} coupons
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                        style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                                    >
                                        Prev
                                    </button>
                                    <button 
                                        disabled={currentPage * limit >= totalCoupons}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: currentPage * limit >= totalCoupons ? 'not-allowed' : 'pointer', opacity: currentPage * limit >= totalCoupons ? 0.5 : 1 }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 2: ANALYTICS DASHBOARD */}
            {activeSection === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {loadingAnalytics ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                        </div>
                    ) : !analytics ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No analytics data available.
                        </div>
                    ) : (
                        <>
                            {/* KPI Metric Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                                
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>COUPONS CREATED</span>
                                        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.25rem 0 0 0' }}>{analytics.couponsCreated}</h3>
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                                        <Tag size={24} />
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>COUPONS REDEEMED</span>
                                        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.25rem 0 0 0' }}>{analytics.couponsUsed}</h3>
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                        <CheckCircle2 size={24} />
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>REVENUE FOREGONE (LOST)</span>
                                        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.25rem 0 0 0', color: '#ef4444' }}>₹{analytics.revenueLost.toLocaleString()}</h3>
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                        <Percent size={24} />
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>REVENUE GENERATED</span>
                                        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.25rem 0 0 0', color: '#10b981' }}>₹{analytics.revenueGenerated.toLocaleString()}</h3>
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                        <TrendingUp size={24} />
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONVERSION RATE</span>
                                        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.25rem 0 0 0', color: 'var(--primary)' }}>{analytics.conversionRate}%</h3>
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                        <Clock size={24} />
                                    </div>
                                </div>

                            </div>

                            {/* Tables section: Top coupons and Distribution */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                                
                                {/* Top Coupons */}
                                <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800 }}>Top Performing Coupons</h4>
                                    {analytics.topCoupons.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No usage recorded yet.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {analytics.topCoupons.map((c, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: i === analytics.topCoupons.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 800, padding: '0.2rem 0.5rem', background: 'var(--bg-dark)', borderRadius: '6px' }}>{c.code}</span>
                                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.count} Redemptions</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Customer Type Distribution */}
                                <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800 }}>Customer Type Distribution</h4>
                                    {analytics.customerDistribution.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No usage recorded yet.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {analytics.customerDistribution.map((dist, i) => (
                                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                        <span style={{ fontWeight: 700 }}>{dist.type}</span>
                                                        <span style={{ fontWeight: 800 }}>{dist.count} usages</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(dist.count / analytics.couponsUsed) * 100}%`, height: '100%', background: 'var(--primary)' }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </>
                    )}
                </div>
            )}

            {/* SECTION 3: REDEMPTION HISTORY LOG */}
            {activeSection === 'history' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {loadingHistory ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                            <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                        </div>
                    ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                            <History size={48} style={{ opacity: 0.3, margin: '0 auto 1.5rem' }} />
                            <h4 style={{ margin: '0 0 0.5rem 0' }}>No Redemptions Yet</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>Coupon redemptions will populate here once transactions occur.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(var(--primary-rgb), 0.02)', color: 'var(--text-muted)', fontWeight: 800 }}>
                                        <th style={{ padding: '1rem 1.25rem' }}>STUDENT</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>COUPON</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>PURCHASE TYPE</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>ORIGINAL</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>DISCOUNT AMOUNT</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>FINAL PAID</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>TRANSACTION ID</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>REDEEMED ON</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700 }}>{item.users?.full_name || 'Sync User'}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.users?.email || 'No email'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{item.coupon_code}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.customer_type}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '100px', background: item.purchase_type === 'TOPUP' ? '#fef3c7' : '#e0f2fe', color: item.purchase_type === 'TOPUP' ? '#92400e' : '#0369a1' }}>
                                                    {item.purchase_type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>₹{Number(item.amount_before_discount || 0).toFixed(2)}</td>
                                            <td style={{ padding: '1rem 1.25rem', color: '#ef4444', fontWeight: 600 }}>-₹{Number(item.discount_amount || 0).toFixed(2)}</td>
                                            <td style={{ padding: '1rem 1.25rem', color: '#10b981', fontWeight: 700 }}>₹{Number(item.final_amount || 0).toFixed(2)}</td>
                                            <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.transaction_id}</td>
                                            <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>{new Date(item.used_on).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination for history */}
                    {totalHistory > limit && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(var(--primary-rgb), 0.01)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Showing {(historyPage - 1) * limit + 1} to {Math.min(historyPage * limit, totalHistory)} of {totalHistory} logs
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    disabled={historyPage === 1}
                                    onClick={() => setHistoryPage(p => Math.max(p - 1, 1))}
                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: historyPage === 1 ? 'not-allowed' : 'pointer', opacity: historyPage === 1 ? 0.5 : 1 }}
                                >
                                    Prev
                                </button>
                                <button 
                                    disabled={historyPage * limit >= totalHistory}
                                    onClick={() => setHistoryPage(p => p + 1)}
                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: historyPage * limit >= totalHistory ? 'not-allowed' : 'pointer', opacity: historyPage * limit >= totalHistory ? 0.5 : 1 }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CREATE / EDIT MODAL */}
            <AnimatePresence>
                {showCreateModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>
                                    {editingCoupon ? `Edit Coupon: ${editingCoupon.coupon_code}` : 'Create New Coupon'}
                                </h3>
                                <button 
                                    onClick={() => { setShowCreateModal(false); setEditingCoupon(null); }}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted)' }}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSingleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Customer Type</label>
                                        <input
                                            type="text"
                                            value={customerType}
                                            onChange={(e) => setCustomerType(e.target.value)}
                                            placeholder="e.g. Student, Beta User"
                                            required
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Coupon Code</label>
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. STUDENT50"
                                            required
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', textTransform: 'uppercase' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Discount Type</label>
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        >
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                            <option value="FREE_ACCESS">100% Free Access</option>
                                            <option value="FREE_MONTHS">Free Months Extension</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Discount Value</label>
                                        <input
                                            type="number"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(e.target.value)}
                                            required
                                            min="0"
                                            max={discountType === 'PERCENTAGE' || discountType === 'FREE_ACCESS' ? 100 : 24}
                                            disabled={discountType === 'FREE_ACCESS'}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description for campaign tracking..."
                                        rows="2"
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>End Date (Expiry)</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Maximum Usage Limit</label>
                                        <input
                                            type="number"
                                            value={maxUsage}
                                            onChange={(e) => setMaxUsage(e.target.value)}
                                            required
                                            min="1"
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="isActive" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Status: Active</label>
                                    </div>
                                </div>

                                {/* Modal Footer Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                    <button 
                                        type="button"
                                        onClick={() => { setShowCreateModal(false); setEditingCoupon(null); }}
                                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={formLoading}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: formLoading ? 'not-allowed' : 'pointer' }}
                                    >
                                        {formLoading && <Loader2 className="animate-spin" size={16} />}
                                        Save Coupon
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* BULK GENERATION MODAL */}
            <AnimatePresence>
                {showBulkModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Sparkles size={20} color="var(--primary)" /> Bulk Coupon Generator
                                </h3>
                                <button 
                                    onClick={() => { setShowBulkModal(false); }}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted)' }}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleBulkSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Customer Type</label>
                                        <input
                                            type="text"
                                            value={bulkCustomerType}
                                            onChange={(e) => setBulkCustomerType(e.target.value)}
                                            placeholder="e.g. Student, Beta User"
                                            required
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Code Prefix</label>
                                        <input
                                            type="text"
                                            value={bulkPrefix}
                                            onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                                            placeholder="e.g. STU"
                                            required
                                            maxLength="10"
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', textTransform: 'uppercase' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Quantity to Generate</label>
                                        <input
                                            type="number"
                                            value={bulkQuantity}
                                            onChange={(e) => setBulkQuantity(e.target.value)}
                                            required
                                            min="1"
                                            max="1000"
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Usage Limit per Code</label>
                                        <input
                                            type="number"
                                            value={bulkUsageLimit}
                                            onChange={(e) => setBulkUsageLimit(e.target.value)}
                                            required
                                            min="1"
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Discount Type</label>
                                        <select
                                            value={bulkDiscountType}
                                            onChange={(e) => setBulkDiscountType(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        >
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                            <option value="FREE_ACCESS">100% Free Access</option>
                                            <option value="FREE_MONTHS">Free Months Extension</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Discount Value</label>
                                        <input
                                            type="number"
                                            value={bulkDiscountValue}
                                            onChange={(e) => setBulkDiscountValue(e.target.value)}
                                            required
                                            min="0"
                                            max={bulkDiscountType === 'PERCENTAGE' || bulkDiscountType === 'FREE_ACCESS' ? 100 : 24}
                                            disabled={bulkDiscountType === 'FREE_ACCESS'}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Expiration Date</label>
                                    <input
                                        type="date"
                                        value={bulkEndDate}
                                        onChange={(e) => setBulkEndDate(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                    />
                                </div>

                                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    <strong>Example Output:</strong> Codes will be formatted like <code>{bulkPrefix}-K7X9W2AB</code>. Each code will be cryptographically unique, typo-safe, and securely generated.
                                </div>

                                {/* Modal Footer Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                    <button 
                                        type="button"
                                        onClick={() => { setShowBulkModal(false); }}
                                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={formLoading}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: formLoading ? 'not-allowed' : 'pointer' }}
                                    >
                                        {formLoading && <Loader2 className="animate-spin" size={16} />}
                                        Generate Coupons
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

export default DiscountManagementAdmin;
