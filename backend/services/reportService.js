const supabase = require('../config/supabase');

/**
 * Service to handle all Reporting and Analytics database operations.
 * Modernized to handle complex aggregations for the Admin Dashboard.
 */
const reportService = {
    /**
     * Fetch global user metrics for current and previous month.
     */
    getSummaryMetrics: async (canSeeRevenue = false) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        console.log('[DEBUG-VERIFY-VERSION-V100] Using amount_paise version of reportService');
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
        const activeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const weekWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const results = await Promise.allSettled([
            // 1. Total Registered Users
            supabase.from('users').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
            // 2. Registrations Current Month
            supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
            // 3. Registrations Last Month
            supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
            // 4. Active Today (last 24h)
            supabase.from('users').select('*', { count: 'exact', head: true }).gt('last_login_at', activeWindow),
            // 5. Avg Active Today (7d window)
            supabase.from('user_progress').select('user_id, last_accessed_at').gte('last_accessed_at', weekWindow),
            // 6. Revenue
            canSeeRevenue ? supabase.from('payments').select('amount_paise').eq('status', 'completed') : Promise.resolve({ data: [] }),
            canSeeRevenue ? supabase.from('payments').select('amount_paise').eq('status', 'completed').gte('created_at', startOfMonth) : Promise.resolve({ data: [] }),
            canSeeRevenue ? supabase.from('payments').select('amount_paise').eq('status', 'completed').gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth) : Promise.resolve({ data: [] })
        ]);
        
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error(`[Backend Service] Query ${i} REJECTED:`, r.reason);
            } else if (r.value?.error) {
                // Supabase errors resolve (not reject) with { data: null, error: {...} }
                console.error(`[Backend Service] Query ${i} SUPABASE ERROR:`, r.value.error.message || r.value.error);
            }
        });
        
        console.log('[Backend Service] Revenue Rows (allTime):', results[5].value?.data?.length ?? 'NULL (error!)');
        console.log('[Backend Service] Revenue Rows (currentMonth):', results[6].value?.data?.length ?? 'NULL (error!)');
        console.log('[Backend Service] Revenue Rows (lastMonth):', results[7].value?.data?.length ?? 'NULL (error!)');

        return {
            totalUsers: results[0].value?.count || 0,
            registrationsCurrentMonth: results[1].value?.count || 0,
            registrationsLastMonth: results[2].value?.count || 0,
            activeToday: results[3].value?.count || 0,
            activity: results[4].value?.data || [],
            revenue: {
                allTime: results[5].value?.data || [],
                currentMonth: results[6].value?.data || [],
                lastMonth: results[7].value?.data || []
            }
        };
    },

    /**
     * Fetch time-series data for daily reports.
     */
    getDailyBreakdown: async (fromISO, toISO, canSeeRevenue = false) => {
        const results = await Promise.allSettled([
            // Registrations
            supabase.from('users').select('created_at').gte('created_at', fromISO).lte('created_at', toISO).neq('status', 'deleted'),
            // Deletions
            supabase.from('users').select('deleted_at').eq('status', 'deleted').gte('deleted_at', fromISO).lte('deleted_at', toISO),
            // Revenue
            canSeeRevenue ? supabase.from('payments').select('created_at, amount_paise, payment_type').eq('status', 'completed').gte('created_at', fromISO).lte('created_at', toISO) : Promise.resolve({ data: [] }),
            // Activity (Unique Active Users)
            supabase.from('user_progress').select('user_id, last_accessed_at').gte('last_accessed_at', fromISO).lte('last_accessed_at', toISO)
        ]);

        return {
            registrations: results[0].value?.data || [],
            deletions: results[1].value?.data || [],
            payments: results[2].value?.data || [],
            activity: results[3].value?.data || []
        };
    },

    /**
     * Fetch detailed activity logs joined with users and lessons.
     */
    getActivityDetails: async (limit = 100) => {
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
            .limit(limit);

        if (progressError) throw progressError;

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

        if (resultsError) console.warn('Non-fatal: Could not fetch results for activity report.');

        return { progressData, resultsData };
    },

    /**
     * Get recent transactions for financial auditing.
     */
    getRecentTransactions: async (limit = 50) => {
        const { data, error } = await supabase
            .from('payments')
            .select(`
                id,
                amount_paise,
                status,
                currency,
                created_at,
                transaction_id,
                users ( full_name, email )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    }
};

module.exports = reportService;
