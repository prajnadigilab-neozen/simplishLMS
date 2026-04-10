const supabase = require('./backend/config/supabase');
async function test() {
    const { data, error } = await supabase.from('payments').select('*').limit(1);
    if (error) {
        console.error('Error fetching payments:', error);
    } else {
        console.log('Payment Columns:', Object.keys(data[0] || {}));
    }
}
test();
