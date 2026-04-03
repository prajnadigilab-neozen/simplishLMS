const supabase = require('./backend/config/supabase');

async function testUpdateRole() {
    const id = '3a07bd73-5d1d-48bc-9188-46fc007e4f76';
    const role = 'admin';

    try {
        console.log('Attempting to fetch user from Auth...');
        const { data: { user }, error: fetchError } = await supabase.auth.admin.getUserById(id);
        if (fetchError || !user) {
            console.error('Fetch Auth User Error:', fetchError?.message || 'User not found');
            return;
        }
        console.log('User found in Auth:', user.email);

        console.log('Attempting to update Auth user metadata...');
        const { error: authError } = await supabase.auth.admin.updateUserById(id, {
            user_metadata: { ...user.user_metadata, role }
        });
        if (authError) {
            console.error('Update Auth User Error:', authError.message);
            return;
        }
        console.log('Auth user metadata updated.');

        console.log('Attempting to update public.users table...');
        const { data, error: profileError } = await supabase
            .from('users')
            .update({ role })
            .eq('id', id)
            .select('id, full_name, role')
            .single();

        if (profileError) {
            console.error('Update Public Profile Error:', profileError.message, profileError.code);
            return;
        }
        console.log('Public profile updated successfully:', data);

    } catch (err) {
        console.error('Unexpected Script Error:', err);
    }
}

testUpdateRole();
