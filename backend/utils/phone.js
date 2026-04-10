/**
 * Normalizes Indian phone numbers to exactly 10 digits.
 * Strip +91, 91, and any other prefix if present.
 */
exports.normalizePhone = (phone) => {
    if (!phone) return null;
    // Remove all non-numeric characters
    let cleaned = phone.toString().replace(/\D/g, '');
    // If it's longer than 10 digits, assume it has a prefix (like 91) and take the last 10
    if (cleaned.length > 10) {
        return cleaned.slice(-10);
    }
    return cleaned;
};
