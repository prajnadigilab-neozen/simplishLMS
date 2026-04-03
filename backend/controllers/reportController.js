const supabase = require('../config/supabase');

exports.getSummaryMetrics = async (req, res) => {
    try {
        const role = req.user?.role?.toLowerCase();
        const isSuperAdmin = role === 'super_admin';
        
        console.log(`[Reports] Generating summary for role: ${role}`);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
        const currentMonthName = now.toLocaleString('default', { month: 'long' });

        const calculateGrowth = (current, previous) => {
            if (!previous || previous === 0) return current > 0 ? 100 : 0;
            return parseFloat(((current - previous) / previous * 100).toFixed(1));
        };

        // 1. Total Registered Users
        let totalUsers = 0;
        try {
            const { count, error } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'deleted');
            if (error) throw error;
            totalUsers = count || 0;
        } catch (err) {
            console.error('[Reports] Total users fetch failed:', err.message);
        }

        // 2. Registrations MoM
        let registrationsCurrentMonth = 0;
        let registrationsLastMonth = 0;
        try {
            const { count: currentCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startOfMonth);
            registrationsCurrentMonth = currentCount || 0;

            const { count: lastCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startOfLastMonth)
                .lte('created_at', endOfLastMonth);
            registrationsLastMonth = lastCount || 0;
        } catch (err) {
            console.error('[Reports] Registration MoM fetch failed:', err.message);
        }
        const registrationMoM = calculateGrowth(registrationsCurrentMonth, registrationsLastMonth);

        // 3. Active Today
        let activeToday = 0;
        try {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gt('last_login_at', dayAgo);
            activeToday = count || 0;
        } catch (err) {
            console.error('[Reports] Active today fetch failed:', err.message);
        }

        // 3b. Avg Daily Active (30-day)
        let avgDailyActive30d = 0;
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: activity } = await supabase
                .from('user_progress')
                .select('user_id, last_accessed_at')
                .gte('last_accessed_at', thirtyDaysAgo);
            
            if (activity && activity.length > 0) {
                const dailyUsers = {};
                activity.forEach(a => {
                    if (!a.last_accessed_at) return;
                    const date = a.last_accessed_at.split('T')[0];
                    if (!dailyUsers[date]) dailyUsers[date] = new Set();
                    dailyUsers[date].add(a.user_id);
                });
                
                const counts = Object.values(dailyUsers).map(set => set.size);
                const sum = counts.reduce((acc, c) => acc + c, 0);
                avgDailyActive30d = counts.length > 0 ? Math.round(sum / 30) : 0; 
            }
        } catch (err) {
            console.error('[Reports] Avg active calculation failed:', err.message);
        }

        // 4. Revenue (Super Admin)
        let totalRevenueAllTime = 0;
        let revenueMoM = 0;
        if (isSuperAdmin) {
            try {
                const { data: allTime, error: e1 } = await supabase.from('payments').select('amount').eq('status', 'completed');
                if (e1) throw e1;
                totalRevenueAllTime = (allTime || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                const { data: currentMonth, error: e2 } = await supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', startOfMonth);
                if (e2) throw e2;
                const revCurrent = (currentMonth || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                const { data: lastMonth, error: e3 } = await supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth);
                if (e3) throw e3;
                const revLast = (lastMonth || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                revenueMoM = calculateGrowth(revCurrent, revLast);
            } catch (err) {
                console.error('[Reports] Revenue calculation failed:', err.message);
            }
        }

        res.json({
            totalUsers,
            newRegistrationsCurrentMonth: registrationsCurrentMonth,
            registrationMoM,
            totalRevenueAllTime,
            revenueMoM,
            currentMonthName,
            activeToday,
            avgDailyActive30d
        });
    } catch (error) {
        console.error('[Reports] Critical summary failure:', error);
        res.status(500).json({ message: 'Internal server error in summary metrics' });
    }
};

/**
 * Get Detailed Activity per Lesson
 */
/**
 * Get Today's Platform KPIs (Registrations, Deletions, Revenue)
 * Revenue is only returned when the caller is super_admin (enforced at route level)
 */
