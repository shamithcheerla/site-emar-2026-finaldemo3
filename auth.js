/**
 * =============================================
 * SITE-EMAR 2026 Conference Management System
 * Authentication Module
 * =============================================
 */

// =============================================
// 1. AUTHENTICATION FUNCTIONS
// =============================================

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object
 */
async function signUp(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin + '/login.html'
            }
        });

        if (error) throw error;

        console.log('✅ User signed up successfully');
        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Signup error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Log in existing user
 * @param {string} email - User email  
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object
 */
async function login(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ User logged in successfully');

        // Store user info in local storage
        if (data.user) {
            utils.saveToStorage('current_user', {
                id: data.user.id,
                email: data.user.email
            });

            // Check if user is admin
            const adminCheck = await isAdmin();

            // Get user record (including category)
            const userRecord = await getCurrentUserRecord();

            return {
                success: true,
                data: data,
                isAdmin: !!adminCheck,
                user: userRecord
            };
        }

        return { success: true, data: data, isAdmin: false, user: null };
    } catch (error) {
        console.error('❌ Login error:', error.message);
        return { success: false, error: error.message, message: error.message };
    }
}

/**
 * Log out current user
 * @returns {Promise<Object>} Result object
 */
async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        console.log('✅ User logged out successfully');

        // Clear local storage
        utils.removeFromStorage('current_user');

        // Redirect to login page
        window.location.href = '/login.html';

        return { success: true };
    } catch (error) {
        console.error('❌ Logout error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Reset password request
 * @param {string} email - User email
 * @returns {Promise<Object>} Result object
 */
async function resetPassword(email) {
    try {
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/login.html'
        });

        if (error) throw error;

        console.log('✅ Password reset email sent');
        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Password reset error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Result object
 */
async function updatePassword(newPassword) {
    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        console.log('✅ Password updated successfully');
        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Password update error:', error.message);
        return { success: false, error: error.message };
    }
}

// =============================================
// 2. SESSION MANAGEMENT
// =============================================

/**
 * Check if user is logged in
 * @returns {Promise<boolean>} True if logged in
 */
async function isLoggedIn() {
    try {
        const session = await window.auth.getCurrentSession();
        return session !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Check if current user is an admin
 * @returns {Promise<Object|null>} Admin record or null
 */
async function isAdmin() {
    try {
        const user = await window.auth.getCurrentUser();
        if (!user) return null;

        const { data, error } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('auth_id', user.id)
            .eq('is_active', true)
            .single();

        if (error) {
            // Not an admin
            return null;
        }

        return data;
    } catch (error) {
        return null;
    }
}

/**
 * Require authentication (redirect if not logged in)
 * @param {string} redirectUrl - URL to redirect to if not logged in
 */
async function requireAuth(redirectUrl = '/login.html') {
    const loggedIn = await isLoggedIn();

    if (!loggedIn) {
        utils.showError('Please log in to access this page');
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
        return false;
    }

    return true;
}

/**
 * Require admin access (redirect if not admin)
 * @param {string} redirectUrl - URL to redirect to if not admin
 */
async function requireAdmin(redirectUrl = '/index.html') {
    const admin = await isAdmin();

    if (!admin) {
        utils.showError('Admin access required');
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
        return false;
    }

    return true;
}

/**
 * Get current user's full record from database
 * @returns {Promise<Object|null>} User record or null
 */
async function getCurrentUserRecord() {
    try {
        const user = await window.auth.getCurrentUser();
        if (!user) return null;

        // Try to get from users table first
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .single();

        if (userData) {
            return userData;
        }

        // If not in users table, check admins table
        const { data: adminData, error: adminError } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('auth_id', user.id)
            .single();

        if (adminData) {
            return adminData;
        }

        return null;
    } catch (error) {
        console.error('Error getting user record:', error);
        return null;
    }
}

// =============================================
// 3. AUTH STATE LISTENERS
// =============================================

/**
 * Listen for auth state changes
 * @param {Function} callback - Callback function to execute on state change
 */
function onAuthStateChange(callback) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN') {
            console.log('User signed in');
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
        } else if (event === 'USER_UPDATED') {
            console.log('User updated');
        }

        if (callback && typeof callback === 'function') {
            callback(event, session);
        }
    });
}

// =============================================
// 4. LOGIN FORM HANDLER
// =============================================

/**
 * Initialize login form
 */
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!email || !password) {
            utils.showError('Please fill in all fields');
            return;
        }

        if (!utils.isValidEmail(email)) {
            utils.showError('Please enter a valid email address');
            return;
        }

        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logging in...';
        }

        try {
            const result = await login(email, password);

            if (result.success) {
                utils.showSuccess('Login successful! Redirecting...');

                // Check if admin
                const admin = await isAdmin();

                // Redirect based on role
                setTimeout(() => {
                    if (admin) {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/papersubmission.html';
                    }
                }, 1000);
            } else {
                utils.showError(result.error || 'Login failed');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Login';
                }
            }
        } catch (error) {
            utils.showError('An unexpected error occurred');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Login';
            }
        }
    });
}

/**
 * Initialize password reset form
 */
function initPasswordResetForm() {
    const resetForm = document.getElementById('passwordResetForm');
    if (!resetForm) return;

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('resetEmail')?.value;
        const submitBtn = resetForm.querySelector('button[type="submit"]');

        if (!email) {
            utils.showError('Please enter your email address');
            return;
        }

        if (!utils.isValidEmail(email)) {
            utils.showError('Please enter a valid email address');
            return;
        }

        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';
        }

        try {
            const result = await resetPassword(email);

            if (result.success) {
                utils.showSuccess('Password reset email sent! Check your inbox.');
                resetForm.reset();
            } else {
                utils.showError(result.error || 'Failed to send reset email');
            }
        } catch (error) {
            utils.showError('An unexpected error occurred');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Reset Link';
            }
        }
    });
}

/**
 * Initialize logout button
 */
function initLogoutButton() {
    const logoutBtns = document.querySelectorAll('[data-logout-btn]');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (utils.confirmAction('Are you sure you want to log out?')) {
                await logout();
            }
        });
    });
}

/**
 * Display user info in navbar
 */
async function displayUserInfo() {
    const userNameElement = document.getElementById('userName');
    if (!userNameElement) return;

    const user = await getCurrentUser();
    if (!user) {
        userNameElement.textContent = 'Guest';
        return;
    }

    const userRecord = await getCurrentUserRecord();
    if (userRecord) {
        userNameElement.textContent = userRecord.full_name || user.email;
    } else {
        userNameElement.textContent = user.email;
    }
}

// =============================================
// 6. EXPORTS
// =============================================

window.auth = {
    // Supabase Primitives (from supabaseClient.js)
    getCurrentUser: window.auth.getCurrentUser,
    getCurrentSession: window.auth.getCurrentSession,
    requireAuth: window.auth.requireAuth,
    isAdmin: window.auth.isAdmin,

    // Extended Helpers
    signUp,
    login,
    logout,
    resetPassword,
    updatePassword,
    isLoggedIn,
    getCurrentUserRecord,
    requireAdmin,
    onAuthStateChange,
    initLoginForm,
    initPasswordResetForm,
    initLogoutButton,
    displayUserInfo
};

// Ensure Auth is identical to auth
window.Auth = window.auth;

console.log('🔐 Auth library consolidated');