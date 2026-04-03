const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

module.exports = razorpay;
