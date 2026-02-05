/**
 * =============================================
 * SITE-EMAR 2026 Conference Management System
 * Utility Functions
 * =============================================
 */

// =============================================
// 0. GLOBAL CONSTANTS
// =============================================
const ADMIN_EMAIL = 'convener.siteemar2026@sasi.ac.in'; // Updated admin email

// =============================================
// 0.1 EMAILJS CONFIGURATION
// =============================================
// 0.1 EMAILJS CONFIGURATION
// =============================================
// TODO: User must replace these with their actual EmailJS credentials
const EMAILJS_SERVICE_ID = 'service_rmksvdn'; // Corrected from likely copy-paste error
const EMAILJS_TEMPLATE_ID = 'template_lfsiltc';
const EMAILJS_PUBLIC_KEY = 'mDhKwcR0qubVGhPLZ';

// =============================================
// 1. DATE & TIME FORMATTERS
// =============================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    if (!date) return 'N/A';

    const d = new Date(date);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
}

/**
 * Format datetime to readable string
 * @param {string|Date} datetime - Datetime to format
 * @returns {string} Formatted datetime
 */
function formatDateTime(datetime) {
    if (!datetime) return 'N/A';

    const d = new Date(datetime);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return d.toLocaleString('en-IN', options);
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to get relative time for
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
    if (!date) return 'N/A';

    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

    return formatDate(date);
}

// =============================================
// 2. CURRENCY & NUMBER FORMATTERS
// =============================================

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (INR, USD)
 * @returns {string} Formatted currency
 */
function formatCurrency(amount, currency = 'INR') {
    if (!amount && amount !== 0) return 'N/A';

    const symbols = {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£'
    };

    const symbol = symbols[currency] || currency;
    const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

    return `${symbol} ${formatted}`;
}

/**
 * Format file size in bytes to readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================
// 3. FORM VALIDATION
// =============================================

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
    const regex = /^[+]?[\d\s-()]{10,15}$/;
    return regex.test(phone);
}

/**
 * Validate file type
 * @param {string} fileName - File name
 * @param {Array} allowedTypes - Array of allowed extensions (e.g., ['.pdf', '.doc'])
 * @returns {boolean} True if valid
 */
function isValidFileType(fileName, allowedTypes = ['.pdf', '.doc', '.docx']) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return allowedTypes.includes(extension);
}

/**
 * Validate file size
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if valid
 */
function isValidFileSize(fileSize, maxSizeMB = 10) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxBytes;
}

// =============================================
// 4. UI HELPERS
// =============================================

/**
 * Show loading spinner
 * @param {HTMLElement} element - Element to show spinner in
 */
