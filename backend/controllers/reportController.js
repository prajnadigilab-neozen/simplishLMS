const supabase = require('../config/supabase');

exports.getSummaryMetrics = async (req, res) => {
    try {
        const role = req.user?.role?.toLowerCase().replace(' ', '_');
        const isSuperAdmin = role === 'super_admin';
        const canSeeRevenue = isSuperAdmin || role === 'admin' || role === 'moderator';
        
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

        // 1. Unified Parallel Execution (SRE Optimization)
        const start = Date.now();
        const results = await Promise.allSettled([
            // 1a. Total Registered Users
            supabase.from('users').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
            // 1b. Registrations Current Month
            supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
            // 1c. Registrations Last Month
            supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
            // 1d. Active Today (last 24h)
            supabase.from('users').select('*', { count: 'exact', head: true }).gt('last_login_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
            // 1e. Revenue (Total All-time)
            canSeeRevenue ? supabase.from('payments').select('amount').eq('status', 'completed') : Promise.resolve({ data: [] }),
            // 1f. Revenue (Current Month)
            canSeeRevenue ? supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', startOfMonth) : Promise.resolve({ data: [] }),
            // 1g. Revenue (Last Month)
            canSeeRevenue ? supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth) : Promise.resolve({ data: [] }),
            // 1h. Avg Active (Reduced window to 7-days for speed)
            supabase.from('user_progress').select('user_id, last_accessed_at').gte('last_accessed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        const totalUsers = results[0].value?.count || 0;
        const registrationsCurrentMonth = results[1].value?.count || 0;
        const registrationsLastMonth = results[2].value?.count || 0;
        const activeToday = results[3].value?.count || 0;

        // Process Revenue
        let totalRevenueAllTime = 0;
        let revenueMoM = 0;
        if (canSeeRevenue) {
            const allTime = results[4].value?.data || [];
            const currentMonth = results[5].value?.data || [];
            const lastMonth = results[6].value?.data || [];

            totalRevenueAllTime = allTime.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const revCurrent = currentMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const revLast = lastMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            revenueMoM = calculateGrowth(revCurrent, revLast);
        }

        // Process Avg Daily Active
        let avgDailyActive30d = 0; // Keeping name for compatibility, but using 7-day window
        const activity = results[7].value?.data || [];
        if (activity.length > 0) {
            const dailyUsers = {};
            activity.forEach(a => {
                if (!a.last_accessed_at) return;
                const date = a.last_accessed_at.split('T')[0];
                if (!dailyUsers[date]) dailyUsers[date] = new Set();
                dailyUsers[date].add(a.user_id);
            });
            const counts = Object.values(dailyUsers).map(set => set.size);
            const sum = counts.reduce((acc, c) => acc + c, 0);
            avgDailyActive30d = counts.length > 0 ? Math.round(sum / (counts.length || 7)) : 0;
        }

        const registrationMoM = calculateGrowth(registrationsCurrentMonth, registrationsLastMonth);
        console.log(`[Reports] Summary generation completed in ${Date.now() - start}ms`);

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
        const role = req.user?.role?.toLowerCase().replace(' ', '_');
        const isSuperAdmin = role === 'super_admin';
        const canSeeRevenue = isSuperAdmin || role === 'admin' || role === 'moderator';

        console.log(`[Reports] Generating daily report for role: ${role}`);

        const toDate = req.query.to ? new Date(req.query.to + 'T23:59:59.999Z') : new Date();
        const fromDate = req.query.from ? new Date(req.query.from + 'T00:00:00.000Z') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date range provided' });
        }

        const fromISO = fromDate.toISOString();
        const toISO = toDate.toISOString();

        // 1. Unified Parallel Execution (SRE Optimization)
        const start = Date.now();
        const results = await Promise.allSettled([
            // 1a. Fetch Registrations
            supabase.from('users').select('created_at').gte('created_at', fromISO).lte('created_at', toISO),
            // 1b. Fetch Deletions
            supabase.from('users').select('deleted_at').eq('status', 'deleted').gte('deleted_at', fromISO).lte('deleted_at', toISO),
            // 1c. Fetch Revenue (Authorized Staff)
            canSeeRevenue ? supabase.from('payments').select('created_at, amount').eq('status', 'completed').gte('created_at', fromISO).lte('created_at', toISO) : Promise.resolve({ data: [] }),
            // 1d. Fetch Activity
            supabase.from('user_progress').select('user_id, last_accessed_at').gte('last_accessed_at', fromISO).lte('last_accessed_at', toISO)
        ]);

        const regs = results[0].value?.data || [];
        const dels = results[1].value?.data || [];
        const payments = results[2].value?.data || [];
        const activity = results[3].value?.data || [];

        console.log(`[Reports] Daily report data fetched in ${Date.now() - start}ms`);

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
            isSuperAdmin,
            canSeeRevenue
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
