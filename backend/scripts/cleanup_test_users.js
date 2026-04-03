const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupTestUsers() {
    console.log('--- SIMPLISH DB Cleanup: Purging Test Users ---');

    try {
        // 1. Identify users matching test patterns
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .or('full_name.ilike.%test%,email.ilike.%test%,email.ilike.%attacker%,email.ilike.%example.com%');

        if (fetchError) throw fetchError;

        if (!users || users.length === 0) {
            console.log('✅ No test users matching the criteria were found.');
            return;
        }

        console.log(`Found ${users.length} test users to purge:`);
        users.forEach(u => console.log(` - [${u.id}] ${u.full_name} (${u.email || 'No Email'})`));

        for (const user of users) {
            console.log(`\nProcessing Hard Delete for: ${user.id}...`);

            // Phase 1: Clear Progress
            const { error: pError } = await supabase.from('user_progress').delete().eq('user_id', user.id);
            if (pError) console.warn(`   [!] Failed to clear progress for ${user.id}:`, pError.message);
            else console.log(`   [x] User progress cleared.`);

            // Phase 2: Clear Payments
            const { error: payError } = await supabase.from('payments').delete().eq('user_id', user.id);
            if (payError) console.warn(`   [!] Failed to clear payments for ${user.id}:`, payError.message);
            else console.log(`   [x] Payment history cleared.`);

            // Phase 3: Delete Public Profile
            const { error: profileError } = await supabase.from('users').delete().eq('id', user.id);
            if (profileError) console.warn(`   [!] Failed to delete profile for ${user.id}:`, profileError.message);
            else console.log(`   [x] Public profile deleted.`);

            // Phase 4: Purge Auth system
            const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
            if (authError) {
                // Ignore 404s in case the auth user is already gone
                if (authError.status !== 404) {
                    console.warn(`   [!] Failed to purge Auth user ${user.id}:`, authError.message);
                } else {
                    console.log(`   [x] Auth user already purged.`);
                }
            } else {
                console.log(`   [x] Auth system record purged.`);
            }
        }

        console.log('\n--- Cleanup Mission Success ---');
    } catch (err) {
        console.error('CRITICAL CLEANUP ERROR:', err.message);
    }
}

// Check for dry-run flag
if (process.argv.includes('--dry-run')) {
    console.log('[DRY RUN MODE] Scan complete. No changes were made.');
} else {
    cleanupTestUsers();
}
