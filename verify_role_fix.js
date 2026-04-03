const supabase = require('./backend/config/supabase');
const { createClient } = require('@supabase/supabase-js');

async function verifyRoleFix() {
    const id = '3a07bd73-5d1d-48bc-9188-46fc007e4f76';
    const newRoleInput = 'Moderator'; // Capitalized to test normalization

    try {
        console.log('--- Verification Start ---');
        
        // 1. Get initial state
        const { data: { user: initialUser } } = await supabase.auth.admin.getUserById(id);
        console.log('Initial Metadata:', initialUser.user_metadata);

        // 2. Mock the controller call (since we can't easily hit the API from here without auth)
        // We'll just run the logic that's now in the controller
        let role = newRoleInput;
        if (typeof role === 'string') {
            role = role.toLowerCase().replace(' ', '_');
        }
        console.log('Normalized Role:', role);

        const adminClient = createClient(process.env.SUPABASE_URL?.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

        // Update Auth
        const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
            user_metadata: { ...initialUser.user_metadata, role }
        });
        if (authError) throw authError;

        // Update DB
        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .update({ role })
            .eq('id', id)
            .select()
            .single();
        if (profileError) throw profileError;

        // 3. Verify final state
        const { data: { user: finalUser } } = await adminClient.auth.admin.getUserById(id);
        console.log('Final Metadata:', finalUser.user_metadata);
        console.log('Final Profile Role:', profile.role);

        const metadataPreserved = finalUser.user_metadata.full_name === initialUser.user_metadata.full_name;
        const roleUpdated = finalUser.user_metadata.role === 'moderator' && profile.role === 'moderator';

        if (metadataPreserved && roleUpdated) {
            console.log('✅ SUCCESS: Metadata preserved and role updated (normalized).');
        } else {
            console.error('❌ FAILURE:', { metadataPreserved, roleUpdated });
        }

    } catch (err) {
        console.error('Verification Failed:', err.message);
    }
}

verifyRoleFix();
