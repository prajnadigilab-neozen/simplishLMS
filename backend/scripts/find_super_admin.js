const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findSuperAdmin() {
    const { data: superAdmins, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role')
        .eq('role', 'super_admin');

    if (error) {
        console.error('Error finding super admin:', error);
        return;
    }

    if (superAdmins.length === 0) {
        console.log('No super admin found.');
        return;
    }

    console.log('--- Super Admins Found ---');
    superAdmins.forEach(admin => {
        console.log(`ID: ${admin.id}`);
        console.log(`Name: ${admin.full_name}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Phone: ${admin.phone}`);
        console.log(`Role: ${admin.role}`);
        console.log('---------------------------');
    });
}

findSuperAdmin();
