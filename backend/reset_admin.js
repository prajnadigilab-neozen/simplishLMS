const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAdmin() {
    // Both super admin phone numbers found in the system
    const adminPhones = ['9686098582', '9112233445'];
    
    console.log('--- REPAIRING ADMIN ACCOUNTS ---');

    for (const phone of adminPhones) {
        console.log(`Processing: ${phone}...`);
        
        // 1. Find user in Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Failed to list users:', listError.message);
            return;
        }

        const user = users.find(u => u.phone === phone || u.phone === `+91${phone}` || u.phone === `91${phone}`);

        if (!user) {
            console.log(`User with phone ${phone} not found in Auth system.`);
            continue;
        }

        console.log(`Found Auth User: ${user.id} (${user.email || 'no email'})`);

        // 2. Update Auth (Password, Role, Confirmation)
        const { data: updatedUser, error: authError } = await supabase.auth.admin.updateUserById(user.id, {
            password: 'password123',
            phone_confirm: true,
            email_confirm: true,
            user_metadata: { 
                ...user.user_metadata,
                role: 'super_admin',
                full_name: user.user_metadata?.full_name || 'Super Admin'
            },
            app_metadata: {
                ...user.app_metadata,
                role: 'super_admin'
            }
        });

        if (authError) {
            console.error(`Failed to update Auth for ${phone}:`, authError.message);
        } else {
            console.log(`Auth updated successfully for ${phone}. Password set to 'password123'. Role: super_admin.`);
        }

        // 3. Update public.users table
        const { error: dbError } = await supabase
            .from('users')
            .update({ 
                role: 'super_admin',
                status: 'active'
            })
            .eq('id', user.id);

        if (dbError) {
            console.error(`Failed to update DB for ${phone}:`, dbError.message);
        } else {
            console.log(`Database profile updated for ${phone}. Role: super_admin.`);
        }
    }

    console.log('\n--- ADMIN REPAIR COMPLETE ---');
    console.log('You can now log in with the 10-digit phone number and password: password123');
}

resetAdmin();
