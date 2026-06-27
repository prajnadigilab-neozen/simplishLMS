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
                const peid = process.env.SMS_GATEWAY_PEID;
                const templateId = process.env.SMS_GATEWAY_TEMPLATE_ID;
                const appName = process.env.SMS_GATEWAY_APP_NAME || 'SIMPLISH';
                
                // Formulate text using the approved template:
                // "To complete your new user registration for {#alphanumeric#}, use OTP {#numeric#}. Do not share this with anyone. - PRAJNA"
                const text = encodeURIComponent(`To complete your new user registration for ${appName}, use OTP ${otp}. Do not share this with anyone. - PRAJNA`);
                
                // Construct SMSGatewayHub API request URL
                let url = `https://www.smsgatewayhub.com/api/mt/SendSMS?APIKey=${apiKey}&senderid=${senderId}&channel=2&DCS=0&flashsms=0&number=${phone}&text=${text}&route=${route}`;
                
                if (peid) url += `&EntityId=${peid}`;
                if (templateId) url += `&dlttemplateid=${templateId}`;
                
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
                        message: `To complete your new user registration for ${process.env.SMS_GATEWAY_APP_NAME || 'SIMPLISH'}, use OTP ${otp}. Do not share this with anyone. - PRAJNA`
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