function showLoading(element) {
    if (!element) return;

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-border text-danger" role="status">
            <span class="sr-only">Loading...</span>
        </div>
    `;
    element.innerHTML = '';
    element.appendChild(spinner);
}

/**
 * Hide loading spinner
 * @param {HTMLElement} element - Element to hide spinner from
 * @param {string} content - Content to replace spinner with
 */
function hideLoading(element, content = '') {
    if (!element) return;
    element.innerHTML = content;
}

/**
 * Show success message
 * @param {string} message - Success message
 * @param {number} duration - Duration in ms (default 3000)
 */
function showSuccess(message, duration = 3000) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, duration);
}

/**
 * Show error message
 * @param {string} message - Error message
 * @param {number} duration - Duration in ms (default 5000)
 */
function showError(message, duration = 5000) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        <strong>Error:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, duration);
}

/**
 * Show info message
 * @param {string} message - Info message
 * @param {number} duration - Duration in ms (default 3000)
 */
function showInfo(message, duration = 3000) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-info alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, duration);
}

/**
 * Confirm action with user
 * @param {string} message - Confirmation message
 * @returns {boolean} True if confirmed
 */
function confirmAction(message) {
    return confirm(message);
}

// =============================================
// 5. STRING HELPERS
// =============================================

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert status to badge HTML
 * @param {string} status - Status string
 * @returns {string} Badge HTML
 */
function getStatusBadge(status) {
    const statusMap = {
        'pending': 'warning',
        'under_review': 'info',
        'accepted': 'success',
        'rejected': 'danger',
        'revision_required': 'secondary',
        'completed': 'success',
        'failed': 'danger',
        'processing': 'info'
    };

    const badgeClass = statusMap[status] || 'secondary';
    const displayText = capitalize(status.replace(/_/g, ' '));

    return `<span class="badge bg-${badgeClass}">${displayText}</span>`;
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// =============================================
// 6. DATA HELPERS
// =============================================

/**
 * Safely parse JSON
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
function safeJSONParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON parse error:', error);
        return defaultValue;
    }
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if empty
 */
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

// =============================================
// 7. LOCAL STORAGE HELPERS
// =============================================

/**
 * Save to local storage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

/**
 * Load from local storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
}

/**
 * Remove from local storage
 * @param {string} key - Storage key
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from storage:', error);
    }
}

// =============================================
// 8. DEBOUNCE & THROTTLE
// =============================================

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =============================================
// 9. NOTIFICATION HELPERS
// =============================================

/**
 * Initialize EmailJS
 */
function initEmailJS() {
    if (window.emailjs) return; // Already loaded

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;
    script.onload = () => {
        console.log('📧 EmailJS script loaded');
        if (EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
            emailjs.init(EMAILJS_PUBLIC_KEY);
            console.log('📧 EmailJS initialized');
        } else {
            console.warn('⚠️ EmailJS Public Key not set. Emails will not be sent.');
        }
    };
    document.head.appendChild(script);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initEmailJS);

/**
 * Send notification to a user using Mailto
 * @param {string} email - Recipient email
 * @param {Object} options - Notification options
 */
async function sendUserNotification(email, options) {
    try {
        console.log(`✉️ Opening email client for user: ${email}`);

        // 1. Log to Database (Backup)
        await window.supabaseClient
            .from('email_notifications')
            .insert([{
                recipient_email: email,
                recipient_name: options.recipientName || '',
                subject: options.subject,
                body: options.body,
                type: options.type || 'general',
                status: 'opened_client',
                sent_at: new Date().toISOString()
            }]);

        // 2. Open User's Email Client
        const subject = encodeURIComponent(options.subject);
        const body = encodeURIComponent(options.body);
        const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;

        // Open in new tab to avoid disrupting current page
        window.open(mailtoLink, '_blank');

        return true;
    } catch (error) {
        console.error('Error in sendUserNotification:', error);
        return false;
    }
}

/**
 * Send notification to admins using Mailto
 * @param {Object} options - Notification options
 */
async function sendAdminNotification(options) {
    try {
        console.log(`✉️ Opening email client for admin notification`);

        // 1. Log to Database (Backup)
        await window.supabaseClient
            .from('email_notifications')
            .insert([{
                recipient_email: ADMIN_EMAIL,
                recipient_name: 'Admin',
                subject: options.subject,
                body: options.body,
                type: 'admin_' + (options.type || 'alert'),
                status: 'opened_client',
                sent_at: new Date().toISOString()
            }]);

        // 2. Open User's Email Client to send TO Admin
        const subject = encodeURIComponent(options.subject);
        const body = encodeURIComponent(options.body);
        const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;

        // Open in new tab
        window.open(mailtoLink, '_blank');

        return true;
    } catch (error) {
        console.error('Error in sendAdminNotification:', error);
        return false;
    }
}

// =============================================
// 10. EXPORTS
// =============================================

// Make all functions globally available
window.utils = {
    // Date & Time
    formatDate,
    formatDateTime,
    getRelativeTime,

    // Currency & Numbers
    formatCurrency,
    formatFileSize,

    // Validation
    isValidEmail,
    isValidPhone,
    isValidFileType,
    isValidFileSize,

    // UI
    showLoading,
    hideLoading,
    showSuccess,
    showError,
    showInfo,
    confirmAction,

    // String
    capitalize,
    getStatusBadge,
    truncateText,

    // Data
    safeJSONParse,
    deepClone,
    isEmpty,

    // Storage
    saveToStorage,
    loadFromStorage,
    removeFromStorage,

    // Performance
    debounce,

    // Notifications
    sendUserNotification,
    sendAdminNotification,
    ADMIN_EMAIL
};

console.log('🛠️ Utils library loaded');