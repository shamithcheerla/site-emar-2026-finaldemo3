/**
 * =============================================
 * SITE-EMAR 2026 Conference Management System
 * Registration Module
 * =============================================
 */

// =============================================
// 1. GLOBAL VARIABLES
// =============================================

// Variables are managed globally by registration.html to sync with UI
// currentCurrency, selectedAmount are used from the page scope
let registrationData = {};

// =============================================
// 2. REGISTRATION FORM HANDLER
// =============================================

/**
 * Download abstract template
 */
function downloadTemplate() {
    const link = document.createElement('a');
    link.href = 'SITE-EMAR 2026 Abstract Template.doc';
    link.download = 'SITE-EMAR 2026 Abstract Template.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Download manuscript template
 */
function downloadManuscriptTemplate() {
    const link = document.createElement('a');
    link.href = 'site_emar_2026_manuscript-template.doc';
    link.download = 'site_emar_2026_manuscript-template.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Submit registration data to database
 * @param {Object} formData - Form data object
 * @returns {Promise<Object

>} Result object
 */
async function submitRegistration(formData) {
    try {
        console.log('📝 Submitting registration...', formData);

        // 1. Create auth user (REQUIRED for login)
        let authUserId = null;
        if (formData.password) {
            console.log('Creating auth account...');
            const authResult = await window.Auth.signUp(formData.email, formData.password);

            if (!authResult.success) {
                throw new Error('Failed to create account: ' + authResult.error);
            }

            authUserId = authResult.data.user.id;
            console.log('✅ Auth account created:', authUserId);
        } else {
            throw new Error('Password is required for registration');
        }

        // 2. Insert user record into database
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .insert([{
                auth_id: authUserId,
                title: formData.title,
                full_name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                affiliation: formData.affiliation,
                designation: formData.designation,
                address: formData.address,
                country: formData.country,
                city: formData.city || '',
                category: formData.category,
                registration_fee: formData.amount,
                currency: formData.currency,
                payment_completed: false,
                newsletter_subscribed: formData.newsletter || false
            }])
            .select()
            .single();

        if (userError) throw userError;

        console.log('✅ User registered:', userData);

        // 3. Send confirmation email to user (Disabled per user request)
        // await sendRegistrationConfirmationEmail(userData);

        // 4. Send notification to admin (Disabled - Admin initiates emails)
        // await sendAdminRegistrationNotification(userData);

        return { success: true, data: userData };

    } catch (error) {
        console.error('❌ Registration error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Process payment via Razorpay
 * @param {Object} userData - User data
 * @param {number} amount - Payment amount
 * @param {string} currency - Currency code
 * @returns {Promise<Object>} Result object
 */
async function processPayment(userData, amount, currency) {
    return new Promise((resolve, reject) => {
        try {
            const options = {
                key: 'YOUR_RAZORPAY_KEY_ID', // TODO: Replace with actual Razorpay key from dashboard.razorpay.com
                amount: Math.round(amount * 100), // Amount in paise/cents
                currency: currency,
                name: 'SITE-EMAR 2026',
                description: `Registration Fee - ${userData.category}`,
                image: 'sasi.png',
                prefill: {
                    name: userData.full_name,
                    email: userData.email,
                    contact: userData.phone
                },
                theme: {
                    color: '#D32F2F'
                },
                handler: async function (response) {
                    // Payment successful
                    console.log('✅ Payment successful:', response);

                    // Save payment record
                    const paymentResult = await savePaymentRecord(
                        userData.id,
                        amount,
                        currency,
                        userData.category,
                        response
                    );

                    if (paymentResult.success) {
                        // Update user payment status
                        await updateUserPaymentStatus(userData.id, true);

                        // Send payment confirmation email (Disabled - Admin initiates emails)
                        // await sendPaymentConfirmationEmail(userData, paymentResult.data);

                        resolve({ success: true, data: response });
                    } else {
                        reject(new Error('Failed to save payment record'));
                    }
                },
                modal: {
                    ondismiss: function () {
                        reject(new Error('Payment cancelled by user'));
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error('❌ Payment error:', error);
            reject(error);
        }
    });
}

/**
 * Save payment record to database
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount
 * @param {string} currency - Currency code
 * @param {string} category - User category
 * @param {Object} razorpayResponse - Razorpay response
 * @returns {Promise<Object>} Result object
 */
async function savePaymentRecord(userId, amount, currency, category, razorpayResponse) {
    try {
        // Get user email from the user record
        const { data: userData } = await supabaseClient
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

        const { data, error } = await supabaseClient
            .from('payments')
            .insert([{
                user_id: userId,
                user_email: userData?.email || '',
                amount: amount,
                currency: currency,
                category: category,
                payment_method: 'razorpay',
                razorpay_order_id: razorpayResponse.razorpay_order_id || null,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature || null,
                status: 'completed',
                payment_date: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Payment record saved:', data);
        return { success: true, data: data };

    } catch (error) {
        console.error('❌ Error saving payment:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Update user payment status
 * @param {string} userId - User ID
 * @param {boolean} completed - Payment completed status
 * @returns {Promise<boolean>} Success status
 */
async function updateUserPaymentStatus(userId, completed) {
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({
                payment_completed: completed,
                payment_method: 'razorpay'
            })
            .eq('id', userId);

        if (error) throw error;

        console.log('✅ User payment status updated');
        return true;

    } catch (error) {
        console.error('❌ Error updating payment status:', error.message);
        return false;
    }
}

// =============================================
// 3. EMAIL NOTIFICATIONS
// =============================================

/**
 * Send registration confirmation email to user
 * @param {Object} userData - User data
 */
async function sendRegistrationConfirmationEmail(userData) {
    try {
        const paymentStatus = userData.payment_completed
            ? 'Your payment has been received and confirmed.'
            : 'Please complete your payment to finalize your registration.';

        const emailBody = `Dear ${userData.title} ${userData.full_name},

Thank you for registering for SITE-EMAR 2026!

Registration Details:
- Name: ${userData.full_name}
- Email: ${userData.email}
- Category: ${utils.capitalize(userData.category)}
- Registration Fee: ${utils.formatCurrency(userData.registration_fee, userData.currency)}

${paymentStatus}

Important Dates:
- Paper Submission Deadline: March 31, 2026
- Conference Dates: To be announced

For any queries, please contact us at: ${window.utils.ADMIN_EMAIL}

Best regards,
SITE-EMAR 2026 Organizing Committee`;

        await sendUserNotification(userData.email, {
            recipientName: userData.full_name,
            type: 'registration_confirmation',
            subject: 'Registration Confirmation - SITE-EMAR 2026',
            body: emailBody
        });

    } catch (error) {
        console.error('Error sending registration email:', error);
    }
}

/**
 * Send registration notification to admin
 * @param {Object} userData - User data
 */
async function sendAdminRegistrationNotification(userData) {
    try {
        const emailBody = `New registration received:

Name: ${userData.title} ${userData.full_name}
Email: ${userData.email}
Phone: ${userData.phone}
Affiliation: ${userData.affiliation}
Designation: ${userData.designation}
Category: ${utils.capitalize(userData.category)}
Registration Fee: ${utils.formatCurrency(userData.registration_fee, userData.currency)}
Payment Status: ${userData.payment_completed ? 'Completed' : 'Pending'}

Registered at: ${utils.formatDateTime(userData.created_at)}`;

        await sendAdminNotification({
            type: 'new_registration',
            subject: 'New Registration - SITE-EMAR 2026',
            body: emailBody
        });

    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
}

/**
 * Send payment confirmation email
 * @param {Object} userData - User data
 * @param {Object} paymentData - Payment data
 */
async function sendPaymentConfirmationEmail(userData, paymentData) {
    try {
        const emailBody = `Dear ${userData.title} ${userData.full_name},

Your payment has been successfully received!

Payment Details:
- Amount: ${utils.formatCurrency(paymentData.amount, paymentData.currency)}
- Payment ID: ${paymentData.razorpay_payment_id}
- Payment Date: ${utils.formatDateTime(paymentData.payment_date)}
- Payment Method: Razorpay

Your registration is now complete. You will receive further updates about the conference via email.

For any queries, please contact us at: ${window.utils.ADMIN_EMAIL}

Best regards,
SITE-EMAR 2026 Organizing Committee`;

        await sendUserNotification(userData.email, {
            recipientName: userData.full_name,
            type: 'payment_confirmation',
            subject: 'Payment Received - SITE-EMAR 2026',
            body: emailBody
        });

    } catch (error) {
        console.error('Error sending payment confirmation:', error);
    }
}

// =============================================
// 4. FORM INITIALIZATION
// =============================================

/**
 * Initialize registration form
 */
function initRegistrationForm() {
    const regForm = document.getElementById('regForm');
    if (!regForm) {
        console.warn('⚠️ Registration form (regForm) not found');
        return;
    }

    console.log('✅ Found registration form, initializing handlers...');

    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🚀 Registration form submitted');

        // Check terms and conditions
        const termsChecked = document.getElementById('terms')?.checked;
        if (!termsChecked) {
            alert('Please agree to the Terms & Conditions.');
            return;
        }

        // Collect form data
        const rawCategory = document.querySelector('input[name="category"]:checked')?.value;

        // Normalize category for database check constraint
        // Map scholar -> student and expert -> scientist as scholar/expert fail constraint
        let normalizedCategory = rawCategory;
        if (rawCategory?.startsWith('listener_')) {
            normalizedCategory = 'listener';
        } else if (rawCategory === 'scholar') {
            normalizedCategory = 'student';
        } else if (rawCategory === 'expert') {
            normalizedCategory = 'scientist';
        }

        const formData = {
            title: document.querySelector('input[name="title"]:checked')?.value,
            fullName: document.getElementById('fullName')?.value,
            email: document.getElementById('email')?.value,
            phone: document.getElementById('phone')?.value,
            affiliation: document.getElementById('affiliation')?.value,
            designation: document.querySelector('input[name="designation"]:checked')?.value,
            address: document.getElementById('address')?.value,
            country: document.getElementById('country')?.value,
            city: document.getElementById('city')?.value,
            category: normalizedCategory,
            amount: selectedAmount, // Uses the global selectedAmount from registration.html
            currency: currentCurrency, // Uses the global currentCurrency from registration.html
            newsletter: document.getElementById('newsletter')?.checked,
            password: document.getElementById('password')?.value,
            confirmPassword: document.getElementById('confirmPassword')?.value
        };

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }



        // Validate form basic requirements
        if (!validateRegistrationForm(formData)) {
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
        }

        try {
            // Step 1: Submit registration to Supabase
            console.log('📡 Sending data to Supabase...');
            const result = await submitRegistration(formData);

            if (result.success) {
                registrationData = result.data;
                console.log('✅ Registration successful:', registrationData);

                // Step 2: Set current user session in localStorage for immediate access
                localStorage.setItem('currentUser', JSON.stringify({
                    id: registrationData.id,
                    auth_id: registrationData.auth_id,
                    email: registrationData.email,
                    full_name: registrationData.full_name,
                    role: 'user'
                }));

                const userId = registrationData.id;





                // Step 4: Show success UI
                const regIdSpan = document.getElementById('regId');
                if (regIdSpan) regIdSpan.textContent = registrationData.id;

                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.style.display = 'flex';
                    if (typeof startConfetti === 'function') startConfetti();
                } else {
                    alert('Registration Successful! Redirecting...');
                }

                // Step 5: Redirect after delay (Only for authors)
                setTimeout(() => {
                    const category = document.querySelector('input[name="category"]:checked')?.value;
                    if (category && category.startsWith('listener')) {
                        console.log('💡 Listener registration complete. Allowing manual navigation.');
                        // Listeners stay on the success modal
                    } else {
                        window.location.href = 'papersubmission.html'; // Authors go to Submission
                    }
                }, 4000);

            } else {
                throw new Error(result.error || 'Registration failed');
            }

        } catch (error) {
            console.error('❌ Registration Error:', error);
            alert('Registration Failed: ' + error.message);

            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        }
    });
}

/**
 * Validate registration form
 * @param {Object} formData - Form data to validate
 * @returns {boolean} True if valid
 */
function validateRegistrationForm(formData) {
    if (!formData.fullName || !formData.email || !formData.phone) {
        utils.showError('Please fill in all required fields');
        return false;
    }

    if (!utils.isValidEmail(formData.email)) {
        utils.showError('Please enter a valid email address');
        return false;
    }

    if (!utils.isValidPhone(formData.phone)) {
        utils.showError('Please enter a valid phone number');
        return false;
    }

    if (!formData.category) {
        utils.showError('Please select a registration category');
        return false;
    }

    if (formData.createAccount && !formData.password) {
        utils.showError('Please enter a password to create an account');
        return false;
    }

    if (formData.createAccount && formData.password.length < 6) {
        utils.showError('Password must be at least 6 characters long');
        return false;
    }

    return true;
}

// =============================================
// 5. AUTO-INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📝 Registration module initialized');
    initRegistrationForm();
});

// =============================================
// 6. EXPORTS
// =============================================

window.registration = {
    submitRegistration,
    processPayment,
    savePaymentRecord,
    updateUserPaymentStatus,
    sendRegistrationConfirmationEmail,
    sendAdminRegistrationNotification,
    sendPaymentConfirmationEmail,
    initRegistrationForm,
    validateRegistrationForm,
    downloadTemplate,
    downloadManuscriptTemplate
};

console.log('📝 Registration library loaded');