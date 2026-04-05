const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('--- Checking Database Tables ---');

  // Check Users
  const { data: users, error: usersError } = await supabase.from('users').select('id, email, phone').limit(5);
  if (usersError) console.error('Users Table Error:', usersError.message);
  else console.log('Users Table: OK', users.length, 'records found');

  // Check Settings
  const { data: settings, error: settingsError } = await supabase.from('settings').select('*');
  if (settingsError) console.error('Settings Table Error:', settingsError.message);
  else console.log('Settings Table: OK', settings.length, 'records found');

  // Check Payments
  const { data: payments, error: paymentsError } = await supabase.from('payments').select('*').limit(5);
  if (paymentsError) console.error('Payments Table Error:', paymentsError.message);
  else console.log('Payments Table: OK', payments.length, 'records found');

  // Check if Razorpay keys are set
  console.log('Razorpay Key ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET');
  console.log('Razorpay Key Secret:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET');
}

checkDatabase();
