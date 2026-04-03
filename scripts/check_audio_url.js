const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Try load .env from several likely locations
const envPaths = [
    path.join(__dirname, 'backend', '.env'),
    path.join(process.cwd(), 'backend', '.env'),
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env')
];

let envLoaded = false;
for (const p of envPaths) {
    try {
        require('dotenv').config({ path: p });
        if (process.env.SUPABASE_URL) {
            envLoaded = true;
            console.log('--- Loaded env from:', p);
            break;
        }
    } catch (e) {}
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLesson() {
    const { data, error } = await supabase
        .from('lessons')
        .select('id, title, audio_url')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching lesson:', error);
    } else {
        console.log('Most recent lesson:', JSON.stringify(data, null, 2));
    }
}

checkLesson();
