
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function listStaff() {
    const { data: staff } = await supabase.from('users').select('id, full_name, phone, role').in('role', ['super_admin', 'admin', 'moderator']);
    console.log(staff);
}
listStaff();
