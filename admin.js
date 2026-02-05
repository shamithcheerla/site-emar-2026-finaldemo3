/**
 * =============================================
 * SITE-EMAR 2026 Conference Management System
 * Admin Panel Module
 * =============================================
 */

// =============================================
// 1. ADMIN VERIFICATION
// =============================================

/**
 * Check and verify admin access
 * @returns {Promise<boolean>} True if admin
 */
async function verifyAdminAccess() {
    const admin = await auth.isAdmin();

    if (!admin) {
        utils.showError('Unauthorized access. Redirecting...');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
        return false;
    }

    console.log('✅ Admin verified:', admin.full_name);
    return true;
}

// =============================================
// 2. PAPER MANAGEMENT
// =============================================

/**
 * Get all submitted papers
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Array>} Array of papers
 */
async function getAllPapers(status = null) {
    try {
        let query = supabaseClient
            .from('papers')
            .select(`
                *,
                users:user_id (
                    full_name,
                    email,
                    phone,
                    affiliation,
                    designation,
                    category
                )
            `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];

    } catch (error) {
        console.error('Error fetching papers:', error.message);
        return [];
    }
}

/**
 * Update paper status
 * @param {string} paperId - Paper ID
 * @param {string} newStatus - New status
 * @param {string} comments - Review comments
 * @returns {Promise<Object>} Result object
 */
async function updatePaperStatus(paperId, newStatus, comments = '') {
    try {
        const admin = await auth.isAdmin();
        if (!admin) {
            throw new Error('Unauthorized: Admin access required');
        }

        // Update paper status
        const { data, error } = await supabaseClient
            .from('papers')
            .update({
                status: newStatus,
                reviewed_by: admin.id,
                reviewer_name: admin.full_name,
                review_date: new Date().toISOString(),
                review_comments: comments
            })
            .eq('id', paperId)
            .select(`
                *,
                users:user_id (
                    title,
                    full_name,
                    email
                )
            `)
            .single();

        if (error) throw error;

        console.log('✅ Paper status updated:', newStatus);

        // Send notification email to user
        await sendStatusUpdateEmail(data);

        // Log activity
        await logAdminActivity('paper_status_update', {
            paper_id: paperId,
            new_status: newStatus,
            comments: comments
        });

        return { success: true, data: data };

    } catch (error) {
        console.error('❌ Error updating paper status:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Delete paper (admin only)
 * @param {string} paperId - Paper ID
 * @returns {Promise<Object>} Result object
 */
async function adminDeletePaper(paperId) {
    try {
        const admin = await auth.isAdmin();
        if (!admin) {
            throw new Error('Unauthorized: Admin access required');
        }

        // Get paper details
        const { data: paper, error: fetchError } = await supabaseClient
            .from('papers')
            .select('*')
            .eq('id', paperId)
            .single();

        if (fetchError) throw fetchError;

        // Delete file from storage
        await supabaseClient.storage
            .from('papers')
            .remove([paper.file_url]);

        // Delete database record
        const { error: deleteError } = await supabaseClient
            .from('papers')
            .delete()
            .eq('id', paperId);

        if (deleteError) throw deleteError;

        console.log('✅ Paper deleted by admin');
        return { success: true };

    } catch (error) {
        console.error('❌ Error deleting paper:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Delete ALL papers (admin only) - Permanent Action
 * @returns {Promise<Object>} Result object
 */
async function deleteAllPapers() {
    try {
        const admin = await window.auth.isAdmin();
        if (!admin) {
            throw new Error('Unauthorized: Admin access required');
        }

        // 1. Get all papers to find file paths
        const { data: papers, error: fetchError } = await window.supabaseClient
            .from('papers')
            .select('file_url');

        if (fetchError) throw fetchError;

        if (papers.length > 0) {
            // 2. Delete files from storage
            const fileUrls = papers.map(p => p.file_url).filter(url => url);
            if (fileUrls.length > 0) {
                await window.supabaseClient.storage
                    .from('papers')
                    .remove(fileUrls);
            }
        }

        // 3. Delete all records from database
        const { error: deleteError } = await window.supabaseClient
            .from('papers')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError) throw deleteError;

        console.log('✅ All papers deleted by admin');

        // Log this major action
        await logAdminActivity('delete_all_papers', { count: papers.length });

        return { success: true, count: papers.length };

    } catch (error) {
        console.error('❌ Error deleting all papers:', error.message);
        return { success: false, error: error.message };
    }
}

// =============================================
// 3. USER MANAGEMENT
// =============================================

/**
 * Get all registered users
 * @returns {Promise<Array>} Array of users
 */
async function getAllUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];

    } catch (error) {
        console.error('Error fetching users:', error.message);
        return [];
    }
}

/**
 * Update user payment status
 * @param {string} userId - User ID
 * @param {boolean} completed - Payment completed status
 * @returns {Promise<Object>} Result object
 */
async function adminUpdatePaymentStatus(userId, completed) {
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ payment_completed: completed })
            .eq('id', userId);

        if (error) throw error;

        console.log('✅ Payment status updated by admin');
        return { success: true };

    } catch (error) {
        console.error('❌ Error updating payment status:', error.message);
        return { success: false, error: error.message };
    }
}

