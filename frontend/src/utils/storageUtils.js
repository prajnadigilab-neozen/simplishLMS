/**
 * Safe LocalStorage Utilities (Scenario 3: Low Storage)
 * Handles QuotaExceededError and other storage failures gracefully.
 */

export const safeSetItem = (key, value) => {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
        return true;
    } catch (e) {
        console.error(`LocalStorage SafeSet failed for key [${key}]:`, e);
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('Storage quota exceeded. Clearing non-critical session data...');
            // Clear less important keys
            localStorage.removeItem('simplish_active_lesson');
            // Try again
            try {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                return true;
            } catch (err) {
                return false;
            }
        }
        return false;
    }
};

export const safeGetItem = (key, parse = false) => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        return parse ? JSON.parse(item) : item;
    } catch (e) {
        console.error(`LocalStorage SafeGet failed for key [${key}]:`, e);
        return null;
    }
};

export const safeRemoveItem = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
};
