const supabase = require('./backend/config/supabase');

const userIds = [
    '4b2c8ea0-c67e-417b-91ae-152ec1718e5d', // ಚೇತನ್ ಕುಮಾರ್ (8414259539)
    '93cf270f-1e60-435e-902f-87b7458b6712', // ಚೇತನ್ ಕುಮಾರ್ (8648939644)
    'ab79186d-fb1f-48ad-889a-a19a49cc0f04', // ಚೇತನ್ ಕುಮಾರ್ (8712672934)
    '6a3eb461-ad73-4394-a103-6b759c805b2b', // ಚೇತನ್ ಕುಮಾರ್ (8208439511)
    '8d8f064d-f1f9-4f44-a8c0-ea5a0458e877', // Verifier (8765987654)
    '03f0644e-d04f-4106-a2d4-83f7a20efbb4'  // Verifier (9999988888)
];

async function deleteUsers() {
    console.log('--- PERMANENT USER DELETION MISSION ---');
    
    for (const id of userIds) {
        console.log(`\nProcessing ID: ${id}`);
        
        // 1. Delete from auth.users (using admin API)
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        
        if (authError) {
            console.error(`  Auth Delete Error: ${authError.message}`);
        } else {
            console.log(`  SUCCESS: Deleted from auth.users`);
        }

        // 2. Explicitly delete from public.users (in case cascade is not set)
        const { error: publicError } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (publicError) {
            console.error(`  Public DB Delete Error: ${publicError.message}`);
        } else {
            console.log(`  SUCCESS: Deleted from public.users`);
        }
    }
    
    console.log('\n--- MISSION COMPLETE ---');
}

deleteUsers();