// =============================================
// 4. STATISTICS & DASHBOARD
// =============================================

/**
 * Get conference statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getStatistics() {
    try {
        // Use the database function
        const { data, error } = await supabaseClient
            .rpc('get_conference_statistics');

        if (error) throw error;

        return data || {};

    } catch (error) {
        console.error('Error fetching statistics:', error.message);
        // Fallback to manual calculation
        return await calculateStatisticsManually();
    }
}

/**
 * Calculate statistics manually (fallback)
 * @returns {Promise<Object>} Statistics object
 */
async function calculateStatisticsManually() {
    try {
        const users = await getAllUsers();
        const papers = await getAllPapers();

        const stats = {
            total_registrations: users.length,
            total_papers: papers.length,
            total_revenue: users
                .filter(u => u.payment_completed)
                .reduce((sum, u) => sum + parseFloat(u.registration_fee), 0),
            pending_reviews: papers.filter(p => p.status === 'pending').length,
            accepted_papers: papers.filter(p => p.status === 'accepted').length,
            rejected_papers: papers.filter(p => p.status === 'rejected').length,
            registrations_by_category: {}
        };

        // Count by category
        users.forEach(user => {
            if (!stats.registrations_by_category[user.category]) {
                stats.registrations_by_category[user.category] = 0;
            }
            stats.registrations_by_category[user.category]++;
        });

        return stats;

    } catch (error) {
        console.error('Error calculating statistics:', error);
        return {};
    }
}

// =============================================
// 5. EMAIL NOTIFICATIONS
// =============================================

/**
 * Send status update email to user
 * @param {Object} paperData - Paper data with user info
 */
async function sendStatusUpdateEmail(paperData) {
    try {
        if (!paperData.users || !paperData.users.email) {
            console.warn('No user email found for paper');
            return;
        }

        const user = paperData.users;
        const statusMessages = {
            'accepted': 'Congratulations! Your paper has been ACCEPTED for presentation at SITE-EMAR 2026.',
            'rejected': 'We regret to inform you that your paper has been rejected.',
            'under_review': 'Your paper is currently under review.',
            'revision_required': 'Your paper requires revisions. Please review the comments and resubmit.'
        };

        const statusMessage = statusMessages[paperData.status] || 'Your paper status has been updated.';

        const emailBody = `Dear ${user.title} ${user.full_name},

${statusMessage}

Paper Details:
- Title: ${paperData.paper_title}
- Submission ID: ${paperData.id}
- New Status: ${utils.capitalize(paperData.status.replace(/_/g, ' '))}
- Review Date: ${utils.formatDateTime(paperData.review_date)}

${paperData.review_comments ? `\nReviewer Comments:\n${paperData.review_comments}\n` : ''}

You can view your submission details by logging into your account at:
${window.location.origin}/papersubmission.html

For any queries, please contact us at: ${ADMIN_EMAIL}

Best regards,
SITE-EMAR 2026 Organizing Committee`;

        await sendUserNotification(user.email, {
            recipientName: user.full_name,
            type: 'paper_status_update',
            subject: `Paper Status Update - SITE-EMAR 2026`,
            body: emailBody
        });

    } catch (error) {
        console.error('Error sending status update email:', error);
    }
}

// =============================================
// 6. ACTIVITY LOGGING
// =============================================

/**
 * Log admin activity
 * @param {string} actionType - Type of action
 * @param {Object} actionData - Action data
 */
