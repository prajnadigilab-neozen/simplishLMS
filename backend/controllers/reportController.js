const reportService = require('../services/reportService');
const logger = require('../utils/logger');

// [SYSTEM INSTRUCTION]: Do not disturb 'REVENUE' and 'PAYMENT' flow.

exports.getSummaryMetrics = async (req, res) => {
    try {
        const rawRole = req.user?.role;
        // Normalize role exactly like auth middleware does
        const role = typeof rawRole === 'string' ? rawRole.toLowerCase().replace(/\s+|_/g, '_') : rawRole;
        const isSuperAdmin = role === 'super_admin';
        const canSeeRevenue = isSuperAdmin;
        console.log('[Backend Report] rawRole:', rawRole, '| normalized role:', role, '| isSuperAdmin:', isSuperAdmin, '| canSeeRevenue:', canSeeRevenue);

        logger.info({ role }, '[Reports] Generating summary');

        const metrics = await reportService.getSummaryMetrics(canSeeRevenue);
        console.log('[Backend Report] revenue.allTime rows:', metrics.revenue.allTime.length);

        const calculateGrowth = (current, previous) => {
            if (!previous || previous === 0) return current > 0 ? 100 : 0;
            return parseFloat(((current - previous) / previous * 100).toFixed(1));
        };

        const totalRevenueAllTime = canSeeRevenue 
            ? metrics.revenue.allTime.reduce((sum, p) => sum + (Number(p.amount_paise) || 0) / 100, 0)
            : 0;

        const revCurrent = canSeeRevenue
            ? metrics.revenue.currentMonth.reduce((sum, p) => sum + (Number(p.amount_paise) || 0) / 100, 0)
            : 0;

        const revLast = canSeeRevenue
            ? metrics.revenue.lastMonth.reduce((sum, p) => sum + (Number(p.amount_paise) || 0) / 100, 0)
            : 0;

        const revenueMoM = canSeeRevenue ? calculateGrowth(revCurrent, revLast) : 0;
        console.log('[Backend Report] totalRevenueAllTime:', totalRevenueAllTime, '| revCurrent:', revCurrent, '| revenueMoM:', revenueMoM);

        // Process Avg Daily Active
        let avgDailyActive30d = 0;
        if (metrics.activity.length > 0) {
            const dailyUsers = {};
            metrics.activity.forEach(a => {
                if (!a.last_accessed_at) return;
                const date = a.last_accessed_at.split('T')[0];
                if (!dailyUsers[date]) dailyUsers[date] = new Set();
                dailyUsers[date].add(a.user_id);
            });
            const counts = Object.values(dailyUsers).map(set => set.size);
            const sum = counts.reduce((acc, c) => acc + c, 0);
            avgDailyActive30d = counts.length > 0 ? Math.round(sum / (counts.length || 7)) : 0;
        }

        const registrationMoM = calculateGrowth(metrics.registrationsCurrentMonth, metrics.registrationsLastMonth);

        res.json({
            totalUsers: metrics.totalUsers,
            newRegistrationsCurrentMonth: metrics.registrationsCurrentMonth,
            registrationMoM,
            totalRevenueAllTime,
            revenueMoM,
            currentMonthName: new Date().toLocaleString('default', { month: 'long' }),
            activeToday: metrics.activeToday,
            avgDailyActive30d
        });
    } catch (error) {
        logger.error({ error }, '[Reports] Critical summary failure');
        res.status(500).json({ message: 'Internal server error in summary metrics' });
    }
};

exports.getDailyReport = async (req, res) => {
    try {
        const rawRole = req.user?.role;
        const role = typeof rawRole === 'string' ? rawRole.toLowerCase().replace(/\s+|_/g, '_') : rawRole;
        const isSuperAdmin = role === 'super_admin';
        const canSeeRevenue = isSuperAdmin;
        console.log('[Backend DailyReport] role:', role, '| canSeeRevenue:', canSeeRevenue);

        const toDate = req.query.to ? new Date(req.query.to + 'T23:59:59.999Z') : new Date();
        const fromDate = req.query.from ? new Date(req.query.from + 'T00:00:00.000Z') : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date range provided' });
        }

        const data = await reportService.getDailyBreakdown(fromDate.toISOString(), toDate.toISOString(), canSeeRevenue);

        const breakdown = {};
        let current = new Date(fromDate);
        let iterations = 0;
        while (current <= toDate && iterations < 366) {
            const dateStr = current.toISOString().split('T')[0];
            breakdown[dateStr] = { date: dateStr, registrations: 0, active: 0, revenue: 0, deleted: 0, topUpRevenue: 0, membershipRevenue: 0 };
            current.setDate(current.getDate() + 1);
            iterations++;
        }

        (data.registrations || []).forEach(r => {
            const d = r.created_at.toString().split('T')[0];
            if (breakdown[d]) breakdown[d].registrations++;
        });

        (data.deletions || []).forEach(d_item => {
            const d = d_item.deleted_at.toString().split('T')[0];
            if (breakdown[d]) breakdown[d].deleted++;
        });

        (data.payments || []).forEach(p => {
            const d = p.created_at.toString().split('T')[0];
            if (breakdown[d]) {
                const amtRupees = (Number(p.amount_paise) || 0) / 100;
                breakdown[d].revenue += amtRupees;
                if (p.payment_type === 'TOPUP') {
                    breakdown[d].topUpRevenue += amtRupees;
                } else {
                    breakdown[d].membershipRevenue += amtRupees;
                }
            }
        });

        const dailyActiveUsers = {};
        (data.activity || []).forEach(a => {
            const d = a.last_accessed_at.toString().split('T')[0];
            if (!dailyActiveUsers[d]) dailyActiveUsers[d] = new Set();
            dailyActiveUsers[d].add(a.user_id);
        });
        Object.keys(dailyActiveUsers).forEach(d => {
            if (breakdown[d]) breakdown[d].active = dailyActiveUsers[d].size;
        });

        const sortedBreakdown = Object.values(breakdown).sort((a, b) => b.date.localeCompare(a.date));

        res.json({
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
            daily_breakdown: sortedBreakdown,
            isSuperAdmin,
            canSeeRevenue
        });
    } catch (error) {
        logger.error({ error }, '[Reports] Critical daily report failure');
        res.status(500).json({ message: 'Internal server error in daily report' });
    }
};

exports.getActivityDetails = async (req, res) => {
    try {
        const { progressData, resultsData } = await reportService.getActivityDetails(50);

        const activity = progressData.map(p => {
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
                atRisk: (p.spent_time_ms > 1800000 && p.completion_percentage < 50)
            };
        });

        res.json(activity);
    } catch (error) {
        logger.error({ error }, 'getActivityDetails error');
        res.status(500).json({ message: 'Error fetching activity details' });
    }
};