exports.getDailyReport = async (req, res) => {
    try {
        const role = req.user?.role?.toLowerCase();
        const isSuperAdmin = role === 'super_admin';

        console.log(`[Reports] Generating daily report for role: ${role}`);

        const toDate = req.query.to ? new Date(req.query.to + 'T23:59:59.999Z') : new Date();
        const fromDate = req.query.from ? new Date(req.query.from + 'T00:00:00.000Z') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date range provided' });
        }

        const fromISO = fromDate.toISOString();
        const toISO = toDate.toISOString();

        // 1. Fetch Registrations
        const { data: regs, error: e1 } = await supabase.from('users').select('created_at').gte('created_at', fromISO).lte('created_at', toISO);
        if (e1) console.warn('[Reports] Daily regs fetch error:', e1.message);

        // 2. Fetch Deletions
        const { data: dels, error: e2 } = await supabase.from('users').select('deleted_at').eq('status', 'deleted').gte('deleted_at', fromISO).lte('deleted_at', toISO);
        if (e2) console.warn('[Reports] Daily dels fetch error:', e2.message);

        // 3. Fetch Revenue
        let payments = [];
        if (isSuperAdmin) {
            const { data, error: e3 } = await supabase.from('payments').select('created_at, amount').eq('status', 'completed').gte('created_at', fromISO).lte('created_at', toISO);
            if (e3) console.warn('[Reports] Daily revenue fetch error:', e3.message);
            payments = data || [];
        }

        // 4. Fetch Activity
        const { data: activity, error: e4 } = await supabase.from('user_progress').select('user_id, last_accessed_at').gte('last_accessed_at', fromISO).lte('last_accessed_at', toISO);
        if (e4) console.warn('[Reports] Daily activity fetch error:', e4.message);

        const breakdown = {};
        let current = new Date(fromDate);
        // Safety cap to prevent infinite loops or huge ranges
        let iterations = 0;
        while (current <= toDate && iterations < 31) {
            const dateStr = current.toISOString().split('T')[0];
            breakdown[dateStr] = { date: dateStr, registrations: 0, active: 0, revenue: 0, deleted: 0, topUpRevenue: 0 };
            current.setDate(current.getDate() + 1);
            iterations++;
        }

        (regs || []).forEach(r => {
            if (!r.created_at) return;
            const d = r.created_at.toString().split('T')[0];
            if (breakdown[d]) breakdown[d].registrations++;
        });

        (dels || []).forEach(d_item => {
            if (!d_item.deleted_at) return;
            const d = d_item.deleted_at.toString().split('T')[0];
            if (breakdown[d]) breakdown[d].deleted++;
        });

        payments.forEach(p => {
            if (!p.created_at) return;
            const d = p.created_at.toString().split('T')[0];
            if (breakdown[d]) {
                const amt = Number(p.amount) || 0;
                breakdown[d].revenue += amt;
                if (amt < 499) breakdown[d].topUpRevenue += amt;
            }
        });

        const dailyActiveUsers = {};
        (activity || []).forEach(a => {
            if (!a.last_accessed_at) return;
            const d = a.last_accessed_at.toString().split('T')[0];
            if (!dailyActiveUsers[d]) dailyActiveUsers[d] = new Set();
            dailyActiveUsers[d].add(a.user_id);
        });
        Object.keys(dailyActiveUsers).forEach(d => {
            if (breakdown[d]) breakdown[d].active = dailyActiveUsers[d].size;
        });

        const sortedBreakdown = Object.values(breakdown).sort((a, b) => b.date.localeCompare(a.date));

        res.json({
            from: fromISO.split('T')[0],
            to: toISO.split('T')[0],
            daily_breakdown: sortedBreakdown,
            isSuperAdmin
        });
    } catch (error) {
        console.error('[Reports] Critical daily report failure:', error);
        res.status(500).json({ message: 'Internal server error in daily report' });
    }
};

exports.getActivityDetails = async (req, res) => {
    try {
        let activity = [];
        try {
            // Fetch progress and join with users/lessons
            const { data: progressData, error: progressError } = await supabase
                .from('user_progress')
                .select(`
                    user_id,
                    lesson_id,
                    spent_time_ms,
                    status,
                    completion_percentage,
                    last_accessed_at,
                    users ( full_name ),
                    lessons ( id, title, level )
                `)
                .order('last_accessed_at', { ascending: false })
                .limit(50);

            if (progressError) throw progressError;

            // Fetch assessment results for these users/lessons to get scores
            const userIds = [...new Set(progressData.map(p => p.user_id))];
            const { data: resultsData, error: resultsError } = await supabase
                .from('assessment_results')
                .select(`
                    user_id,
                    score,
                    passed,
                    completed_at,
                    assessments ( lesson_id )
                `)
                .in('user_id', userIds);

            if (resultsError) {
                console.warn('Could not fetch assessment results for report:', resultsError.message);
            }

            // Merge Data
            activity = (progressData || []).map(p => {
                // Find matching score for this lesson (via assessment join)
                const result = resultsData?.find(r =>
                    r.user_id === p.user_id &&
                    r.assessments?.lesson_id === p.lesson_id
                );

                return {
                    student: p.users?.full_name || 'Anonymous',
                    lesson: p.lessons?.title || 'Unknown Lesson',
                    level: p.lessons?.level,
                    status: p.status,
                    progress: p.completion_percentage,
                    timeSpentMin: (Number(p.spent_time_ms || 0) / 60000).toFixed(1),
                    lastAccessed: p.last_accessed_at,
                    score: result ? result.score : null,
                    passed: result ? result.passed : null,
                    atRisk: (p.spent_time_ms > 1800000 && p.completion_percentage < 50) // > 30 mins and < 50%
                };
            });

        } catch (innerErr) {
            console.warn('getActivityDetails inner error (non-fatal):', innerErr.message);
        }

        res.json(activity);
    } catch (error) {
        console.error('getActivityDetails error:', error);
        res.status(500).json({ message: 'Error fetching activity details' });
    }
};