async function logAdminActivity(actionType, actionData) {
    try {
        const admin = await auth.isAdmin();
        if (!admin) return;

        await supabaseClient
            .from('activity_logs')
            .insert([{
                admin_id: admin.id,
                actor_email: admin.email,
                actor_role: admin.role,
                action_type: actionType,
                action_description: JSON.stringify(actionData),
                target_table: 'papers',
                target_id: actionData.paper_id || null,
                new_data: actionData
            }]);

    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// =============================================
// 7. UI FUNCTIONS
// =============================================

/**
 * Display dashboard statistics
 */
async function displayStatistics() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    utils.showLoading(statsContainer);

    try {
        const stats = await getStatistics();

        const html = `
            <div class="row">
                <div class="col-md-3">
                    <div class="card bg-primary text-white mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Total Registrations</h5>
                            <h2>${stats.total_registrations || 0}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Total Papers</h5>
                            <h2>${stats.total_papers || 0}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Pending Reviews</h5>
                            <h2>${stats.pending_reviews || 0}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Total Revenue</h5>
                            <h2>${utils.formatCurrency(stats.total_revenue || 0, 'INR')}</h2>
                        </div>
                    </div>
                </div>
            </div>
        `;

        statsContainer.innerHTML = html;

    } catch (error) {
        utils.showError('Error loading statistics');
        statsContainer.innerHTML = `<div class="alert alert-danger">Error loading statistics</div>`;
    }
}

/**
 * Display all papers in a table
 * @param {string} filterStatus - Status filter (optional)
 */
async function displayAllPapers(filterStatus = null) {
    const papersContainer = document.getElementById('allPapersContainer');
    if (!papersContainer) return;

    utils.showLoading(papersContainer);

    try {
        const papers = await getAllPapers(filterStatus);

        if (papers.length === 0) {
            papersContainer.innerHTML = `
                <div class="alert alert-info">
                    No papers found${filterStatus ? ` with status: ${filterStatus}` : ''}.
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Submission ID</th>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        papers.forEach(paper => {
            html += `
                <tr>
                    <td><code>${paper.id.substring(0, 8)}</code></td>
                    <td>
                        <strong>${paper.paper_title || 'Untitled'}</strong>
                        <br><small class="text-muted">${paper.file_name}</small>
                    </td>
                    <td>
                        ${paper.user_name}<br>
                        <small class="text-muted">${paper.user_email}</small>
                    </td>
                    <td>${utils.formatDate(paper.created_at)}</td>
                    <td>${utils.getStatusBadge(paper.status)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminViewPaper('${paper.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="showReviewModal('${paper.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminHandleDeletePaper('${paper.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        papersContainer.innerHTML = html;

    } catch (error) {
        utils.showError('Error loading papers');
        papersContainer.innerHTML = `<div class="alert alert-danger">Error loading papers</div>`;
    }
}

/**
 * Show review modal for a paper
 * @param {string} paperId - Paper ID
 */
async function showReviewModal(paperId) {
    // This is a placeholder - implement based on your modal structure
    const newStatus = prompt('Enter new status (pending/under_review/accepted/rejected/revision_required):');

    if (!newStatus) return;

    const comments = prompt('Enter review comments (optional):');

    const result = await updatePaperStatus(paperId, newStatus, comments || '');

    if (result.success) {
        utils.showSuccess('Paper status updated successfully');
        await displayAllPapers(); // Refresh list
    } else {
        utils.showError(result.error || 'Failed to update status');
    }
}

/**
 * Admin view paper details
 * @param {string} paperId - Paper ID
 */
async function adminViewPaper(paperId) {
    // Implementation depends on your UI design
    utils.showInfo('Paper viewing functionality - to be implemented');
}

/**
 * Admin handle paper deletion
 * @param {string} paperId - Paper ID
 */
async function adminHandleDeletePaper(paperId) {
    if (!utils.confirmAction('Are you sure you want to delete this paper? This action cannot be undone.')) {
        return;
    }

    const result = await adminDeletePaper(paperId);

    if (result.success) {
        utils.showSuccess('Paper deleted successfully');
        await displayAllPapers(); // Refresh list
    } else {
        utils.showError(result.error || 'Failed to delete paper');
    }
}

/**
 * Display all users
 */
async function displayAllUsers() {
    const usersContainer = document.getElementById('allUsersContainer');
    if (!usersContainer) return;

    utils.showLoading(usersContainer);

    try {
        const users = await getAllUsers();

        if (users.length === 0) {
            usersContainer.innerHTML = `<div class="alert alert-info">No users registered yet.</div>`;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Category</th>
                            <th>Registration Fee</th>
                            <th>Payment Status</th>
                            <th>Registered</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        users.forEach(user => {
            html += `
                <tr>
                    <td>${user.title} ${user.full_name}</td>
                    <td>${user.email}<br><small class="text-muted">${user.phone}</small></td>
                    <td>${utils.capitalize(user.category)}</td>
                    <td>${utils.formatCurrency(user.registration_fee, user.currency)}</td>
                    <td>
                        ${user.payment_completed ?
                    '<span class="badge bg-success">Paid</span>' :
                    '<span class="badge bg-warning">Pending</span>'}
                    </td>
                    <td>${utils.formatDate(user.created_at)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        usersContainer.innerHTML = html;

    } catch (error) {
        utils.showError('Error loading users');
        usersContainer.innerHTML = `<div class="alert alert-danger">Error loading users</div>`;
    }
}

// =============================================
// 8. AUTO-INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('👑 Admin panel module initialized');

    // Verify admin access
    const isAuthenticated = await auth.requireAuth('/login.html');
    if (!isAuthenticated) return;

    const isAuthorized = await verifyAdminAccess();
    if (!isAuthorized) return;

    // Load dashboard data
    displayStatistics();
    displayAllPapers();
    displayAllUsers();
});

// =============================================
// 9. EXPORTS
// =============================================

window.adminPanel = {
    verifyAdminAccess,
    getAllPapers,
    updatePaperStatus,
    adminDeletePaper,
    getAllUsers,
    adminUpdatePaymentStatus,
    getStatistics,
    displayStatistics,
    displayAllPapers,
    displayAllUsers,
    showReviewModal,
    adminViewPaper,
    adminHandleDeletePaper,
    deleteAllPapers
};

// Make functions globally available for onclick handlers
window.adminViewPaper = adminViewPaper;
window.showReviewModal = showReviewModal;
window.adminHandleDeletePaper = adminHandleDeletePaper;

console.log('👑 Admin panel library loaded');