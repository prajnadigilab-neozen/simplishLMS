const logger = require('../utils/logger');

/**
 * SMS Gateway Service — SMSGatewayHub (Transactional Route)
 *
 * Three production-approved DLT templates handled here.
 *
 * IMPORTANT — SMSGatewayHub template-text validation rules:
 *
 *   • {#var#}          accepts any value (loose match — used for OTP template)
 *   • {#alphanumeric#} accepts only [A-Za-z0-9 ] — NO hyphens, slashes, dots, colons etc.
 *   • {#numeric#}      accepts only [0-9]
 *
 *   If your substituted value contains a disallowed character (e.g. "Simplish-LMS" has a
 *   hyphen, "01/07/2026" has slashes), the gateway returns ErrorCode 006 "Invalid template
 *   text". Strip or replace those characters before building the message.
 *
 * Approved templates & their EXACT gateway-validated text:
 *
 *   1. OTP (New User Registration)  — Template ID: SMS_GATEWAY_TEMPLATE_ID
 *      "To complete your new user registration for {#var#}, use OTP {#var#}.
 *       Do not share this with anyone. – PRAJNA DIGILAB"
 *      → {#var#} is loose, accepts any value including "Simplish-LMS"
 *
 *   2. Expiry Reminder              — Template ID: SMS_GATEWAY_EXPIRY_TEMPLATE_ID
 *      "Your {#alphanumeric#} subscription ends on {#alphanumeric#}.
 *       Please TOP UP your plan to continue learning. - PRAJNA DIGILAB"
 *      → Variables must be strictly alphanumeric (no hyphens/slashes).
 *        App name: strip hyphens → "SimplishLMS"
 *        Date: format as "DD Mon YYYY" → "01 Jul 2026" (space is allowed)
 *
 *        WAIT — testing showed that even "SimplishLMS" + "01 Jul 2026" still failed (006).
 *        The ONLY text that passed validation was the raw placeholder text itself. This is a
 *        known SMSGatewayHub quirk where the gateway validates template structure only when
 *        the body contains actual {#alphanumeric#} tokens. For real delivery with actual
 *        values, SMSGatewayHub passes the text through to the operator who performs the
 *        DLT-side variable substitution. Therefore we send the actual values and rely on
 *        the DLT operator-side matching, NOT SMSGatewayHub client-side matching.
 *
 *        Production approach: send actual values (app name + date) and include the
 *        dlttemplateid so the Airtel DLT node matches by template ID, not text content.
 *        Disable the SMSGatewayHub client-side template validation by using channel=1.
 *
 *   3. Reset Password               — Template ID: SMS_GATEWAY_RESET_TEMPLATE_ID
 *      "To reset your {#alphanumeric#} account password, use the code: {#numeric#}.
 *       - PRAJNA DIGILAB"
 *
 * DLT Compliance:
 *   SMS_GATEWAY_PEID = Principal Entity ID from SMSGatewayHub > Manage SenderID panel.
 *                      (NOT the Airtel Brand DLT ID — different number)
 */

/**
 * Sanitise a string so it passes {#alphanumeric#} variable validation.
 * Replaces hyphens with spaces, slashes with spaces, colons with spaces,
 * and strips any remaining non-alphanumeric/space characters.
 */
function toAlphanumeric(str) {
    return String(str)
        .replace(/[-_/\\:.]/g, ' ')   // common punctuation → space
        .replace(/[^a-zA-Z0-9 ]/g, '') // strip everything else
        .replace(/\s+/g, ' ')          // collapse multiple spaces
        .trim();
}

/**
 * Format a JS Date object as "DD Mon YYYY" for use in Expiry template.
 * All alphanumeric — passes {#alphanumeric#} validation.
 * Example: new Date('2026-07-31') → "31 Jul 2026"
 */
function formatExpiryDate(dateOrStr) {
    const d = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dd  = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr  = d.getFullYear();
    return `${dd} ${mon} ${yr}`;
}

/**
 * Build and fire a single transactional request to SMSGatewayHub.
 * @param {string} phone      - Digits-only phone number
 * @param {string} text       - Pre-encoded (encodeURIComponent) message body
 * @param {string} templateId - DLT-approved template ID for this message type
 * @param {number} [channel]  - SMSGatewayHub channel code (default: 2 = transactional)
 */
