/**
 * PII Masking Utility
 * Supports PCI DSS 4.0 'Least Privilege' requirements.
 */

/**
 * Mask a phone number, showing only the last 4 digits.
 * Example: +919876543210 -> *******3210
 */
const maskPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return 'N/A';
    const last4 = phone.slice(-4);
    return '*'.repeat(Math.max(0, phone.length - 4)) + last4;
};

/**
 * Mask an email address.
 * Example: john.doe@example.com -> j***e@example.com
 */
const maskEmail = (email) => {
    if (!email || typeof email !== 'string') return 'N/A';
    const [name, domain] = email.split('@');
    if (!domain) return 'N/A';
    if (name.length <= 2) return `*@${domain}`;
    return `${name[0]}${'*'.repeat(name.length - 2)}${name.slice(-1)}@${domain}`;
};

/**
 * Mask a UUID or generic ID.
 * Example: 550e8400-e29b-41d4-a716-446655440000 -> ********0000
 */
const maskId = (id) => {
    if (!id || typeof id !== 'string') return 'N/A';
    return '*'.repeat(8) + id.slice(-4);
};

module.exports = { maskPhone, maskEmail, maskId };
