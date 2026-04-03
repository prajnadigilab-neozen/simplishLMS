const supabase = require('./config/supabase');
require('dotenv').config();

async function setSettings() {
    const settings = [
        { key: 'topup_price', value: '99' },
        { key: 'topup_amount', value: '99' },
        { key: 'topup_duration_days', value: '30' }
    ];

    console.log('Updating Global Settings...');
    for (const { key, value } of settings) {
        const { error } = await supabase
            .from('settings')
            .upsert({ key, value }, { onConflict: 'key' });
        
        if (error) {
            console.error(`Error setting ${key}:`, error.message);
        } else {
            console.log(`✅ Successfully set ${key} to ${value}`);
        }
    }
    console.log('Configuration complete.');
    process.exit(0);
}

setSettings();
