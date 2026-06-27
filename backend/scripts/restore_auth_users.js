const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function restoreAuthUsers() {
    console.log('Connecting to Supabase project:', supabaseUrl);
    
    // 1. Fetch all users from public.users
    const { data: dbUsers, error: dbError } = await supabase
        .from('users')
        .select('id, full_name, phone, role');
        
    if (dbError) {
        console.error('Failed to fetch public.users:', dbError.message);
        process.exit(1);
    }
    
    console.log(`Found ${dbUsers.length} users in public.users table.`);
    
    // 2. Loop and recreate them in auth.users
    for (const u of dbUsers) {
        if (!u.phone) {
            console.log(`Skipping User ${u.full_name || u.id}: No phone number registered.`);
            continue;
        }

        // Clean/normalize phone to ensure it has no country code or matches what we expect
        const cleanPhone = u.phone.toString().trim().replace(/\D/g, '');
        
        console.log(`Processing ${u.full_name} (${cleanPhone})...`);
        
        // Check if user already exists in auth.users
        const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserById(u.id);
        
        if (existingUser && existingUser.user) {
            console.log(`  -> User already exists in Authentication.`);
            continue;
        }

        // Recreate the user in auth.users with the SAME UUID
        const defaultPassword = 'password123'; // Default password
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            id: u.id, // Enforce same UUID
            phone: cleanPhone,
            password: defaultPassword,
            phone_confirm: true,
            user_metadata: {
                full_name: u.full_name,
                role: u.role || 'user'
            }
        });

        if (createError) {
            console.error(`  ❌ Failed to create user in Auth:`, createError.message);
        } else {
            console.log(`  ** Successfully created in Authentication with password: "${defaultPassword}"`);
        }
    }
    
    console.log('\nSync completed.');
    process.exit(0);
}

restoreAuthUsers();
