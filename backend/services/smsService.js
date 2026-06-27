const logger = require('../utils/logger');

/**
 * Service to interface with the SMS Gateway.
 * Exposes methods to send OTP verification codes.
 */
const smsService = {
    /**
     * Sends an OTP to the given phone number.
     * In development/test mode or if no API key is configured, it falls back to mock mode.
     */
    sendOTP: async (phone, otp) => {
        const isMock = process.env.NODE_ENV === 'development' || 
                       process.env.NODE_ENV === 'test' || 
                       !process.env.SMS_GATEWAY_API_KEY;

        if (isMock) {
            logger.info({ phone, otp }, `[SMS Gateway] MOCK OTP Sent to ${phone}: ${otp}`);
            return { success: true, mock: true };
        }

        try {
            logger.info({ phone }, `[SMS Gateway] Sending real SMS OTP to ${phone}`);
            
            const provider = process.env.SMS_GATEWAY_PROVIDER || 'generic';
            const apiKey = process.env.SMS_GATEWAY_API_KEY;
            
            let response;
            
            if (provider === 'smsgatewayhub') {
                const senderId = process.env.SMS_GATEWAY_SENDER_ID || 'SMPLSH';
                const route = process.env.SMS_GATEWAY_ROUTE || '1';
                // SMSGatewayHub expects URL-encoded text
                const text = encodeURIComponent(`Your SIMPLISH verification OTP is ${otp}. Valid for 5 minutes.`);
                
                // Construct SMSGatewayHub API request URL
                const url = `https://www.smsgatewayhub.com/api/mt/SendSMS?APIKey=${apiKey}&senderid=${senderId}&channel=2&DCS=0&flashsms=0&number=${phone}&text=${text}&route=${route}`;
                
                response = await fetch(url, { method: 'GET' });
            } else {
                // Generic JSON POST Gateway
                const gatewayUrl = process.env.SMS_GATEWAY_URL || 'https://api.sms-gateway.com/send';
                response = await fetch(gatewayUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        to: phone,
                        message: `Your SIMPLISH verification OTP is ${otp}. Valid for 5 minutes.`
                    })
                });
            }

            if (!response.ok) {
                throw new Error(`SMS Gateway HTTP Error: ${response.status} ${response.statusText}`);
            }

            return { success: true, mock: false };
        } catch (error) {
            logger.error({ error, phone }, '[SMS Gateway] Failed to send SMS OTP');
            // If in non-production, fall back to mock instead of crashing
            if (process.env.NODE_ENV !== 'production') {
                return { success: true, mock: true, error: error.message };
            }
            throw error;
        }
    }
};

module.exports = smsService;