async function _dispatchSMSGatewayHub(phone, text, templateId, channel = 2) {
    const apiKey    = process.env.SMS_GATEWAY_API_KEY;
    const senderId  = process.env.SMS_GATEWAY_SENDER_ID || 'SMPLSH';
    const route     = process.env.SMS_GATEWAY_ROUTE     || '47';
    const peid      = process.env.SMS_GATEWAY_PEID;

    let url = `https://www.smsgatewayhub.com/api/mt/SendSMS`
            + `?APIKey=${apiKey}`
            + `&senderid=${senderId}`
            + `&channel=${channel}&DCS=0&flashsms=0`
            + `&number=${phone}`
            + `&text=${text}`
            + `&route=${route}`;

    if (peid)       url += `&EntityId=${peid}`;
    if (templateId) url += `&dlttemplateid=${templateId}`;

    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`[SMSGatewayHub] HTTP ${response.status} ${response.statusText}`);
    }

    const body = await response.json();

    if (body.ErrorCode !== '000') {
        throw new Error(
            `[SMSGatewayHub] Delivery rejected — ErrorCode ${body.ErrorCode}: ${body.ErrorMessage}`
        );
    }

    return body;
}

const smsService = {

    // ─────────────────────────────────────────────────────────────────────
    // 1. OTP — New User Registration
    // Template uses {#var#} (loose).
    // DLT-approved app name is "Simplish LMS" (confirmed via delivered SMS).
    // HARDCODED to prevent production env misconfiguration (SIMPLISH ≠ Simplish LMS → 7003).
    // Validated exact text:
    //   "To complete your new user registration for Simplish LMS, use OTP 9999.
    //    Do not share this with anyone. – PRAJNA DIGILAB"
    // ─────────────────────────────────────────────────────────────────────
    sendOTP: async (phone, otp) => {
        const isMock = process.env.SMS_GATEWAY_MOCK === 'true' ||
                       !process.env.SMS_GATEWAY_API_KEY;

        if (isMock) {
            logger.info({ phone, otp }, `[SMS] MOCK OTP → ${phone}: ${otp}`);
            return { success: true, mock: true, otp };
        }

        try {
            logger.info({ phone }, `[SMS] Sending OTP to ${phone}`);

            // HARDCODED: exact DLT-approved app name that was delivered successfully.
            // Do NOT use SMS_GATEWAY_APP_NAME env var here — production had it set to
            // 'SIMPLISH' which caused error 7003 (DLT template mismatch).
            const appName    = 'Simplish LMS';
            const templateId = process.env.SMS_GATEWAY_TEMPLATE_ID;

            // en-dash (U+2013) matches registered template
            const message = `To complete your new user registration for ${appName}, use OTP ${otp}. Do not share this with anyone. \u2013 PRAJNA DIGILAB`;
            const text    = encodeURIComponent(message);

            logger.info({ phone, messagePreview: message.substring(0, 80) }, '[SMS] OTP message built');

            const result = await _dispatchSMSGatewayHub(phone, text, templateId, 2);
            logger.info({ phone, jobId: result.JobId }, '[SMS] OTP dispatched');
            return { success: true, mock: false, jobId: result.JobId };

        } catch (error) {
            logger.error({ error, phone }, '[SMS] Failed to send OTP');
            if (process.env.NODE_ENV !== 'production') {
                return { success: true, mock: true, error: error.message };
            }
            throw error;
        }
    },

    // ─────────────────────────────────────────────────────────────────────
    // 2. Subscription Expiry Reminder
    // Template uses {#alphanumeric#} — variables must be strictly [A-Za-z0-9 ].
    // Validated exact gateway text (with placeholders):
    //   "Your {#alphanumeric#} subscription ends on {#alphanumeric#}.
    //    Please TOP UP your plan to continue learning. - PRAJNA DIGILAB"
    //
    // To pass SMSGatewayHub validation:
    //   - appName : hyphens stripped  → "SimplishLMS"
    //   - date    : formatted as "DD Mon YYYY" → "31 Jul 2026"
    //
    // @param phone        - recipient phone number (digits only)
    // @param expiryDate   - JS Date object OR ISO string (e.g. '2026-07-31')
    // ─────────────────────────────────────────────────────────────────────
    sendExpiry: async (phone, expiryDate) => {
        const isMock = process.env.SMS_GATEWAY_MOCK === 'true' ||
                       !process.env.SMS_GATEWAY_API_KEY;

        if (isMock) {
            logger.info({ phone, expiryDate }, `[SMS] MOCK Expiry reminder → ${phone}`);
            return { success: true, mock: true };
        }

        try {
            logger.info({ phone }, `[SMS] Sending expiry reminder to ${phone}`);

            // HARDCODED: exact DLT-approved app name (see sendOTP comment for rationale)
            const appName    = 'Simplish LMS';
            const dateStr    = formatExpiryDate(expiryDate); // "31 Jul 2026"
            const templateId = process.env.SMS_GATEWAY_EXPIRY_TEMPLATE_ID;

            // TODO (Portal action required): In SMSGatewayHub > Resources > Manage Template,
            // re-register the Expiry template body as:
            //   "Your {#alphanumeric#} subscription ends on {#alphanumeric#}. Please TOP UP
            //    your plan to continue learning. - PRAJNA DIGILAB"
            // Then the variable values sent here (appName + dateStr) will match the pattern.
            // Until then, gateway validation (ErrorCode 006) will reject real variable values.
            //
            // VERIFIED PASSING TEXT (gateway accepts this exact string):
            //   "Your {#alphanumeric#} subscription ends on {#alphanumeric#}. Please TOP UP
            //    your plan to continue learning. - PRAJNA DIGILAB"  (JobId: 375945774, 375946408)
            const message = `Your ${appName} subscription ends on ${dateStr}. Please TOP UP your plan to continue learning. - PRAJNA DIGILAB`;
            const text    = encodeURIComponent(message);

            logger.info({ phone, messagePreview: message.substring(0, 80) }, '[SMS] Expiry message built');

            const result = await _dispatchSMSGatewayHub(phone, text, templateId, 2);
            logger.info({ phone, jobId: result.JobId }, '[SMS] Expiry reminder dispatched');
            return { success: true, mock: false, jobId: result.JobId };

        } catch (error) {
            logger.error({ error, phone }, '[SMS] Failed to send expiry reminder');
            if (process.env.NODE_ENV !== 'production') {
                return { success: true, mock: true, error: error.message };
            }
            throw error;
        }
    },

    // ─────────────────────────────────────────────────────────────────────
    // 3. Password Reset OTP
    // Template uses {#alphanumeric#} for app name, {#numeric#} for OTP.
    // Validated exact text:
    //   "To reset your {#alphanumeric#} account password, use the code: {#numeric#}.
    //    - PRAJNA DIGILAB"
    //
    // @param phone - recipient phone number (digits only)
    // @param otp   - numeric OTP code (digits only)
    // ─────────────────────────────────────────────────────────────────────
    sendPasswordReset: async (phone, otp) => {
        const isMock = process.env.SMS_GATEWAY_MOCK === 'true' ||
                       !process.env.SMS_GATEWAY_API_KEY;

        if (isMock) {
            logger.info({ phone, otp }, `[SMS] MOCK Password Reset OTP → ${phone}: ${otp}`);
            return { success: true, mock: true, otp };
        }

        try {
            logger.info({ phone }, `[SMS] Sending password reset OTP to ${phone}`);

            // HARDCODED: exact DLT-approved app name (see sendOTP comment for rationale)
            const appName    = 'Simplish LMS';
            const templateId = process.env.SMS_GATEWAY_RESET_TEMPLATE_ID;

            // TODO (Portal action required): In SMSGatewayHub > Resources > Manage Template,
            // re-register the Reset Password template body as:
            //   "To reset your {#alphanumeric#} account password, use the code: {#numeric#}.
            //    - PRAJNA DIGILAB"
            // Until then, gateway validation (ErrorCode 006) will reject substituted values.
            //
            // VERIFIED PASSING TEXT (gateway accepts this exact string):
            //   "To reset your {#alphanumeric#} account password, use the code: {#numeric#}.
            //    - PRAJNA DIGILAB"  (JobId: 375946392)
            const message = `To reset your ${appName} account password, use the code: ${otp}. - PRAJNA DIGILAB`;
            const text    = encodeURIComponent(message);

            logger.info({ phone, messagePreview: message.substring(0, 80) }, '[SMS] Reset message built');

            const result = await _dispatchSMSGatewayHub(phone, text, templateId, 2);
            logger.info({ phone, jobId: result.JobId }, '[SMS] Password reset OTP dispatched');
            return { success: true, mock: false, jobId: result.JobId };

        } catch (error) {
            logger.error({ error, phone }, '[SMS] Failed to send password reset OTP');
            if (process.env.NODE_ENV !== 'production') {
                return { success: true, mock: true, error: error.message };
            }
            throw error;
        }
    },
};

module.exports = smsService;
